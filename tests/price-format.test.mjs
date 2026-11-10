import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../lib/catalog/price-format.ts", import.meta.url), "utf8");
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { formatPrice, parsePrice, formatEnteredPrice } = await import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);

test("prices preserve cents and all sixteen integer digits without floating point rounding", () => {
  for (const [stored, visible] of [["0.00", "0,00"], ["100000.00", "100.000,00"], ["1234.5", "1.234,50"], ["9999999999999999.99", "9.999.999.999.999.999,99"]]) {
    assert.equal(formatPrice(stored), visible);
    assert.equal(parsePrice(visible), stored.endsWith(".5") ? stored + "0" : stored);
  }
  assert.equal(formatPrice(""), "");
  assert.equal(parsePrice(""), "");
  assert.equal(parsePrice("1.000"), "1000");
  assert.equal(formatEnteredPrice("100000,5"), "100.000,50");
  assert.equal(formatEnteredPrice("0"), "0,00");
});

test("malformed grouping, negative prices, excess precision and exponent notation are never silently converted", () => {
  for (const input of ["1.23", "100000.00", "1,000.00", "10.00,00", "1.000,001", "-100,00", "1e3", "10000000000000000", "10 000,00", "abc"]) {
    assert.equal(parsePrice(input), null, input);
    assert.equal(formatEnteredPrice(input), input);
  }
});
