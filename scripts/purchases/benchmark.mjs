// Own, temporary PostgreSQL database only. Never connect to milo_dev.
import "dotenv/config";
import "../activation/register-loader.mjs";
import pg from "pg";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { purchaseModules } from "../../tests/purchases-loader.mjs";
if (process.argv.slice(2).join(" ") !== "--run-isolated") { console.log("Use --run-isolated to test only an owned temporary database."); process.exit(0); }
const benchmarkLabel=process.env.MILO_BENCH_LABEL ?? "after"; assert.ok(["before","after"].includes(benchmarkLabel));
let admin, db, prisma, name, marker, created = false, phase = "preflight";
try {
  const { PrismaClient, Prisma } = await import("../../generated/prisma/client.ts");
  const source = new URL(process.env.DATABASE_URL);
  assert.ok(["postgres:", "postgresql:"].includes(source.protocol)); assert.ok(["127.0.0.1", "localhost"].includes(source.hostname)); assert.equal(source.port || "5432", "5432"); assert.equal(source.pathname, "/milo_dev");
  assert.ok([...source.searchParams].every(([k,v]) => k === "schema" && v === "public"));
  source.hostname = "127.0.0.1"; const adminURL = new URL(source); adminURL.pathname = "/postgres";
  admin = new pg.Client({ connectionString: adminURL.toString(), connectionTimeoutMillis: 5000 }); await admin.connect(); assert.equal((await admin.query("SELECT current_database() AS name")).rows[0].name, "postgres");
  name = `milo_purchase_test_${randomBytes(6).toString("hex")}`; marker = `MILO isolated purchase test ${randomUUID()}`; assert.match(name, /^milo_purchase_test_[a-f0-9]{12}$/);
  phase = "create-owned-database"; await admin.query(`CREATE DATABASE "${name}" TEMPLATE template0`); created = true; await admin.query(`COMMENT ON DATABASE "${name}" IS '${marker}'`);
  const isolated = new URL(source); isolated.pathname = "/" + name;
  db = new pg.Client({ connectionString: isolated.toString() }); await db.connect(); assert.equal((await db.query("SELECT current_database() AS name")).rows[0].name, name);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM pg_tables WHERE schemaname='public'")).rows[0].n, 0);
  const migrations = new URL("../../prisma/migrations/", import.meta.url);
  const previous = ["20261108225754_init", "20261109023000_add_better_auth", "20261109150000_add_tenant_storefront", "20261109220000_add_inventory_manual_trace", "20261111043000_expand_customer_commercial_profile", "20261111235000_add_suppliers"];
  assert.deepEqual((await readdir(migrations, { withFileTypes: true })).filter(d => d.isDirectory()).map(d => d.name).sort(), [...previous, "20261112010000_add_purchases", "20261112060000_purchase_document_details"]);
  phase = "six-existing-migrations-in-isolation"; for (const migration of previous) await db.query(await readFile(new URL(migration + "/migration.sql", migrations), "utf8"));
  let queries=0; prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: isolated.toString() }),log:[{emit:"event",level:"query"}] }); prisma.$on("query",()=>queries++);
  const tenants = [], profiles = [], branches = [], suppliers = [], products = [], assignments = [];
  const role = await prisma.roleDefinition.create({ data: { code: "OWNER", name: "Fixture owner", assignmentScope: "COMPANY" } });
  await prisma.unitOfMeasure.create({ data: { code: "UNIT", name: "Fixture unit", dimensionCode: "COUNT" } });
  for (let i = 0; i < 2; i++) {
    const tenant = await prisma.tenant.create({ data: { commercialName: "Isolated purchase " + i, currency: "ARS" } }); tenants.push(tenant);
    const auth = await prisma.authUser.create({ data: { id: randomUUID(), name: "Fixture user", email: `purchase-${i}@fixture.invalid` } });
    const profile = await prisma.userProfile.create({ data: { tenantId: tenant.id, authUserId: auth.id } }); profiles.push(profile);
    assignments.push(await prisma.userRoleAssignment.create({ data: { tenantId: tenant.id, userProfileId: profile.id, roleId: role.id, assignmentScope: "COMPANY" } }));
    branches.push(await prisma.branch.create({ data: { tenantId: tenant.id, name: "Fixture branch" } }));
    suppliers.push(await prisma.supplier.create({ data: { tenantId: tenant.id, commercialNumber: 1, commercialName: "Fixture supplier" } }));
    products.push(await prisma.product.create({ data: { tenantId: tenant.id, sku: "FIXTURE-" + i, name: "Fixture product", description: "Isolated fixture", isPublished: false, baseUnitCode: "UNIT", baseUnitDimensionCode: "COUNT", allowsFractionalQuantity: false } }));
  }
  const fingerprint = async table => (await db.query(`SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY id)::text,'[]')) AS hash FROM "${table}" t`)).rows[0].hash;
  const witnesses = {}; for (const table of ["products", "suppliers", "branches", "user_profiles"]) witnesses[table] = await fingerprint(table);
  const context = (i = 0, code = "OWNER") => ({ authUserId: profiles[i].authUserId, profileId: profiles[i].id, tenant: { id: tenants[i].id }, assignments: [{ code, scope: "COMPANY", branch: null }] });
  let access = { status: "allowed", context: context() };
  const { service } = await purchaseModules({ Prisma, prisma, getPanelAccess: async () => access });
  assert.equal((await service.loadPurchase(null)).status, "pending");
  phase = "new-migration-compatible-with-existing-fixtures"; await db.query(await readFile(new URL("20261112010000_add_purchases/migration.sql", migrations), "utf8"));
  for (const [table, hash] of Object.entries(witnesses)) assert.equal(await fingerprint(table), hash);

  await db.query(await readFile(new URL("20261112060000_purchase_document_details/migration.sql",migrations),"utf8"));
  const make=(n=1)=>({id:randomUUID(),revision:0,supplierId:suppliers[0].id,branchId:branches[0].id,date:"2026-11-13",reference:"Synthetic benchmark",notes:"",lines:Array.from({length:n},()=>({id:randomUUID(),productId:products[0].id,baseUnitCode:"UNIT",quantity:"10",unitCost:"100000.01"}))});
  for(let i=0;i<30;i++)assert.equal((await service.savePurchase(make())).status,"saved");
  const rows=(await db.query('SELECT id FROM purchases ORDER BY id')).rows;const target=rows[0].id;
  const metrics={};
  async function measure(label,fn){const times=[],counts=[],bytes=[];for(let i=0;i<9;i++){const before=queries,start=performance.now(),result=await fn();const elapsed=performance.now()-start;assert.ok(["ok","saved"].includes(result.status),label+" failed");if(i){times.push(elapsed);counts.push(queries-before);bytes.push(Buffer.byteLength(JSON.stringify(result)));}}times.sort((a,b)=>a-b);metrics[label]={medianMs:+times[4].toFixed(2),maxMs:+times.at(-1).toFixed(2),sqlQueries:counts[0],responseBytes:bytes[0],samples:8};}
  await measure('list',()=>service.listPurchases({}));
  await measure('openNew',()=>service.loadPurchase(null));
  await measure('supplierSearch',()=>service.lookupPurchases({kind:"suppliers",q:"Fixture"}));
  await measure('productSearch',()=>service.lookupPurchases({kind:"products",q:"FIXTURE"}));
  await measure('quantityCostServerQuote',()=>service.quotePurchase(make(100)));
  await measure('saveDraft100Lines',()=>service.savePurchase(make(100)));
  await measure('detail',()=>service.loadPurchase(target));
  const plans={};for(const [key,query,params] of [
   ['list','SELECT id,date,total FROM purchases WHERE "tenantId"=$1 ORDER BY date DESC,id ASC LIMIT 25',[tenants[0].id]],
   ['supplier','SELECT id FROM suppliers WHERE "tenantId"=$1 AND ("legalName" ILIKE $2 OR "commercialName" ILIKE $2 OR cuit LIKE $2) ORDER BY "commercialNumber" LIMIT 25',[tenants[0].id,'%Fixture%']],
   ['product','SELECT id FROM products WHERE "tenantId"=$1 AND (name ILIKE $2 OR sku ILIKE $2) ORDER BY name,id LIMIT 25',[tenants[0].id,'%FIXTURE%']]])plans[key]=(await db.query('EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) '+query,params)).rows;
  const report={environment:'Owned isolated PostgreSQL; real service and membership; session identity injected; excludes HTTP, auth session, Next compilation and RSC rendering',fixtures:{tenants:2,initialPurchases:30,linesPerSave:100},metrics,plans};
  const label=benchmarkLabel;assert.ok(['before','after'].includes(label));await mkdir(".local/purchase-performance",{recursive:true});await writeFile('.local/purchase-performance/'+label+'.json',JSON.stringify(report,null,2));console.log(JSON.stringify({label,metrics},null,2));
} catch(error){console.error('Benchmark stopped',phase,error.message?.slice(0,300));process.exitCode=1;}
finally {await prisma?.$disconnect();await db?.end();if(created&&admin){assert.match(name,/^milo_purchase_test_[a-f0-9]{12}$/);const own=await admin.query("SELECT shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=$1",[name]);assert.equal(own.rows[0]?.marker,marker);assert.equal((await admin.query("SELECT count(*)::int n FROM pg_stat_activity WHERE datname=$1",[name])).rows[0].n,0);await admin.query('DROP DATABASE "'+name+'"');console.log('Removed verified owned isolated database.');}await admin?.end();}
