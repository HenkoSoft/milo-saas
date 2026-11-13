// Explicit isolated database only. Never connects to or imports into milo_dev.
import "dotenv/config";
import "../activation/register-loader.mjs";
import pg from "pg";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { transferModules } from "../../tests/data-transfer-loader.mjs";
if(process.argv.slice(2).join(" ")!=="--run-isolated"){console.log("Use --run-isolated to create, test and remove an owned temporary PostgreSQL database.");process.exit(0);}
let admin,db,prisma,name,marker,created=false,phase="preflight";
try{
 const {PrismaClient}=await import("../../generated/prisma/client.ts");
 const source=new URL(process.env.DATABASE_URL);assert.ok(["postgres:","postgresql:"].includes(source.protocol));assert.ok(["localhost","127.0.0.1"].includes(source.hostname));assert.equal(source.port||"5432","5432");assert.equal(source.pathname,"/milo_dev");assert.ok([...source.searchParams].every(([k,v])=>k==="schema"&&v==="public"));source.hostname="127.0.0.1";
 const adminURL=new URL(source);adminURL.pathname="/postgres";admin=new pg.Client({connectionString:adminURL.toString(),connectionTimeoutMillis:5000});await admin.connect();assert.equal((await admin.query("SELECT current_database() AS name")).rows[0].name,"postgres");
 name=`milo_transfer_test_${randomBytes(6).toString("hex")}`;assert.match(name,/^milo_transfer_test_[a-f0-9]{12}$/);marker=`MILO isolated transfer test ${randomUUID()}`;phase="create-owned-database";
 await admin.query(`CREATE DATABASE "${name}" TEMPLATE template0`);created=true;await admin.query(`COMMENT ON DATABASE "${name}" IS '${marker}'`);
 const target=new URL(source);target.pathname="/"+name;db=new pg.Client({connectionString:target.toString()});await db.connect();assert.equal((await db.query("SELECT current_database() AS name")).rows[0].name,name);assert.equal((await db.query("SELECT count(*)::int AS n FROM pg_tables WHERE schemaname='public'")).rows[0].n,0);
 const migrations=new URL("../../prisma/migrations/",import.meta.url),names=["20261108225754_init","20261109023000_add_better_auth","20261109150000_add_tenant_storefront","20261109220000_add_inventory_manual_trace","20261111043000_expand_customer_commercial_profile","20261111235000_add_suppliers"];
 assert.deepEqual((await readdir(migrations,{withFileTypes:true})).filter(d=>d.isDirectory()).map(d=>d.name).sort(),names);phase="six-migrations-in-isolated-only";for(const migration of names)await db.query(await readFile(new URL(migration+"/migration.sql",migrations),"utf8"));
 prisma=new PrismaClient({adapter:new PrismaPg({connectionString:target.toString()})});
 const tenants=[],profiles=[],assignments=[];for(let i=0;i<2;i++){
  const tenant=await prisma.tenant.create({data:{commercialName:"Isolated transfer "+i}});tenants.push(tenant);
  const auth=await prisma.authUser.create({data:{id:randomUUID(),name:"Transfer fixture",email:`transfer-${i}@fixture.invalid`}});
  const profile=await prisma.userProfile.create({data:{tenantId:tenant.id,authUserId:auth.id}});profiles.push(profile);
  const role=await prisma.roleDefinition.create({data:{code:i?"ADMIN":"OWNER",name:"Fixture role",assignmentScope:"COMPANY"}});
  assignments.push(await prisma.userRoleAssignment.create({data:{tenantId:tenant.id,userProfileId:profile.id,roleId:role.id,assignmentScope:"COMPANY"}}));
  await prisma.customerCounter.create({data:{tenantId:tenant.id,lastNumber:11}});await prisma.supplierCounter.create({data:{tenantId:tenant.id,lastNumber:1}});
  await prisma.customer.create({data:{tenantId:tenant.id,commercialNumber:10,status:"HISTORICAL_APPROVED",contactData:{schemaVersion:1,name:"Legacy fixture "+i,email:`legacy-${i}@fixture.invalid`,phone:"00123",address:"Old address"}}});
  await prisma.customer.create({data:{tenantId:tenant.id,commercialNumber:11,status:"HISTORICAL_UNKNOWN",contactData:{unknown:"Protected fixture"}}});
  await prisma.supplier.create({data:{tenantId:tenant.id,commercialNumber:1,commercialName:"Supplier fixture "+i,internalNotes:"Private fixture notes "+i}});
 }
 const originalCustomers=await prisma.customer.findMany({orderBy:{id:"asc"}}),originalSuppliers=await prisma.supplier.findMany({orderBy:{id:"asc"}});
 const context=(i=0,code=i?"ADMIN":"OWNER")=>({authUserId:profiles[i].authUserId,profileId:profiles[i].id,tenant:{id:tenants[i].id,name:tenants[i].commercialName},assignments:[{code,scope:"COMPANY",branch:null}]});
 let access={status:"allowed",context:context()},invalidations=[];
 const {service,xlsx,http,columns}=await transferModules({prisma,getPanelAccess:async()=>access,revalidatePath:path=>invalidations.push(path)});
 const row=(kind,name)=>Object.fromEntries(columns.columns[kind].map(([key])=>[key,key==="legalName"?name:""]));
 const preview=(kind,rows)=>service.previewImport(kind,rows);
 const confirm=(kind,rows,plan,operation=randomUUID())=>service.confirmImport(kind,rows,{fingerprint:plan.fingerprint,operation,confirm:"IMPORT"});
 const count=kind=>kind==="clientes"?prisma.customer.count():prisma.supplier.count();
 const upload=(kind,mode,buffer,headers={})=>http.upload(kind,new Request(`https://milo.invalid/panel/${kind}/archivo?mode=${mode}`,{method:"POST",headers:{Origin:"https://milo.invalid","X-Milo-Filename":"fixture.xlsx",...headers},body:new Uint8Array(buffer)}));
 phase="roundtrip-preview-noop-and-preserved-legacy";
 for(const kind of ["clientes","proveedores"]){
  const exported=await service.exportData(kind,"",true);assert.equal(exported.rows.length,kind==="clientes"?2:1);
  const roundtrip=await xlsx.readWorkbook(kind,await xlsx.writeWorkbook(kind,exported.rows));const plan=await preview(kind,roundtrip);assert.equal(plan.created,0);assert.equal(plan.errors,0);assert.equal(plan.skipped,exported.rows.length);assert.equal((await confirm(kind,roundtrip,plan)).created,0);
  const hidden=await service.exportData(kind,"",false);assert.ok(hidden.rows.every(row=>row.internalNotes===""));
  const foreign=await service.exportData(kind,kind==="clientes"?"Legacy fixture 1":"Supplier fixture 1",true);assert.equal(foreign.rows.length,0);
 }
 phase="mixed-file-errors-atomicity-and-duplicate-plan";
 for(const kind of ["clientes","proveedores"]){
  const existing=(await service.exportData(kind,"",true)).rows[0],fresh={...row(kind,"Fresh "+kind),phone:"0012345",postalCode:"0123",vatCondition:"Responsable Monotributo",internalNotes:"Internal\nfixture"};
  const bad={...row(kind,"Bad fixture"),...(kind==="clientes"?{documentType:"CUIT",documentNumber:"20111111111"}:{cuit:"20111111111"})};
  const invalid=[fresh,{...fresh},existing,bad],before=await count(kind),invalidPlan=await preview(kind,invalid);assert.equal(invalidPlan.created,1);assert.equal(invalidPlan.skipped,2);assert.equal(invalidPlan.errors,1);assert.equal(await count(kind),before);await assert.rejects(confirm(kind,invalid,invalidPlan));assert.equal(await count(kind),before);
  const rows=invalid.slice(0,3),plan=await preview(kind,rows),operation=randomUUID();assert.equal(plan.errors,0);assert.equal((await confirm(kind,rows,plan,operation)).created,1);assert.equal(await count(kind),before+1);
  const replay=await confirm(kind,rows,plan,operation);assert.equal(replay.replay,true);assert.equal(await count(kind),before+1);await assert.rejects(confirm(kind,[row(kind,"Different payload")],plan,operation));
  assert.equal((await preview(kind,rows)).created,0);
  const actual=(await service.exportData(kind,"Fresh "+kind,true)).rows[0];assert.equal(actual.phone,"0012345");assert.equal(actual.postalCode,"0123");assert.equal(actual.vatCondition,"6");assert.equal(actual.internalNotes,"Internal\nfixture");assert.equal(actual.code,kind==="clientes"?"C000012":"P000002");
  if(kind==="clientes")assert.equal((await prisma.customer.findFirst({where:{tenantId:tenants[0].id,commercialNumber:12}})).status,"REGISTERED");
  const changed=[{...actual,phone:"Changed from Excel"}],changedPlan=await preview(kind,changed);assert.equal(changedPlan.errors,1);await assert.rejects(confirm(kind,changed,changedPlan));
  const staleRows=[actual,row(kind,"Stale preview "+kind)],stale=await preview(kind,staleRows);assert.equal(stale.created,1);
  if(kind==="clientes")await prisma.customer.updateMany({where:{tenantId:tenants[0].id,commercialNumber:12},data:{phone:"Concurrent fixture",updatedAt:new Date(Date.now()+1000)}});else await prisma.supplier.updateMany({where:{tenantId:tenants[0].id,commercialNumber:2},data:{phone:"Concurrent fixture",updatedAt:new Date(Date.now()+1000)}});
  await assert.rejects(confirm(kind,staleRows,stale));assert.equal(await count(kind),before+1);
 }
 phase="permissions-tenant-isolation-and-revocation";
 for(const kind of ["clientes","proveedores"]){
  for(const code of ["MANAGER","SALES","TECHNICIAN","WAREHOUSE","PLATFORM_ADMIN"]){access={status:"allowed",context:context(0,code)};await assert.rejects(service.exportData(kind,"",true));await assert.rejects(preview(kind,[row(kind,"Denied")]));}
  access={status:"allowed",context:context(1)};assert.equal((await service.exportData(kind,"Fresh",true)).rows.length,0);const response=await http.download(kind,new Request(`https://milo.invalid/panel/${kind}/archivo?mode=export&q=`));assert.equal(response.status,200);assert.match(response.headers.get("Cache-Control"),/no-store/);const fileRows=await xlsx.readWorkbook(kind,Buffer.from(await response.arrayBuffer()));assert.ok(fileRows.every(record=>record.code!=="C000012"&&record.code!=="P000002"));
 }
 access={status:"allowed",context:context()};await prisma.userRoleAssignment.delete({where:{id:assignments[0].id}});for(const kind of ["clientes","proveedores"]){await assert.rejects(service.exportData(kind,"",true));await assert.rejects(preview(kind,[row(kind,"Revoked")]));assert.equal((await http.download(kind,new Request(`https://milo.invalid/panel/${kind}/archivo?mode=export`))).status,403);}
 await prisma.userRoleAssignment.create({data:{tenantId:tenants[0].id,userProfileId:profiles[0].id,roleId:assignments[0].roleId,assignmentScope:"COMPANY"}});
 phase="audit-failure-rolls-back-entire-import-and-counter";
 for(const kind of ["clientes","proveedores"]){
  const rows=[row(kind,"Rollback 1 "+kind),row(kind,"Rollback 2 "+kind)],plan=await preview(kind,rows),before=await count(kind),model=kind==="clientes"?prisma.customerCounter:prisma.supplierCounter,counter=await model.findUnique({where:{tenantId:tenants[0].id}});
  await db.query("CREATE FUNCTION fixture_transfer_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture audit failure'; END; $$; CREATE TRIGGER fixture_transfer_fail BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION fixture_transfer_fail()");
  await assert.rejects(confirm(kind,rows,plan));assert.equal(await count(kind),before);assert.deepEqual(await model.findUnique({where:{tenantId:tenants[0].id}}),counter);await db.query('DROP TRIGGER fixture_transfer_fail ON audit_events; DROP FUNCTION fixture_transfer_fail()');
 }
 phase="concurrent-confirmation-and-http-flow";
 for(const kind of ["clientes","proveedores"]){
  const rows=[row(kind,"Concurrent import "+kind)],plan=await preview(kind,rows),before=await count(kind),outcomes=await Promise.allSettled([confirm(kind,rows,plan),confirm(kind,rows,plan)]);assert.ok(outcomes.some(result=>result.status==="fulfilled"));assert.equal(await count(kind),before+1);
  const httpRows=Array.from({length:30},(_,i)=>row(kind,"HTTP fixture "+kind+" "+i)),buffer=await xlsx.writeWorkbook(kind,httpRows),analyzed=await upload(kind,"preview",buffer);assert.equal(analyzed.status,200);const dto=await analyzed.json();assert.equal(dto.preview.created,30);
  const response=await upload(kind,"confirm",buffer,{"X-Milo-Fingerprint":dto.preview.fingerprint,"X-Milo-Operation":randomUUID(),"X-Milo-Confirm":"IMPORT"});assert.equal(response.status,200);assert.equal((await response.json()).created,30);assert.equal((await service.exportData(kind,"HTTP fixture",true)).rows.length,30);assert.ok(invalidations.includes(`/panel/${kind}`));
 }
 phase="fiscal-conflicts-and-repeated-tenant-operation";
 const prefix="2098765432",digit=(11-[5,4,3,2,7,6,5,4,3,2].reduce((s,w,i)=>s+w*Number(prefix[i]),0)%11)%11;
 for(const kind of ["clientes","proveedores"]){const document=kind==="clientes"?{documentType:"CUIT",documentNumber:prefix+digit}:{cuit:prefix+digit};const rows=[{...row(kind,"Fiscal one"),...document},{...row(kind,"Fiscal two"),...document}];const plan=await preview(kind,rows);assert.equal(plan.errors,1);await assert.rejects(confirm(kind,rows,plan));}
 assert.deepEqual(await prisma.customer.findMany({where:{id:{in:originalCustomers.map(row=>row.id)}},orderBy:{id:"asc"}}),originalCustomers);assert.deepEqual(await prisma.supplier.findMany({where:{id:{in:originalSuppliers.map(row=>row.id)}},orderBy:{id:"asc"}}),originalSuppliers);
 const operation=randomUUID(),first=[row("clientes","Tenant operation A")];await confirm("clientes",first,await preview("clientes",first),operation);access={status:"allowed",context:context(1)};const other=[row("clientes","Tenant operation B")],otherPlan=await preview("clientes",other),otherCount=await count("clientes");await assert.rejects(confirm("clientes",other,otherPlan,operation));assert.equal(await count("clientes"),otherCount);
 phase="export-limit-no-silent-truncation";access={status:"allowed",context:context()};await prisma.supplier.createMany({data:Array.from({length:5001},(_,i)=>({tenantId:tenants[0].id,commercialNumber:10000+i,commercialName:"Oversized export fixture"}))});await assert.rejects(service.exportData("proveedores","Oversized export fixture",true));assert.equal((await http.download("proveedores",new Request('https://milo.invalid/panel/proveedores/archivo?mode=export&q=Oversized%20export%20fixture'))).status,400);
 phase="verify-owned-database-and-cleanup";await prisma.$disconnect();prisma=null;await db.end();db=null;const ownership=(await admin.query("SELECT shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=$1",[name])).rows[0];assert.equal(ownership.marker,marker);assert.equal((await admin.query("SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname=$1",[name])).rows[0].n,0);await admin.query(`DROP DATABASE "${name}"`);created=false;
 console.log("PASS: real XLSX roundtrip, authorized filtered exports across pages, preview without writes, atomic imports, fiscal/duplicate conflicts, protected legacy/state preservation, tenant isolation/revocation, rollback/counters/audits, concurrency, replay and HTTP flow. Owned isolated database removed; no milo_dev connection or writes.");
}catch(error){console.error(error?.stack?.split("\n").filter(line=>line.includes("scripts/data-transfer/test-postgres.mjs")).join("\n"));console.error(`TRANSFER_ISOLATED_FAILURE phase=${phase} code=${typeof error?.code==="string"&&/^[A-Z0-9_]+$/.test(error.code)?error.code:"ASSERTION_OR_PROVIDER_FAILURE"}. Sensitive diagnostics suppressed; no automatic repair.`);if(created)console.error("Owned test database retained: "+name);process.exitCode=1;}
finally{if(prisma)await prisma.$disconnect();if(db)await db.end();if(admin)await admin.end();}
