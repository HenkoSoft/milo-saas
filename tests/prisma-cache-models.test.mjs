import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
const source=(await readFile(new URL("../lib/prisma.ts",import.meta.url),"utf8")).replace('import "server-only";',"").replace('import { PrismaPg } from "@prisma/adapter-pg";','const {PrismaPg}=globalThis[Symbol.for("milo.prisma-cache-test")];').replace('import { PrismaClient } from "../generated/prisma/client";','const {PrismaClient}=globalThis[Symbol.for("milo.prisma-cache-test")];');
const delegates=()=>Object.fromEntries(["customer","customerCounter","supplier","supplierCounter","purchase","purchaseCounter","purchaseLine"].map(key=>[key,{findMany(){throw Error("Cache checks must not query records");}}]));
test("development cache replaces missing model metadata even with the same constructor; complete clients are reused without disconnects",async()=>{
 const previous={env:process.env.NODE_ENV,url:process.env.DATABASE_URL,prisma:globalThis.prisma,constructor:globalThis.prismaConstructor};let created=0,disconnected=0;
 class Client{constructor(){created++;Object.assign(this,delegates());}$disconnect(){disconnected++;}}
 globalThis[Symbol.for("milo.prisma-cache-test")]={PrismaPg:class{},PrismaClient:Client};process.env.NODE_ENV="development";process.env.DATABASE_URL="postgresql://fixture.invalid/isolated";
 try{
  for(const [index,complete,sameConstructor] of [[0,false,true],[1,true,true],[2,true,false]]){
   created=0;const old={...delegates(),$disconnect(){disconnected++;}};if(!complete)delete old.supplier;
   globalThis.prisma=old;globalThis.prismaConstructor=sameConstructor?Client:class{};
   const output=ts.transpileModule(source+`\n// cache fixture ${index}`,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
   const loaded=await import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
   assert.equal(loaded.prisma===old,complete&&sameConstructor);assert.equal(created,complete&&sameConstructor?0:1);assert.equal(typeof loaded.prisma.supplier.findMany,"function");
  }
  assert.equal(disconnected,0);
 }finally{if(previous.env===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previous.env;if(previous.url===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=previous.url;if(previous.prisma===undefined)delete globalThis.prisma;else globalThis.prisma=previous.prisma;if(previous.constructor===undefined)delete globalThis.prismaConstructor;else globalThis.prismaConstructor=previous.constructor;delete globalThis[Symbol.for("milo.prisma-cache-test")];}
});
