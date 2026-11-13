import "server-only";
import { getPanelAccess } from "@/lib/panel/access";
import { canManageCustomers } from "@/lib/panel/customer-permission";
import { customerStorage } from "./storage";
import * as basic from "./basic-service";
import * as expanded from "./expanded-service";
import type { CustomerList, CustomerResult, CustomerState, CustomerView } from "./types";
async function storage() {
 const access = await getPanelAccess();
 if (access.status !== "allowed" || !canManageCustomers(access.context)) return "forbidden";
 return customerStorage();
}
export async function newCustomerEditor(): Promise<CustomerResult<{ customer?: CustomerView; schemaReady?: boolean }>> {
 const mode = await storage();
 if (mode === "forbidden") return { status: "forbidden" };
 if (mode === "unavailable") return { status: "error" };
 return mode === "extended" ? expanded.newCustomerEditor() : basic.newCustomerEditor();
}
export async function getCustomer(id: unknown): Promise<CustomerResult<CustomerView>> {
 const mode = await storage();
 if (mode === "forbidden") return { status: "forbidden" };
 if (mode === "unavailable") return { status: "error" };
 return mode === "extended" ? expanded.getCustomer(id) : basic.getCustomer(id);
}
export async function listCustomers(query: unknown): Promise<CustomerResult<CustomerList>> {
 const mode = await storage();
 if (mode === "forbidden") return { status: "forbidden" };
 if (mode === "unavailable") return { status: "error" };
 return mode === "extended" ? expanded.listCustomers(query) : basic.listCustomers(query);
}
export async function saveCustomer(form: unknown, edit: boolean): Promise<CustomerState> {
 const mode = await storage();
 if (mode === "forbidden") return { status: "forbidden", message: "Acceso restringido." };
 if (mode === "unavailable") return { status: "error", message: "La estructura de Clientes requiere revisión." };
 if (mode === "extended") return expanded.saveCustomer(form, edit);
 if (form instanceof FormData && form.has("profileMode")) return { status: "invalid", message: "La ampliación requiere la migración aprobada." };
 return basic.saveCustomer(form, edit);
}
export async function deleteCustomer(form: unknown): Promise<CustomerState> {
 const mode = await storage();
 if (mode === "forbidden") return { status: "forbidden", message: "Acceso restringido." };
 if (mode !== "extended") return { status: "invalid", message: "Eliminar requiere la migración de Clientes, todavía pendiente." };
 return expanded.deleteCustomer(form);
}
