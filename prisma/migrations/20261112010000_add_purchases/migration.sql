-- Purchases V1; apply only with separate deployment authorization.
BEGIN;
SET LOCAL lock_timeout='10s';
SET LOCAL statement_timeout='60s';
-- AlterTable
ALTER TABLE "stock_movements" ADD COLUMN     "purchaseLineId" UUID;

-- CreateTable
CREATE TABLE "purchase_counters" (
    "tenantId" UUID NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "purchase_counters_pkey" PRIMARY KEY ("tenantId")
);

-- CreateTable
CREATE TABLE "purchases" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "commercialNumber" INTEGER NOT NULL,
    "supplierId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "status" VARCHAR(8) NOT NULL DEFAULT 'DRAFT',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "date" DATE NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'ARS',
    "reference" VARCHAR(200),
    "notes" VARCHAR(2000),
    "total" DECIMAL(18,2) NOT NULL,
    "createHash" CHAR(64) NOT NULL,
    "receiveOperationId" UUID,
    "receiveHash" CHAR(64),
    "supplierSnapshot" VARCHAR(220),
    "createdById" UUID NOT NULL,
    "receivedById" UUID,
    "receivedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_lines" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "purchaseId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseUnitCode" TEXT NOT NULL,
    "quantity" DECIMAL(18,3) NOT NULL,
    "unitCost" DECIMAL(18,2) NOT NULL,
    "subtotal" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "purchase_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "purchases_tenantId_date_id_idx" ON "purchases"("tenantId", "date", "id");

