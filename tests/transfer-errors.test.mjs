import assert from "node:assert/strict";
import test from "node:test";
import {transferModules} from "./data-transfer-loader.mjs";
const secret="fixture-private-contact-and-SQL";
const error=new TypeError(`Cannot read properties of undefined (reading 'findMany'): ${secret}`);
const {http}=await transferModules({getPanelAccess:async()=>({status:"allowed",context:{tenant:{id:"fixture"},profileId:"fixture",assignments:[{code:"OWNER",scope:"COMPANY",branch:null}]}}),prisma:{$queryRaw:async()=>[{suppliers:true,counter:true,columns:19,constraints:7,indexes:2,immutable:true}],$transaction:async()=>{throw error;}},revalidatePath(){throw Error("Downloads must not invalidate data");}});
test("failed Excel reads report a download error and log only technical allowlisted diagnostics",async()=>{
 const logs=[],original=console.error;console.error=(...args)=>logs.push(args);
 try{
  const response=await http.download("proveedores",new Request("https://milo.invalid/panel/proveedores/archivo?mode=export&q="));assert.equal(response.status,500);assert.match(response.headers.get("Cache-Control"),/private.*no-store/);
  const body=await response.json();assert.match(body.error,/generar el archivo Excel/);assert.doesNotMatch(body.error,/confirmar la operación|fixture-private|SQL/);
  assert.equal(logs.length,1);assert.equal(logs[0].length,1);assert.equal(typeof logs[0][0],"string");assert.ok(!logs[0][0].includes(secret));
  const diagnostic=JSON.parse(logs[0][0].slice("MILO_TRANSFER_FAILURE ".length));assert.equal(diagnostic.operation,"download");assert.equal(diagnostic.stage,"read-records");assert.equal(diagnostic.type,"TypeError");assert.equal(diagnostic.missing,"findMany");
 }finally{console.error=original;}
});
