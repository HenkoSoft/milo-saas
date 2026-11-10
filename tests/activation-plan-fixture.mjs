// Synthetic data for tests only. Never an activation default or a database seed.
import { randomUUID } from "node:crypto";
import { readActivationPlan } from "../scripts/activation/plan.ts";

export const activationEnvironment = Object.freeze({
  MILO_ACTIVATION_ID: randomUUID(),
  MILO_ACTIVATION_TENANT_ID: randomUUID(),
  MILO_ACTIVATION_PROFILE_ID: randomUUID(),
  MILO_ACTIVATION_ASSIGNMENT_ID: randomUUID(),
  MILO_ACTIVATION_OWNER_ROLE_ID: randomUUID(),
  MILO_ACTIVATION_COMPANY_NAME: "Memory company",
  MILO_ACTIVATION_OWNER_NAME: "Memory owner",
  MILO_ACTIVATION_OWNER_EMAIL: "owner@example.invalid",
});
export const plan = readActivationPlan(activationEnvironment);