-- CreateIndex
CREATE UNIQUE INDEX "purchases_tenantId_id_key" ON "purchases"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "purchases_tenantId_branchId_id_key" ON "purchases"("tenantId", "branchId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "purchases_tenantId_commercialNumber_key" ON "purchases"("tenantId", "commercialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "purchases_tenantId_receiveOperationId_key" ON "purchases"("tenantId", "receiveOperationId");

-- CreateIndex
CREATE INDEX "purchase_lines_tenantId_productId_idx" ON "purchase_lines"("tenantId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_lines_tenantId_branchId_productId_id_key" ON "purchase_lines"("tenantId", "branchId", "productId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_lines_tenantId_purchaseId_position_key" ON "purchase_lines"("tenantId", "purchaseId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "stock_movements_tenantId_purchaseLineId_key" ON "stock_movements"("tenantId", "purchaseLineId");

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_tenantId_branchId_productId_purchaseLineId_fkey" FOREIGN KEY ("tenantId", "branchId", "productId", "purchaseLineId") REFERENCES "purchase_lines"("tenantId", "branchId", "productId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "purchase_counters" ADD CONSTRAINT "purchase_counters_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_tenantId_supplierId_fkey" FOREIGN KEY ("tenantId", "supplierId") REFERENCES "suppliers"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_tenantId_branchId_fkey" FOREIGN KEY ("tenantId", "branchId") REFERENCES "branches"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_tenantId_createdById_fkey" FOREIGN KEY ("tenantId", "createdById") REFERENCES "user_profiles"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_tenantId_receivedById_fkey" FOREIGN KEY ("tenantId", "receivedById") REFERENCES "user_profiles"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "purchase_lines" ADD CONSTRAINT "purchase_lines_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "purchase_lines" ADD CONSTRAINT "purchase_lines_tenantId_branchId_purchaseId_fkey" FOREIGN KEY ("tenantId", "branchId", "purchaseId") REFERENCES "purchases"("tenantId", "branchId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "purchase_lines" ADD CONSTRAINT "purchase_lines_tenantId_branchId_fkey" FOREIGN KEY ("tenantId", "branchId") REFERENCES "branches"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "purchase_lines" ADD CONSTRAINT "purchase_lines_tenantId_productId_fkey" FOREIGN KEY ("tenantId", "productId") REFERENCES "products"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE purchase_counters ADD CONSTRAINT purchase_counters_number_check CHECK ("lastNumber">=0);
ALTER TABLE purchases ADD CONSTRAINT purchases_state_check CHECK (
  "commercialNumber">0 AND revision>0 AND currency='ARS'
  AND total>=0 AND total<='9999999999999999.99'::numeric AND total<>'NaN'::numeric
  AND "createHash" ~ '^[a-f0-9]{64}$'
  AND ((status='DRAFT' AND "receiveOperationId" IS NULL AND "receiveHash" IS NULL
       AND "receivedAt" IS NULL AND "receivedById" IS NULL AND "supplierSnapshot" IS NULL)
    OR (status='RECEIVED' AND "receiveOperationId" IS NOT NULL AND "receiveHash" ~ '^[a-f0-9]{64}$'
       AND "receivedAt" IS NOT NULL AND "receivedById" IS NOT NULL AND "supplierSnapshot" IS NOT NULL)));
ALTER TABLE purchase_lines ADD CONSTRAINT purchase_lines_amount_check CHECK (
  position BETWEEN 0 AND 99 AND quantity>0 AND quantity=trunc(quantity)
  AND quantity<='999999999999999'::numeric AND quantity<>'NaN'::numeric
  AND "unitCost">=0 AND "unitCost"<>'NaN'::numeric
  AND subtotal>=0 AND subtotal<>'NaN'::numeric AND subtotal=quantity*"unitCost");
ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_purchase_check CHECK (
  ("movementType"='PURCHASE_RECEIPT') = ("purchaseLineId" IS NOT NULL)
  AND ("purchaseLineId" IS NULL OR ("quantityDelta">0 AND "quantityDelta"<>'NaN'::numeric AND "sourceOrderId" IS NULL)));

CREATE FUNCTION guard_purchase_header() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Purchases cannot be deleted'; END IF;
  IF TG_OP='INSERT' THEN
    IF NEW.status<>'DRAFT' OR NEW.revision<>1 THEN RAISE EXCEPTION 'Create a draft first'; END IF;
  ELSIF OLD.status='RECEIVED' OR
    ROW(NEW.id,NEW."tenantId",NEW."commercialNumber",NEW."createdById",NEW."createdAt",NEW."createHash")
      IS DISTINCT FROM ROW(OLD.id,OLD."tenantId",OLD."commercialNumber",OLD."createdById",OLD."createdAt",OLD."createHash")
    OR NEW.revision<>OLD.revision+1 THEN
      RAISE EXCEPTION 'Immutable purchase or stale revision';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER purchases_guard BEFORE INSERT OR UPDATE OR DELETE ON purchases FOR EACH ROW EXECUTE FUNCTION guard_purchase_header();

CREATE FUNCTION guard_purchase_line() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent purchases; line purchase_lines; unit text;
BEGIN
  IF TG_OP='DELETE' THEN line:=OLD; ELSE line:=NEW; END IF;
  IF TG_OP='UPDATE' AND ROW(OLD.id,OLD."tenantId",OLD."purchaseId",OLD."branchId",OLD."productId")
    IS DISTINCT FROM ROW(NEW.id,NEW."tenantId",NEW."purchaseId",NEW."branchId",NEW."productId") THEN
    RAISE EXCEPTION 'Purchase line identity is immutable';
  END IF;
  SELECT * INTO parent FROM purchases WHERE "tenantId"=line."tenantId" AND id=line."purchaseId" FOR UPDATE;
  IF parent.id IS NULL OR parent.status<>'DRAFT' THEN RAISE EXCEPTION 'Purchase lines require a draft'; END IF;
  SELECT "baseUnitCode" INTO unit FROM products WHERE "tenantId"=line."tenantId" AND id=line."productId" FOR UPDATE;
  IF unit IS NULL OR unit<>line."baseUnitCode" THEN RAISE EXCEPTION 'Purchase unit mismatch'; END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER purchase_lines_guard BEFORE INSERT OR UPDATE OR DELETE ON purchase_lines FOR EACH ROW EXECUTE FUNCTION guard_purchase_line();

CREATE FUNCTION preserve_purchase_product_unit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF ROW(NEW."baseUnitCode",NEW."baseUnitDimensionCode") IS DISTINCT FROM ROW(OLD."baseUnitCode",OLD."baseUnitDimensionCode")
    AND EXISTS(SELECT 1 FROM purchase_lines WHERE "tenantId"=OLD."tenantId" AND "productId"=OLD.id) THEN
    RAISE EXCEPTION 'Cannot change the unit of a purchased product';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER products_preserve_purchase_unit BEFORE UPDATE OF "baseUnitCode","baseUnitDimensionCode" ON products FOR EACH ROW EXECUTE FUNCTION preserve_purchase_product_unit();

-- Deferred checks inspect final state, allowing document, ledger and balances to
-- be written together without ever committing a half-received purchase.
CREATE FUNCTION check_purchase_integrity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE pid uuid; tid uuid; p purchases; n integer; amount numeric;
BEGIN
  IF TG_TABLE_NAME='purchases' THEN pid:=NEW.id; tid:=NEW."tenantId";
  ELSIF TG_TABLE_NAME='purchase_lines' THEN
    IF TG_OP='DELETE' THEN pid:=OLD."purchaseId";tid:=OLD."tenantId"; ELSE pid:=NEW."purchaseId";tid:=NEW."tenantId"; END IF;
  ELSE
    IF NEW."purchaseLineId" IS NULL THEN RETURN NULL; END IF;
    SELECT "purchaseId","tenantId" INTO pid,tid FROM purchase_lines WHERE id=NEW."purchaseLineId" AND "tenantId"=NEW."tenantId";
  END IF;
  SELECT * INTO p FROM purchases WHERE id=pid AND "tenantId"=tid;
  IF p.id IS NULL THEN RAISE EXCEPTION 'Missing purchase'; END IF;
  SELECT count(*),sum(subtotal) INTO n,amount FROM purchase_lines WHERE "tenantId"=tid AND "purchaseId"=pid;
  IF n<1 OR n>100 OR amount IS DISTINCT FROM p.total THEN RAISE EXCEPTION 'Purchase total or lines mismatch'; END IF;
  IF p.status='DRAFT' THEN
    IF EXISTS(SELECT 1 FROM stock_movements m JOIN purchase_lines l ON l.id=m."purchaseLineId" AND l."tenantId"=m."tenantId" WHERE l."tenantId"=tid AND l."purchaseId"=pid) THEN RAISE EXCEPTION 'Draft changed stock'; END IF;
  ELSE
    IF EXISTS(SELECT 1 FROM purchase_lines l LEFT JOIN stock_movements m ON m."tenantId"=l."tenantId" AND m."purchaseLineId"=l.id
      WHERE l."tenantId"=tid AND l."purchaseId"=pid AND (m.id IS NULL OR m."quantityDelta"<>l.quantity OR m."actorUserId"<>p."receivedById" OR m."movementType"<>'PURCHASE_RECEIPT')) THEN
      RAISE EXCEPTION 'Incomplete purchase receipt';
    END IF;
    IF NOT EXISTS(SELECT 1 FROM audit_events WHERE "tenantId"=tid AND "entityId"=pid AND "entityType"='Purchase' AND action='PURCHASE_RECEIVED' AND "actorUserId"=p."receivedById") THEN RAISE EXCEPTION 'Missing receipt audit'; END IF;
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER purchases_integrity AFTER INSERT OR UPDATE ON purchases DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_purchase_integrity();
CREATE CONSTRAINT TRIGGER purchase_lines_integrity AFTER INSERT OR UPDATE OR DELETE ON purchase_lines DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_purchase_integrity();
CREATE CONSTRAINT TRIGGER purchase_movements_integrity AFTER INSERT ON stock_movements DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_purchase_integrity();
COMMIT;
