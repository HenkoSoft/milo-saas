import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import {createRequire} from "node:module";
import {transferModules} from "./data-transfer-loader.mjs";
const {xlsx,http,columns,service}=await transferModules({getPanelAccess:async()=>({status:"unauthenticated"}),prisma:{$queryRaw(){throw Error("Unauthorized metadata query");}},revalidatePath(){throw Error("Unexpected revalidation");}});
const raw=async book=>Buffer.from(await book.xlsx.writeBuffer());
const JSZip=createRequire(import.meta.resolve("exceljs"))("jszip");
test("real XLSX template and export share exact headers; identifiers preserve zeroes and formula-looking text stays literal",async()=>{
  for(const kind of ["clientes","proveedores"]){
    const template=await xlsx.writeWorkbook(kind,[]);assert.equal(template.subarray(0,2).toString(),"PK");assert.deepEqual(await xlsx.readWorkbook(kind,template),[]);
    const row=Object.fromEntries(columns.columns[kind].map(([key])=>[key,""]));Object.assign(row,{code:kind==="clientes"?"C000001":"P000001",legalName:"=SUM(1,1)",phone:"00123456",postalCode:"0123",vatCondition:"6",internalNotes:"Line 1\nLine 2"});
    row.internalNotes += "\nLiteral words: vbaProject macroEnabled";
    const buffer=await xlsx.writeWorkbook(kind,[row]);const rows=await xlsx.readWorkbook(kind,buffer);assert.equal(rows[0].phone,"00123456");assert.equal(rows[0].postalCode,"0123");assert.equal(rows[0].legalName,"=SUM(1,1)");assert.equal(rows[0].vatCondition,"Responsable Monotributo");assert.equal(rows[0].internalNotes,row.internalNotes);
    const book=new ExcelJS.Workbook();await book.xlsx.load(buffer);assert.equal(book.worksheets[0].getRow(2).getCell(2).type,ExcelJS.ValueType.String);
    await assert.rejects(xlsx.readWorkbook(kind==="clientes"?"proveedores":"clientes",buffer));
  }
});
test("XLSX rejects unknown/duplicate headers, numbers, formulas, external links, multiple/hidden/merged sheets and oversized archives",async()=>{
  await assert.rejects(xlsx.readWorkbook("clientes",Buffer.from("not zip")));await assert.rejects(xlsx.verifyArchive(Buffer.alloc(columns.limits.file+1)));
  for(const mutation of [
    sheet=>{sheet.getCell("A1").value="Wrong";},sheet=>{sheet.getCell("B1").value="Código";},sheet=>{sheet.getCell("B2").value={formula:"1+1",result:2};},sheet=>{sheet.getCell("G2").value=123;},sheet=>{sheet.getCell("B2").value={text:"link",hyperlink:"https://example.invalid/"};},sheet=>{sheet.state="hidden";},sheet=>{sheet.mergeCells("A2:B2");},sheet=>{sheet.getCell("B502").value="too many";},sheet=>{sheet.getColumn(2).hidden=true;},sheet=>{sheet.getRow(1).hidden=true;},
  ]){
    const book=new ExcelJS.Workbook();await book.xlsx.load(await xlsx.writeWorkbook("clientes",[]));mutation(book.worksheets[0]);await assert.rejects(xlsx.readWorkbook("clientes",await raw(book)));
  }
  const book=new ExcelJS.Workbook();await book.xlsx.load(await xlsx.writeWorkbook("clientes",[]));book.addWorksheet("Other");await assert.rejects(xlsx.readWorkbook("clientes",await raw(book)));
});
test("downloads/import/print data deny anonymous requests, reject cross-origin confirmation and use private no-store responses",async()=>{
  for(const kind of ["clientes","proveedores"]){
    for(const mode of ["template","export"]){const response=await http.download(kind,new Request(`https://milo.invalid/panel/${kind}/archivo?mode=${mode}&q=`));assert.equal(response.status,403);assert.match(response.headers.get("Cache-Control"),/private.*no-store/);}
    const response=await http.upload(kind,new Request(`https://milo.invalid/panel/${kind}/archivo?mode=confirm`,{method:"POST",headers:{Origin:"https://other.invalid"},body:"invalid"}));assert.equal(response.status,403);
    await assert.rejects(service.exportData(kind,"",true));await assert.rejects(service.previewImport(kind,[]));
  }
});
test("ZIP preflight rejects entry/expanded-size limits, forged declared sizes, XML entities and embedded code before workbook parsing",async()=>{
  const base=()=>new JSZip().file("[Content_Types].xml","<Types/>").file("xl/workbook.xml","<workbook/>");
  const many=base();for(let i=0;i<257;i++)many.file("entry-"+i,"");await assert.rejects(xlsx.verifyArchive(await many.generateAsync({type:"nodebuffer"})));
  for(const [name,text] of [["xl/workbook.xml",'<!DOCTYPE x [<!ENTITY y "fixture">]><workbook/>'],["xl/_rels/workbook.xml.rels",'<Relationship TargetMode="External" Target="https://fixture.invalid/"/>'],["xl/vbaProject.bin","fixture"]])await assert.rejects(xlsx.verifyArchive(await base().file(name,text).generateAsync({type:"nodebuffer"})));
  const large=await base().file("xl/sharedStrings.xml",Buffer.alloc(columns.limits.expanded+1,97)).generateAsync({type:"nodebuffer",compression:"DEFLATE"});assert.ok(large.length<columns.limits.file);await assert.rejects(xlsx.verifyArchive(large));
  const forged=Buffer.from(large);let offset=0,found=false;while((offset=forged.indexOf(Buffer.from([0x50,0x4b,0x01,0x02]),offset))>=0){const length=forged.readUInt16LE(offset+28),name=forged.subarray(offset+46,offset+46+length).toString();if(name==="xl/sharedStrings.xml"){forged.writeUInt32LE(1,offset+24);found=true;break;}offset+=46+length;}assert.equal(found,true);await assert.rejects(xlsx.verifyArchive(forged));
});
