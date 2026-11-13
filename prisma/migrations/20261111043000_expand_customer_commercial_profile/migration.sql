-- Prepared only; do not apply to milo_dev without separate authorization.
BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '60s';
-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "address" VARCHAR(400),
ADD COLUMN     "city" VARCHAR(100),
ADD COLUMN     "commercialDataVersion" INTEGER,
ADD COLUMN     "commercialNumber" INTEGER,
ADD COLUMN     "contactName" VARCHAR(200),
ADD COLUMN     "country" VARCHAR(100),
ADD COLUMN     "documentNumber" VARCHAR(11),
ADD COLUMN     "documentType" VARCHAR(4),
ADD COLUMN     "email" VARCHAR(254),
ADD COLUMN     "instagram" VARCHAR(100),
ADD COLUMN     "internalNotes" VARCHAR(2000),
ADD COLUMN     "legalName" VARCHAR(200),
ADD COLUMN     "mobilePhone" VARCHAR(50),
ADD COLUMN     "phone" VARCHAR(50),
ADD COLUMN     "postalCode" VARCHAR(20),
ADD COLUMN     "province" VARCHAR(100),
ADD COLUMN     "vatCondition" VARCHAR(2),
ADD COLUMN     "whatsapp" VARCHAR(50);

-- CreateTable
CREATE TABLE "customer_counters" (
    "tenantId" UUID NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "customer_counters_pkey" PRIMARY KEY ("tenantId")
);

-- CreateIndex
CREATE INDEX "customers_tenantId_legalName_idx" ON "customers"("tenantId", "legalName");

-- CreateIndex
CREATE INDEX "customers_tenantId_documentNumber_idx" ON "customers"("tenantId", "documentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "customers_tenantId_commercialNumber_key" ON "customers"("tenantId", "commercialNumber");

-- AddForeignKey
ALTER TABLE "customer_counters" ADD CONSTRAINT "customer_counters_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Deterministic per-tenant backfill changes only the new number, not historical
-- status/contactData/IDs/timestamps. Tested only in an isolated database.
WITH numbered AS (
 SELECT id, "tenantId", row_number() OVER (PARTITION BY "tenantId" ORDER BY "createdAt", id)::integer AS number FROM customers
)
UPDATE customers c SET "commercialNumber"=n.number FROM numbered n WHERE c.id=n.id AND c."tenantId"=n."tenantId";
INSERT INTO customer_counters ("tenantId", "lastNumber") SELECT "tenantId", max("commercialNumber") FROM customers GROUP BY "tenantId";
ALTER TABLE customers
 ADD CONSTRAINT customers_commercial_number_check CHECK ("commercialNumber" IS NOT NULL AND "commercialNumber">0),
 ADD CONSTRAINT customers_commercial_version_check CHECK ("commercialDataVersion" IS NULL OR "commercialDataVersion"=1),
 ADD CONSTRAINT customers_vat_check CHECK ("vatCondition" IS NULL OR "vatCondition" IN ('1','4','5','6','7','8','9','10','13','15','16')),
 ADD CONSTRAINT customers_document_check CHECK (
 CASE WHEN "documentType" IS NULL THEN "documentNumber" IS NULL
 WHEN "documentType"='DNI' THEN "documentNumber" IS NOT NULL AND "documentNumber" ~ '^[0-9]{1,8}$' AND "documentNumber" ~ '[1-9]'
 WHEN "documentType"='CUIT' AND "documentNumber" ~ '^[0-9]{11}$' THEN
   "documentNumber" ~ '[1-9]' AND ((11-((substring("documentNumber" from 1 for 1)::int * 5 + substring("documentNumber" from 2 for 1)::int * 4 + substring("documentNumber" from 3 for 1)::int * 3 + substring("documentNumber" from 4 for 1)::int * 2 + substring("documentNumber" from 5 for 1)::int * 7 + substring("documentNumber" from 6 for 1)::int * 6 + substring("documentNumber" from 7 for 1)::int * 5 + substring("documentNumber" from 8 for 1)::int * 4 + substring("documentNumber" from 9 for 1)::int * 3 + substring("documentNumber" from 10 for 1)::int * 2) % 11)) % 11)=substring("documentNumber" from 11 for 1)::int
 ELSE false END);
ALTER TABLE customer_counters ADD CONSTRAINT customer_counters_number_check CHECK ("lastNumber">=0);
CREATE FUNCTION milo_customer_code_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW."commercialNumber" IS DISTINCT FROM OLD."commercialNumber" OR NEW."tenantId" IS DISTINCT FROM OLD."tenantId" THEN
  RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='Customer tenant and commercial number are immutable';
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER customers_immutable_commercial_number BEFORE UPDATE OF "commercialNumber", "tenantId" ON customers
FOR EACH ROW EXECUTE FUNCTION milo_customer_code_immutable();
COMMIT;
