-- Prepared for isolated tests only. Applying to milo_dev needs separate authorization.
BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '60s';
-- CreateTable
CREATE TABLE "supplier_counters" (
    "tenantId" UUID NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "supplier_counters_pkey" PRIMARY KEY ("tenantId")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "commercialNumber" INTEGER NOT NULL,
    "legalName" VARCHAR(200),
    "commercialName" VARCHAR(200),
    "cuit" VARCHAR(11),
    "vatCondition" VARCHAR(2),
    "contactName" VARCHAR(200),
    "phone" VARCHAR(50),
    "whatsapp" VARCHAR(50),
    "email" VARCHAR(254),
    "address" VARCHAR(400),
    "postalCode" VARCHAR(20),
    "city" VARCHAR(100),
    "province" VARCHAR(100),
    "country" VARCHAR(100),
    "internalNotes" VARCHAR(2000),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "suppliers_tenantId_legalName_idx" ON "suppliers"("tenantId", "legalName");

-- CreateIndex
CREATE INDEX "suppliers_tenantId_commercialName_idx" ON "suppliers"("tenantId", "commercialName");

-- CreateIndex
CREATE INDEX "suppliers_tenantId_cuit_idx" ON "suppliers"("tenantId", "cuit");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_tenantId_id_key" ON "suppliers"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_tenantId_commercialNumber_key" ON "suppliers"("tenantId", "commercialNumber");

-- AddForeignKey
ALTER TABLE "supplier_counters" ADD CONSTRAINT "supplier_counters_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE suppliers
 ADD CONSTRAINT suppliers_number_check CHECK ("commercialNumber">0),
 ADD CONSTRAINT suppliers_name_check CHECK (length(btrim(coalesce("legalName",'')))>0 OR length(btrim(coalesce("commercialName",'')))>0),
 ADD CONSTRAINT suppliers_vat_check CHECK ("vatCondition" IS NULL OR "vatCondition" IN ('1','4','5','6','7','8','9','10','13','15','16')),
 ADD CONSTRAINT suppliers_cuit_check CHECK (
 CASE WHEN cuit IS NULL THEN true
 WHEN cuit ~ '^[0-9]{11}$' THEN cuit ~ '[1-9]' AND
 ((11-((substring(cuit from 1 for 1)::int * 5 + substring(cuit from 2 for 1)::int * 4 + substring(cuit from 3 for 1)::int * 3 + substring(cuit from 4 for 1)::int * 2 + substring(cuit from 5 for 1)::int * 7 + substring(cuit from 6 for 1)::int * 6 + substring(cuit from 7 for 1)::int * 5 + substring(cuit from 8 for 1)::int * 4 + substring(cuit from 9 for 1)::int * 3 + substring(cuit from 10 for 1)::int * 2) % 11)) % 11)=substring(cuit from 11 for 1)::int
 ELSE false END);
ALTER TABLE supplier_counters ADD CONSTRAINT supplier_counters_number_check CHECK ("lastNumber">=0);
CREATE FUNCTION milo_supplier_code_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW."commercialNumber" IS DISTINCT FROM OLD."commercialNumber" OR NEW."tenantId" IS DISTINCT FROM OLD."tenantId" THEN
  RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='Supplier tenant and commercial number are immutable';
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER suppliers_immutable_commercial_number BEFORE UPDATE OF "commercialNumber", "tenantId" ON suppliers
FOR EACH ROW EXECUTE FUNCTION milo_supplier_code_immutable();
COMMIT;
