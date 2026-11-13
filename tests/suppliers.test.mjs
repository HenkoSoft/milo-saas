import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { supplierModules } from "./suppliers-loader.mjs";
let calls=0, access={status:"unauthenticated"};
const loaded=await supplierModules({getPanelAccess:async()=>access,prisma:{$queryRaw:async()=>{calls++;return[{suppliers:false,counter:false}];}}});
const {schema,fields,service,storage}=loaded;
const input=()=>({...fields.emptySupplierFields(),commercialName:"Synthetic fixture"});
const form=values=>{const f=new FormData();for(const [key,value] of Object.entries(values))f.append(key,value);return f;};
test("supplier requires only a legal or commercial name; contact does not replace it",()=>{
  assert.equal(schema.supplierCreate.safeParse(input()).success,true);
  assert.equal(schema.supplierCreate.safeParse({...input(),commercialName:"",legalName:"Fixture legal"}).success,true);
  assert.equal(schema.supplierCreate.safeParse({...input(),commercialName:"",contactName:"Contact only"}).success,false);
});
test("supplier CUIT, email, IVA, limits, controls, empty/null boundary and external keys are validated",()=>{
  const number="2098765432",sum=[5,4,3,2,7,6,5,4,3,2].reduce((total,w,i)=>total+w*Number(number[i]),0),digit=(11-sum%11)%11;
  const cuit=number+digit;
  assert.equal(schema.supplierCreate.parse({...input(),cuit:`${cuit.slice(0,2)}-${cuit.slice(2,10)}-${digit}`}).cuit,cuit);
  assert.equal(schema.supplierCreate.parse({...input(),cuit:""}).cuit,"");
  for(const invalid of [{cuit:"20111111111"},{cuit:"x"},{email:"bad"},{vatCondition:"99"},{phone:"x".repeat(51)},{internalNotes:"\u0000"},{legalName:null},{tenantId:"forged"},{commercialNumber:99},{status:"ACTIVE"}])assert.equal(schema.supplierCreate.safeParse({...input(),...invalid}).success,false);
  const duplicate=form(input());duplicate.append("commercialName","again");assert.equal(schema.parseSupplierForm(schema.supplierCreate,duplicate),null);
  const file=form(input());file.set("email",new Blob(["fixture"]),"test.txt");assert.equal(schema.parseSupplierForm(schema.supplierCreate,file).success,false);
});
test("unauthorized roles cannot inspect storage, read or mutate Suppliers",async()=>{
  for(const role of [null,"MANAGER","SALES","TECHNICIAN","WAREHOUSE","PLATFORM_ADMIN"]){
    access=role?{status:"allowed",context:{assignments:[{code:role,scope:"COMPANY",branch:null}]}}:{status:"unauthenticated"};
    assert.equal((await service.listSuppliers({q:"",page:"1"})).status,"forbidden");
    assert.equal((await service.saveSupplier(form(input()),false)).status,"forbidden");
    assert.equal((await service.deleteSupplier(new FormData())).status,"forbidden");
  }
  access={status:"allowed",context:{assignments:[{code:"ADMIN",scope:"BRANCH",branch:{id:"fixture"}}]}};
  assert.equal((await service.newSupplierEditor()).status,"forbidden");assert.equal(calls,0);
});
test("missing migration is an explicit pending state; no empty listing, loading forms or writes are simulated",async()=>{
  access={status:"allowed",context:{assignments:[{code:"OWNER",scope:"COMPANY",branch:null}]}};
  assert.equal(await storage.supplierStorage(),"pending");assert.equal((await service.newSupplierEditor()).status,"pending");
  assert.equal((await service.saveSupplier(form(input()),false)).status,"error");
});
test("supplier actions revalidate only confirmed writes, ignore previous state, and loader validates IDs",async()=>{
  let saved="invalid",revalidations=[],writes=[];
  const bridge=loaded.url('export const saveSupplier=(form,edit)=>globalThis[Symbol.for("milo.suppliers-actions-test")].save(form,edit);export const deleteSupplier=form=>globalThis[Symbol.for("milo.suppliers-actions-test")].remove(form);export const newSupplierEditor=()=>({status:"ok",data:{}});export const getSupplier=id=>({status:"ok",data:{id}});');
  globalThis[Symbol.for("milo.suppliers-actions-test")]={save:async(form,edit)=>{writes.push({form,edit});return{status:saved};},remove:async()=>({status:saved}),revalidatePath:path=>revalidations.push(path)};
  let source=await readFile(new URL("../app/panel/proveedores/actions.ts",import.meta.url),"utf8");source=source.replace('from "@/lib/suppliers/service"',`from ${JSON.stringify(bridge)}`).replace('import { revalidatePath } from "next/cache";','const {revalidatePath}=globalThis[Symbol.for("milo.suppliers-actions-test")];');
  const actions=await import(loaded.url(source));await actions.createSupplier({tenantId:"poison"},new FormData());assert.equal(revalidations.length,0);
  saved="saved";await actions.updateSupplier({},new FormData());await actions.deleteSupplierRecord(new FormData());assert.deepEqual(revalidations,["/panel/proveedores","/panel/proveedores"]);assert.equal(writes[1].edit,true);
  source=(await readFile(new URL("../app/panel/proveedores/editor-actions.ts",import.meta.url),"utf8")).replace('from "@/lib/suppliers/service"',`from ${JSON.stringify(bridge)}`).replace('from "@/lib/suppliers/schema"',`from ${JSON.stringify(loaded.urls["./schema"])}`);
  const {loadSupplierEditor}=await import(loaded.url(source));assert.equal((await loadSupplierEditor("bad")).status,"invalid");assert.equal((await loadSupplierEditor(null)).status,"ok");
});
