import { z } from "zod";

export const migrationNames = [
  "20261108225754_init", "20261109023000_add_better_auth", "20261109150000_add_tenant_storefront", "20261109220000_add_inventory_manual_trace",
] as const;

export class ActivationError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.name = "ActivationError";
    this.code = code;
  }
}

export function ensure(condition: unknown, code: string): asserts condition {
  if (!condition) throw new ActivationError(code);
}

const label = z.string().trim().min(1).max(200).regex(/^[^\u0000-\u001f\u007f]+$/u);
const planSchema = z.strictObject({
  activationId: z.uuid(), tenantId: z.uuid(), profileId: z.uuid(),
  assignmentId: z.uuid(), roleIdIfMissing: z.uuid(),
  commercialName: label, ownerName: label, ownerEmail: z.email().max(254),
  currency: z.literal("ARS"), locale: z.literal("es-AR"),
  timeZone: z.literal("America/Argentina/Buenos_Aires"),
  priceVisibility: z.literal("AUTHENTICATED_CUSTOMERS"),
}).refine(p => new Set([p.activationId, p.tenantId, p.profileId, p.assignmentId, p.roleIdIfMissing]).size === 5);

export type ActivationPlan = Readonly<z.infer<typeof planSchema>>;

// No environment reads on import, personal defaults or generated replacement IDs.
// Keep the original locally reserved identifiers across attempts and reconciliation.
export function readActivationPlan(env: Record<string, string | undefined>): ActivationPlan {
  const parsed = planSchema.safeParse({
    activationId: env.MILO_ACTIVATION_ID,
    tenantId: env.MILO_ACTIVATION_TENANT_ID,
    profileId: env.MILO_ACTIVATION_PROFILE_ID,
    assignmentId: env.MILO_ACTIVATION_ASSIGNMENT_ID,
    roleIdIfMissing: env.MILO_ACTIVATION_OWNER_ROLE_ID,
    commercialName: env.MILO_ACTIVATION_COMPANY_NAME,
    ownerName: env.MILO_ACTIVATION_OWNER_NAME,
    ownerEmail: env.MILO_ACTIVATION_OWNER_EMAIL,
    currency: "ARS", locale: "es-AR", timeZone: "America/Argentina/Buenos_Aires",
    priceVisibility: "AUTHENTICATED_CUSTOMERS",
  });
  ensure(parsed.success, "ACTIVATION_CONFIGURATION_INVALID");
  return Object.freeze(parsed.data);
}
