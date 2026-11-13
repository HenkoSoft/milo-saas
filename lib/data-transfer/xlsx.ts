import "server-only";
import ExcelJS from "exceljs";
import { fromBuffer } from "yauzl";
import { columns, limits, moduleTitle, type TransferKind, type TransferRow } from "./columns";
import { vatConditions } from "../customers/commercial-fields";

export class TransferError extends Error {}
export async function verifyArchive(buffer: Buffer): Promise<void> {
  if (!buffer.length || buffer.length > limits.file) throw new TransferError("Elegí un XLSX de hasta 5 MiB.");
  await new Promise<void>((resolve, reject) => {
    fromBuffer(buffer, { lazyEntries: true, validateEntrySizes: true, strictFileNames: true }, (error, zip) => {
      if (error || !zip) { reject(new TransferError("El archivo no es un XLSX válido.")); return; }
      let count = 0, expanded = 0, declared = 0, failed = false;
      const names = new Set<string>();
      const stop = () => { if (!failed) { failed = true; zip.close(); reject(new TransferError("El XLSX tiene contenido no permitido o supera los límites de lectura.")); } };
      zip.on("error", stop);
      zip.on("end", () => {
        if (!names.has("[Content_Types].xml") || !names.has("xl/workbook.xml")) { stop(); return; }
        zip.close(); if (!failed) resolve();
      });
      zip.on("entry", entry => {
        if (failed) return;
        count++; declared += entry.uncompressedSize;
        if (count > limits.entries || declared > limits.expanded || names.has(entry.fileName) || (entry.generalPurposeBitFlag & 1) || ![0, 8].includes(entry.compressionMethod) || /(?:vbaProject|externalLinks|embeddings|\/media\/)/i.test(entry.fileName)) { stop(); return; }
        names.add(entry.fileName);
        zip.openReadStream(entry, (streamError, stream) => {
          if (streamError || !stream) { stop(); return; }
          const inspect = /\.(xml|rels)$/i.test(entry.fileName);
          const chunks: Buffer[] = [];
          stream.on("error", stop);
          stream.on("data", (chunk: Buffer) => { expanded += chunk.length; if (expanded > limits.expanded) { stream.destroy(); stop(); } else if (inspect) chunks.push(chunk); });
          stream.on("end", () => {
            if (failed) return;
            const text = inspect ? Buffer.concat(chunks).toString("utf8") : "";
            if (inspect && (/<!DOCTYPE|<!ENTITY/i.test(text) || /\.rels$/i.test(entry.fileName) && /TargetMode\s*=\s*["']External["']/i.test(text) || entry.fileName === "[Content_Types].xml" && /macroEnabled|vbaProject/i.test(text))) { stop(); return; }
            if (/^xl\/worksheets\/[^/]+\.xml$/.test(entry.fileName)) {
              if ((text.match(/<row\b/g)?.length ?? 0) > limits.importRows + 1 || (text.match(/<c\b/g)?.length ?? 0) > (limits.importRows + 1) * 18 || /<row\b[^>]*\br="(?:[6-9][0-9]{2}|[1-9][0-9]{3,})"/.test(text)) { stop(); return; }
              for (const match of text.matchAll(/<c\b[^>]*\br="([A-Z]+)([0-9]+)"/g)) {
                if (match[1].length > 1 || match[1] > "R" || Number(match[2]) > limits.importRows + 1) { stop(); return; }
              }
            }
            zip.readEntry();
          });
        });
      });
      zip.readEntry();
    });
  });
}
export async function readWorkbook(kind: TransferKind, buffer: Buffer): Promise<TransferRow[]> {
  await verifyArchive(buffer);
  const book = new ExcelJS.Workbook();
  try { await book.xlsx.load(buffer as unknown as Parameters<typeof book.xlsx.load>[0]); }
  catch { throw new TransferError("No pudimos leer el XLSX. Usá la plantilla de MILO."); }
  const sheet = book.worksheets[0], expected = columns[kind];
  if (book.worksheets.length !== 1 || !sheet || sheet.name !== moduleTitle(kind) || sheet.state !== "visible" || sheet.getRow(1).hidden || sheet.hasMerges || sheet.columnCount > expected.length || sheet.rowCount > limits.importRows + 1) throw new TransferError("Usá la hoja y las columnas de la plantilla. Máximo 500 filas, sin celdas combinadas ni encabezado oculto.");
  for (let i = 0; i < expected.length; i++) if (sheet.getColumn(i + 1).hidden || sheet.getRow(1).getCell(i + 1).value !== expected[i][1]) throw new TransferError("Los encabezados deben coincidir con la plantilla de este módulo, en el mismo orden y sin columnas ocultas.");
  const rows: TransferRow[] = [];
  for (let number = 2; number <= sheet.rowCount; number++) {
    const row: TransferRow = {}, source = sheet.getRow(number);
    if (source.hidden || source.hasValues && source.cellCount > expected.length) throw new TransferError(`Revisá la fila ${number}: contiene celdas ocultas o columnas adicionales.`);
    for (let i = 0; i < expected.length; i++) {
      const cell = source.getCell(i + 1), value = cell.value;
      if (sheet.getColumn(i + 1).hidden || value !== null && value !== undefined && typeof value !== "string") throw new TransferError(`Fila ${number}, ${expected[i][1]}: usá texto, sin fórmulas, números automáticos o enlaces.`);
      if (typeof value === "string" && value.length > 2000) throw new TransferError(`Fila ${number}: un campo supera el límite de texto.`);
      row[expected[i][0]] = typeof value === "string" ? value : "";
    }
    // Keep physical row numbers, including blank rows, for precise diagnostics.
    rows.push(row);
  }
  return rows;
}
export async function writeWorkbook(kind: TransferKind, rows: TransferRow[]): Promise<Buffer> {
  const book = new ExcelJS.Workbook(); book.creator = "MILO";
  const sheet = book.addWorksheet(moduleTitle(kind), { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = columns[kind].map(([key, header]) => ({ key, header, width: key === "internalNotes" ? 42 : 25, style: { numFmt: "@" } }));
  sheet.getRow(1).font = { bold: true, color: { argb: "FF1A2F50" } };
  for (const column of sheet.columns) if (column.key) sheet.getRow(1).getCell(column.key).note = "Completá como texto. Importación de altas: código vacío. No se actualizan fichas existentes desde Excel.";
  for (const values of rows) sheet.addRow(Object.fromEntries(columns[kind].map(([key]) => [key, key === "vatCondition" ? vatConditions.find(([code]) => code === values[key])?.[1] ?? values[key] ?? "" : values[key] ?? ""])));
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns[kind].length } };
  return Buffer.from(await book.xlsx.writeBuffer());
}
