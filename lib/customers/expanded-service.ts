import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getPanelAccess, type PanelContext } from "@/lib/panel/access";
import { canManageCustomers } from "@/lib/panel/customer-permission";
import { customerContact, customerId, customerQuery, parseCustomerForm } from "./schema";
import { commercialCreate, commercialEdit, customerDelete } from "./commercial-schema";
import { emptyCommercialFields, type CommercialFields } from "./commercial-fields";
import type { CustomerList, CustomerResult, CustomerState, CustomerView } from "./types";
class Denied extends Error {}
class Missing extends Error {}
class Conflict extends Error {}
class ProtectedHistory extends Error {}
const detailSelect = Object.fromEntries(Object.keys(emptyCommercialFields()).map(key => [key, true])) as Record<keyof CommercialFields, true>;
const select = { id: true, contactData: true, status: true, updatedAt: true, commercialNumber: true, commercialDataVersion: true, ...detailSelect } as const;
type Row = Omit<Prisma.CustomerGetPayload<{ select: typeof select }>, "internalNotes"> & { internalNotes?: string | null };
function view(row: Row): CustomerView {
 const legacy = customerContact.safeParse(row.contactData);
 const fields = emptyCommercialFields();
 for (const key of Object.keys(fields) as (keyof CommercialFields)[]) fields[key] = row[key] ?? "";
 if (row.commercialDataVersion === null && legacy.success) {
  fields.email ||= legacy.data.email; fields.phone ||= legacy.data.phone; fields.address ||= legacy.data.address;
 }
 return { id: row.id, version: row.updatedAt.toISOString(), schemaReady: true,
  commercialCode: row.commercialNumber ? "C" + String(row.commercialNumber).padStart(6,"0") : "",
  details: fields, name: fields.legalName || fields.contactName || (legacy.success ? legacy.data.name : ""),
  email: fields.email, phone: fields.phone, address: fields.address,
  editable: row.commercialDataVersion === null || row.commercialDataVersion === 1,
  contactState: legacy.success ? "current" : row.contactData === null ? "empty" : "legacy",
  statusLabel: row.status === "REGISTERED" ? "Registrado — sin autorización comercial" : "Estado previo (sin cambios)" };
}
async function membership(tx: Prisma.TransactionClient, context: PanelContext) {
  const profile = await tx.userProfile.findUnique({ where: { authUserId: context.authUserId }, select: { id: true, tenantId: true } });
  if (!profile || profile.id !== context.profileId || profile.tenantId !== context.tenant.id) throw new Denied();
  const role = await tx.userRoleAssignment.findFirst({
    where: { tenantId: profile.tenantId, userProfileId: profile.id, assignmentScope: "COMPANY", branchId: null, role: { code: { in: ["OWNER", "ADMIN"] }, assignmentScope: "COMPANY" } },
    select: { tenantId: true, userProfileId: true, assignmentScope: true, branchId: true, role: { select: { code: true, assignmentScope: true } } },
  });
  if (!role || role.tenantId !== profile.tenantId || role.userProfileId !== profile.id || role.assignmentScope !== "COMPANY" || role.branchId !== null || role.role.assignmentScope !== "COMPANY" || !["OWNER", "ADMIN"].includes(role.role.code)) throw new Denied();
  return profile.tenantId;
}
async function read<T>(run: (tx: Prisma.TransactionClient, tenantId: string) => Promise<T>): Promise<CustomerResult<T>> {
 const access = await getPanelAccess();
 if (access.status !== "allowed" || !canManageCustomers(access.context)) return { status: "forbidden" };
 try { return { status: "ok", data: await prisma.$transaction(async tx => run(tx, await membership(tx, access.context)), { isolationLevel: "RepeatableRead" }) }; }
 catch (e) { return { status: e instanceof Denied ? "forbidden" : e instanceof Missing ? "missing" : "error" }; }
}
export async function newCustomerEditor(): Promise<CustomerResult<{ customer?: CustomerView; schemaReady?: boolean }>> { return read(async () => ({ schemaReady: true })); }
export async function getCustomer(id: unknown): Promise<CustomerResult<CustomerView>> {
 const parsed = customerId.safeParse(id); if (!parsed.success) return { status: "missing" };
 return read(async (tx,tenantId) => { const row=await tx.customer.findFirst({where:{tenantId,id:parsed.data},select}); if(!row)throw new Missing(); return view(row); });
}
export async function listCustomers(query: unknown): Promise<CustomerResult<CustomerList>> {
 const parsed=customerQuery.safeParse(query);if(!parsed.success)return {status:"invalid"};
 return read(async (tx,tenantId)=>{
  const {q,page}=parsed.data;
  const where = customerWhere(tenantId, q);
  const total=await tx.customer.count({where}),pages=Math.max(1,Math.ceil(total/25)),current=Math.min(page,pages);
  const rows=await tx.customer.findMany({where,select:{...select,internalNotes:false},orderBy:[{createdAt:"desc"},{id:"asc"}],take:25,skip:(current-1)*25});
  return {items:rows.map(view),total,pages,page:current,q,schemaReady:true};
 });
}
async function audit(tx: Prisma.TransactionClient,tenantId:string,actorUserId:string,action:string,entityId:string){await tx.auditEvent.create({data:{tenantId,actorUserId,action,entityType:"Customer",entityId}});}
function failure(e:unknown):CustomerState {
 const code=e instanceof Error&&"code" in e?e.code:undefined;
 if(e instanceof Denied)return {status:"forbidden",message:"Tu acceso cambió. Volvé a ingresar."};
 if(e instanceof Conflict||code==="P2034"||code==="P2002")return {status:"conflict",message:"El cliente o su numeración cambió. Recargá antes de continuar; no se reintenta automáticamente."};
 if(e instanceof ProtectedHistory||code==="P2003")return {status:"invalid",message:"La operación está bloqueada: el cliente tiene historial, referencias protegidas o una ficha anterior que requiere revisión."};
 return {status:"error",message:"No se pudo completar la operación. Recargá y verificá el resultado antes de volver a intentarlo."};
}
export async function saveCustomer(form:unknown,edit:boolean):Promise<CustomerState>{
 const parsed=parseCustomerForm<typeof commercialCreate|typeof commercialEdit>(edit?commercialEdit:commercialCreate,form);
 if(!parsed?.success)return {status:"invalid",message:parsed?.error.issues[0]?.message??"Revisá los datos del cliente."};
 const data=parsed.data;const access=await getPanelAccess();if(access.status!=="allowed"||!canManageCustomers(access.context))return {status:"forbidden",message:"Acceso restringido."};
 try{
  const result=await prisma.$transaction(async tx=>{
   const tenantId=await membership(tx,access.context);
   const details=Object.fromEntries(Object.keys(emptyCommercialFields()).map(key=>[key,data[key as keyof typeof data]||null])) as { [K in keyof CommercialFields]: string|null };
   if("id" in data){
    const old=await tx.customer.findFirst({where:{tenantId,id:data.id},select});if(!old)throw new Missing();if(old.updatedAt.toISOString()!==data.version)throw new Conflict();
    if(!view(old).editable)throw new ProtectedHistory();
    if(!data.legalName&&!data.contactName&&!customerContact.safeParse(old.contactData).success)return {status:"invalid" as const,message:"Completá la razón social o el nombre de contacto."};
    if(old.commercialDataVersion===1&&Object.entries(details).every(([key,value])=>old[key as keyof typeof details]===value))return {status:"saved" as const,id:old.id,version:old.updatedAt.toISOString(),message:"No hay cambios para guardar."};
    const updatedAt=new Date(Math.max(Date.now(),old.updatedAt.getTime()+1));
    const changed=await tx.customer.updateMany({where:{tenantId,id:old.id,updatedAt:old.updatedAt},data:{...details,commercialDataVersion:1,updatedAt}});if(changed.count!==1)throw new Conflict();
    await audit(tx,tenantId,access.context.profileId,"CUSTOMER_UPDATED",old.id);
    return {status:"saved" as const,id:old.id,version:updatedAt.toISOString(),message:"Cliente guardado."};
   }
   const counter=await tx.customerCounter.upsert({where:{tenantId},create:{tenantId,lastNumber:1},update:{lastNumber:{increment:1}},select:{lastNumber:true}});
   const row=await tx.customer.create({data:{tenantId,status:"REGISTERED",commercialNumber:counter.lastNumber,commercialDataVersion:1,...details},select:{id:true,updatedAt:true}});
   await audit(tx,tenantId,access.context.profileId,"CUSTOMER_CREATED",row.id);
   return {status:"saved" as const,id:row.id,version:row.updatedAt.toISOString(),message:"Cliente guardado."};
  },{isolationLevel:"Serializable",maxWait:10000,timeout:20000});return result;
 }catch(e){return failure(e);}
}
export async function deleteCustomer(form:unknown):Promise<CustomerState>{
 const parsed=parseCustomerForm(customerDelete,form);if(!parsed?.success)return {status:"invalid",message:"Confirmá la eliminación y recargá si la ficha cambió."};
 const {id,version}=parsed.data;const access=await getPanelAccess();if(access.status!=="allowed"||!canManageCustomers(access.context))return {status:"forbidden",message:"Acceso restringido."};
 try{return await prisma.$transaction(async tx=>{
  const tenantId=await membership(tx,access.context);
  const locked=await tx.$queryRaw<{id:string}[]>`SELECT id FROM public.customers WHERE "tenantId"=${tenantId}::uuid AND id=${id}::uuid FOR UPDATE`;
  if(locked.length!==1)throw new Missing();await membership(tx,access.context);
  const old=await tx.customer.findFirst({where:{tenantId,id},select});if(!old)throw new Missing();if(old.updatedAt.toISOString()!==version)throw new Conflict();
  if(old.commercialDataVersion!==null&&old.commercialDataVersion!==1)throw new ProtectedHistory();
  if(old.contactData!==null&&!customerContact.safeParse(old.contactData).success)throw new ProtectedHistory();
  const refs=await tx.$queryRaw<{name:string;source:string;definition:string;validated:boolean;delete_rule:string}[]>`SELECT c.conname AS name,n.nspname||'.'||r.relname AS source,pg_get_constraintdef(c.oid) AS definition,c.convalidated AS validated,c.confdeltype::text AS delete_rule FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace WHERE c.contype='f' AND c.confrelid='public.customers'::regclass`;
  if(refs.length!==1||refs[0].name!=="wholesale_orders_tenantId_customerId_fkey"||refs[0].source!=="public.wholesale_orders"||!refs[0].validated||refs[0].delete_rule!=="r"||!refs[0].definition.includes('FOREIGN KEY ("tenantId", "customerId")'))throw new ProtectedHistory();
  const [orders,events]=await Promise.all([tx.wholesaleOrder.count({where:{tenantId,customerId:id}}),tx.auditEvent.count({where:{tenantId,entityType:"Customer",entityId:id,action:{notIn:["CUSTOMER_CREATED","CUSTOMER_UPDATED"]}}})]);
  if(orders||events)throw new ProtectedHistory();
  const deleted=await tx.customer.deleteMany({where:{tenantId,id,updatedAt:old.updatedAt}});if(deleted.count!==1)throw new Conflict();
  await audit(tx,tenantId,access.context.profileId,"CUSTOMER_DELETED",id);
  return {status:"saved",id,message:"Cliente eliminado. La auditoría se conserva."};
 },{isolationLevel:"Serializable",maxWait:10000,timeout:20000});}catch(e){return failure(e);}
}

export function customerWhere(tenantId: string, q: string): Prisma.CustomerWhereInput {
  const code=/^C0*([1-9][0-9]*)$/i.exec(q);const codeNumber=code ? Number(code[1]) : 0;
  const where: Prisma.CustomerWhereInput={tenantId,...(q ? {OR:[
   ...["legalName","contactName","email","phone","mobilePhone","whatsapp","documentNumber"].map(key=>({[key]:{contains:q,mode:"insensitive"}})),
   ...(Number.isSafeInteger(codeNumber)&&codeNumber>0&&codeNumber<=2147483647?[{commercialNumber:codeNumber}]:[]),
   {AND:[{commercialDataVersion:null},{contactData:{path:["schemaVersion"],equals:1}},{OR:["name","email","phone"].map(key=>({contactData:{path:[key],string_contains:q,mode:"insensitive"}}))}]}
  ]}: {})};
 return where;
}
export { membership as customerMembership, view as customerRecordView, select as customerRecordSelect, Denied as CustomerMembershipDenied };
