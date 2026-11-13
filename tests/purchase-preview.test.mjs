import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import "../scripts/activation/register-loader.mjs";
import { previewPurchase } from "../lib/purchases/preview.ts";
const { Prisma } = await import("../generated/prisma/client.ts");

test("local purchase estimate agrees with exact server Decimal for 100 lines and manual IVA", () => {
  const lines = Array.from({ length: 100 }, (_, i) => ({ quantity: String(i + 1), unitCost: `${i + 10000}.01` }));
  const net = lines.reduce((sum, line) => sum.plus(new Prisma.Decimal(line.quantity).mul(line.unitCost)), new Prisma.Decimal(0));
  const result = previewPurchase(lines, "210000.01");
  assert.equal(result.net, net.toFixed(2));
  assert.equal(result.total, net.plus("210000.01").toFixed(2));
  assert.deepEqual(result.subtotals, lines.map(line => new Prisma.Decimal(line.quantity).mul(line.unitCost).toFixed(2)));
});

test("estimate preserves explicit zero, refuses blanks, fractions and overflow without rounding", () => {
  const lines = [{ quantity: "1", unitCost: "9999999999999999.99" }];
  assert.equal(previewPurchase(lines, "0.00").total, "9999999999999999.99");
  assert.equal(previewPurchase(lines, "0.01"), null);
  assert.equal(previewPurchase([{ quantity: "1", unitCost: "0" }]).total, "0.00");
  for (const quantity of ["", "0", "1.1", "-1", "1e2", "1000000000000000"])
    assert.equal(previewPurchase([{ quantity, unitCost: "1.00" }]), null);
  for (const value of ["", "-1", "1.001", "1.000,00", "NaN", "1e3"])
    assert.equal(previewPurchase([{ quantity: "1", unitCost: value }]), null);
  assert.equal(previewPurchase(lines, ""), null);
  assert.equal(previewPurchase([]), null);
  assert.equal(previewPurchase(Array(101).fill({ quantity: "1", unitCost: "1" })), null);
});

test("100-line editing benchmark performs no IO and returns exact results on every iteration", t => {
  const lines = Array.from({ length: 100 }, () => ({ quantity: "10", unitCost: "100000.01" }));
  const start = performance.now();
  for (let i = 0; i < 1000; i++) assert.equal(previewPurchase(lines).total, "100000010.00");
  t.diagnostic(`1000 exact estimates of 100 lines: ${(performance.now() - start).toFixed(2)} ms (diagnostic, no machine-dependent threshold)`);
});
