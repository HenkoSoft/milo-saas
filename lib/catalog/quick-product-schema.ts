import { z } from "zod";
import { productCreate, productEdit } from "./schema";
import { saleAmount } from "./presentation-schema";

const currency = z.string().max(3);
export const quickProductCreate = z.discriminatedUnion("mode", [
  productCreate.omit({ baseUnitCode: true, allowsFractionalQuantity: true }).extend({ mode: z.literal("individual"), amount: saleAmount, currency }),
  productCreate.extend({ mode: z.literal("advanced"), amount: z.literal(""), currency }),
]);
const token = z.union([z.iso.datetime({ precision: 3 }), z.literal("")]);
export const quickProductEdit = productEdit.extend({
  amount: z.union([saleAmount, z.literal("")]), currency,
  presentationId: z.union([z.uuid(), z.literal("")]), presentationVersion: token, priceVersion: token,
});
