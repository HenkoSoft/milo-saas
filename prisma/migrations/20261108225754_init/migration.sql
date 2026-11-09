CREATE TYPE "PriceVisibility" AS ENUM ('PUBLIC', 'AUTHENTICATED_CUSTOMERS');

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "commercialName" TEXT,
    "legalName" TEXT,
    "taxId" TEXT,
    "fiscalData" JSONB,
    "address" TEXT,
    "contactData" JSONB,
    "logoKey" TEXT,
    "currency" CHAR(3),
    "locale" TEXT,
    "timeZone" TEXT,
    "accountStatus" TEXT,
    "priceVisibility" "PriceVisibility" NOT NULL DEFAULT 'AUTHENTICATED_CUSTOMERS',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_definitions" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assignmentScope" TEXT NOT NULL,

    CONSTRAINT "role_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_role_assignments" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userProfileId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "assignmentScope" TEXT NOT NULL,
    "branchId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_role_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "baseUnitCode" TEXT NOT NULL,
    "baseUnitDimensionCode" TEXT NOT NULL,
    "allowsFractionalQuantity" BOOLEAN NOT NULL,
    "categoryId" UUID,
    "brandId" UUID,
    "isPublished" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units_of_measure" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dimensionCode" TEXT NOT NULL,

    CONSTRAINT "units_of_measure_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "product_presentations" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "unitCode" TEXT NOT NULL,
    "dimensionCode" TEXT NOT NULL,
    "conversionFactor" DECIMAL(18,3) NOT NULL,
    "isEnabled" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "product_presentations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "storageKey" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wholesale_prices" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "productPresentationId" UUID NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "wholesale_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "contactData" JSONB,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_access_requests" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "submittedData" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "reviewedByUserId" UUID,
    "reviewedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "customer_access_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wholesale_orders" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "total" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "wholesale_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_lines" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "productPresentationId" UUID NOT NULL,
    "skuSnapshot" TEXT NOT NULL,
    "nameSnapshot" TEXT NOT NULL,
    "presentationNameSnapshot" TEXT NOT NULL,
    "unitSnapshot" TEXT NOT NULL,
    "quantitySnapshot" DECIMAL(18,3) NOT NULL,
    "conversionFactorSnapshot" DECIMAL(18,3) NOT NULL,
    "baseQuantitySnapshot" DECIMAL(18,3) NOT NULL,
    "unitPriceSnapshot" DECIMAL(18,2) NOT NULL,
    "lineTotal" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "order_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_events" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "actorUserId" UUID,
    "previousStatus" TEXT,
    "newStatus" TEXT NOT NULL,
    "occurredAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_records" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "reference" TEXT,
    "recordedByUserId" UUID NOT NULL,
    "confirmedByUserId" UUID,
    "confirmedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_balances" (
    "tenantId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "quantityOnHand" DECIMAL(18,3) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "stock_balances_pkey" PRIMARY KEY ("tenantId","branchId","productId")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "movementType" TEXT NOT NULL,
    "quantityDelta" DECIMAL(18,3) NOT NULL,
    "sourceOrderId" UUID,
    "actorUserId" UUID NOT NULL,
    "occurredAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "actorUserId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" UUID NOT NULL,
    "occurredAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_profiles_tenantId_idx" ON "user_profiles"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_tenantId_id_key" ON "user_profiles"("tenantId", "id");

-- CreateIndex
CREATE INDEX "branches_tenantId_idx" ON "branches"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "branches_tenantId_id_key" ON "branches"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "role_definitions_code_key" ON "role_definitions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "role_definitions_id_assignmentScope_key" ON "role_definitions"("id", "assignmentScope");

-- CreateIndex
CREATE INDEX "user_role_assignments_tenantId_userProfileId_idx" ON "user_role_assignments"("tenantId", "userProfileId");

-- CreateIndex
CREATE INDEX "user_role_assignments_tenantId_branchId_roleId_idx" ON "user_role_assignments"("tenantId", "branchId", "roleId");

-- CreateIndex
CREATE INDEX "categories_tenantId_idx" ON "categories"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "categories_tenantId_id_key" ON "categories"("tenantId", "id");

-- CreateIndex
CREATE INDEX "brands_tenantId_idx" ON "brands"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "brands_tenantId_id_key" ON "brands"("tenantId", "id");

-- CreateIndex
CREATE INDEX "products_tenantId_categoryId_idx" ON "products"("tenantId", "categoryId");

-- CreateIndex
CREATE INDEX "products_tenantId_brandId_idx" ON "products"("tenantId", "brandId");

-- CreateIndex
CREATE INDEX "products_tenantId_isPublished_idx" ON "products"("tenantId", "isPublished");

-- CreateIndex
CREATE UNIQUE INDEX "products_tenantId_id_key" ON "products"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "products_tenantId_id_baseUnitDimensionCode_key" ON "products"("tenantId", "id", "baseUnitDimensionCode");

-- CreateIndex
CREATE UNIQUE INDEX "products_tenantId_sku_key" ON "products"("tenantId", "sku");

-- CreateIndex
CREATE INDEX "units_of_measure_dimensionCode_idx" ON "units_of_measure"("dimensionCode");

-- CreateIndex
CREATE UNIQUE INDEX "units_of_measure_code_dimensionCode_key" ON "units_of_measure"("code", "dimensionCode");

-- CreateIndex
CREATE INDEX "product_presentations_tenantId_productId_isEnabled_idx" ON "product_presentations"("tenantId", "productId", "isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "product_presentations_tenantId_id_key" ON "product_presentations"("tenantId", "id");

-- CreateIndex
CREATE INDEX "product_images_tenantId_productId_idx" ON "product_images"("tenantId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "product_images_tenantId_id_key" ON "product_images"("tenantId", "id");

-- CreateIndex
CREATE INDEX "wholesale_prices_tenantId_idx" ON "wholesale_prices"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "wholesale_prices_tenantId_productPresentationId_key" ON "wholesale_prices"("tenantId", "productPresentationId");

-- CreateIndex
CREATE INDEX "customers_tenantId_status_idx" ON "customers"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "customers_tenantId_id_key" ON "customers"("tenantId", "id");

-- CreateIndex
CREATE INDEX "customer_access_requests_tenantId_status_createdAt_idx" ON "customer_access_requests"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "customer_access_requests_tenantId_id_key" ON "customer_access_requests"("tenantId", "id");

-- CreateIndex
CREATE INDEX "wholesale_orders_tenantId_branchId_customerId_createdAt_idx" ON "wholesale_orders"("tenantId", "branchId", "customerId", "createdAt");

-- CreateIndex
CREATE INDEX "wholesale_orders_tenantId_branchId_status_createdAt_idx" ON "wholesale_orders"("tenantId", "branchId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "wholesale_orders_tenantId_id_key" ON "wholesale_orders"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "wholesale_orders_tenantId_branchId_id_key" ON "wholesale_orders"("tenantId", "branchId", "id");

-- CreateIndex
CREATE INDEX "order_lines_tenantId_orderId_idx" ON "order_lines"("tenantId", "orderId");

-- CreateIndex
CREATE UNIQUE INDEX "order_lines_tenantId_id_key" ON "order_lines"("tenantId", "id");

-- CreateIndex
CREATE INDEX "order_status_events_tenantId_orderId_occurredAt_idx" ON "order_status_events"("tenantId", "orderId", "occurredAt");

-- CreateIndex
CREATE INDEX "payment_records_tenantId_orderId_createdAt_idx" ON "payment_records"("tenantId", "orderId", "createdAt");

-- CreateIndex
CREATE INDEX "stock_movements_tenantId_branchId_productId_occurredAt_idx" ON "stock_movements"("tenantId", "branchId", "productId", "occurredAt");

-- CreateIndex
CREATE INDEX "stock_movements_tenantId_branchId_sourceOrderId_idx" ON "stock_movements"("tenantId", "branchId", "sourceOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_movements_tenantId_id_key" ON "stock_movements"("tenantId", "id");

-- CreateIndex
CREATE INDEX "audit_events_tenantId_occurredAt_idx" ON "audit_events"("tenantId", "occurredAt");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_tenantId_userProfileId_fkey" FOREIGN KEY ("tenantId", "userProfileId") REFERENCES "user_profiles"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_roleId_assignmentScope_fkey" FOREIGN KEY ("roleId", "assignmentScope") REFERENCES "role_definitions"("id", "assignmentScope") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_tenantId_branchId_fkey" FOREIGN KEY ("tenantId", "branchId") REFERENCES "branches"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_baseUnitCode_baseUnitDimensionCode_fkey" FOREIGN KEY ("baseUnitCode", "baseUnitDimensionCode") REFERENCES "units_of_measure"("code", "dimensionCode") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_tenantId_categoryId_fkey" FOREIGN KEY ("tenantId", "categoryId") REFERENCES "categories"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_tenantId_brandId_fkey" FOREIGN KEY ("tenantId", "brandId") REFERENCES "brands"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "product_presentations" ADD CONSTRAINT "product_presentations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "product_presentations" ADD CONSTRAINT "product_presentations_tenantId_productId_dimensionCode_fkey" FOREIGN KEY ("tenantId", "productId", "dimensionCode") REFERENCES "products"("tenantId", "id", "baseUnitDimensionCode") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "product_presentations" ADD CONSTRAINT "product_presentations_unitCode_dimensionCode_fkey" FOREIGN KEY ("unitCode", "dimensionCode") REFERENCES "units_of_measure"("code", "dimensionCode") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_tenantId_productId_fkey" FOREIGN KEY ("tenantId", "productId") REFERENCES "products"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "wholesale_prices" ADD CONSTRAINT "wholesale_prices_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "wholesale_prices" ADD CONSTRAINT "wholesale_prices_tenantId_productPresentationId_fkey" FOREIGN KEY ("tenantId", "productPresentationId") REFERENCES "product_presentations"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "customer_access_requests" ADD CONSTRAINT "customer_access_requests_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "customer_access_requests" ADD CONSTRAINT "customer_access_requests_tenantId_reviewedByUserId_fkey" FOREIGN KEY ("tenantId", "reviewedByUserId") REFERENCES "user_profiles"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "wholesale_orders" ADD CONSTRAINT "wholesale_orders_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "wholesale_orders" ADD CONSTRAINT "wholesale_orders_tenantId_branchId_fkey" FOREIGN KEY ("tenantId", "branchId") REFERENCES "branches"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "wholesale_orders" ADD CONSTRAINT "wholesale_orders_tenantId_customerId_fkey" FOREIGN KEY ("tenantId", "customerId") REFERENCES "customers"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_tenantId_orderId_fkey" FOREIGN KEY ("tenantId", "orderId") REFERENCES "wholesale_orders"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_tenantId_productPresentationId_fkey" FOREIGN KEY ("tenantId", "productPresentationId") REFERENCES "product_presentations"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "order_status_events" ADD CONSTRAINT "order_status_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "order_status_events" ADD CONSTRAINT "order_status_events_tenantId_orderId_fkey" FOREIGN KEY ("tenantId", "orderId") REFERENCES "wholesale_orders"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "order_status_events" ADD CONSTRAINT "order_status_events_tenantId_actorUserId_fkey" FOREIGN KEY ("tenantId", "actorUserId") REFERENCES "user_profiles"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_tenantId_orderId_fkey" FOREIGN KEY ("tenantId", "orderId") REFERENCES "wholesale_orders"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_tenantId_recordedByUserId_fkey" FOREIGN KEY ("tenantId", "recordedByUserId") REFERENCES "user_profiles"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_tenantId_confirmedByUserId_fkey" FOREIGN KEY ("tenantId", "confirmedByUserId") REFERENCES "user_profiles"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_tenantId_branchId_fkey" FOREIGN KEY ("tenantId", "branchId") REFERENCES "branches"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_tenantId_productId_fkey" FOREIGN KEY ("tenantId", "productId") REFERENCES "products"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_tenantId_branchId_fkey" FOREIGN KEY ("tenantId", "branchId") REFERENCES "branches"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_tenantId_productId_fkey" FOREIGN KEY ("tenantId", "productId") REFERENCES "products"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_tenantId_branchId_sourceOrderId_fkey" FOREIGN KEY ("tenantId", "branchId", "sourceOrderId") REFERENCES "wholesale_orders"("tenantId", "branchId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_tenantId_actorUserId_fkey" FOREIGN KEY ("tenantId", "actorUserId") REFERENCES "user_profiles"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_tenantId_actorUserId_fkey" FOREIGN KEY ("tenantId", "actorUserId") REFERENCES "user_profiles"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;


-- Additional integrity constraints not expressible in the Prisma schema.
ALTER TABLE "role_definitions"
ADD CONSTRAINT "role_definitions_scope_by_code_check"
CHECK (
  ("assignmentScope" = 'COMPANY' AND "code" IN ('OWNER', 'ADMIN'))
  OR
  ("assignmentScope" = 'BRANCH' AND "code" IN ('MANAGER', 'SALES', 'TECHNICIAN', 'WAREHOUSE'))
);

ALTER TABLE "user_role_assignments"
ADD CONSTRAINT "user_role_assignments_scope_branch_check"
CHECK (
  ("assignmentScope" = 'COMPANY' AND "branchId" IS NULL)
  OR
  ("assignmentScope" = 'BRANCH' AND "branchId" IS NOT NULL)
);

ALTER TABLE "stock_balances"
ADD CONSTRAINT "stock_balances_quantity_nonnegative_check"
CHECK ("quantityOnHand" >= 0);

ALTER TABLE "product_presentations"
ADD CONSTRAINT "product_presentations_conversion_factor_positive_check"
CHECK ("conversionFactor" > 0);

ALTER TABLE "order_lines"
ADD CONSTRAINT "order_lines_quantities_positive_check"
CHECK (
  "quantitySnapshot" > 0
  AND "conversionFactorSnapshot" > 0
  AND "baseQuantitySnapshot" > 0
);

CREATE UNIQUE INDEX "user_role_assignments_company_role_unique"
ON "user_role_assignments" ("tenantId", "userProfileId", "roleId")
WHERE "branchId" IS NULL;

CREATE UNIQUE INDEX "user_role_assignments_branch_role_unique"
ON "user_role_assignments" ("tenantId", "userProfileId", "roleId", "branchId")
WHERE "branchId" IS NOT NULL;

-- An UPDATE already holds its parent row lock before its BEFORE trigger runs.
-- OrderLine writes take the same parent-row lock before FK checks/history writes.
CREATE FUNCTION "prevent_historical_presentation_identity_change"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF ROW(NEW."productId", NEW."unitCode", NEW."dimensionCode", NEW."conversionFactor")
       IS DISTINCT FROM
     ROW(OLD."productId", OLD."unitCode", OLD."dimensionCode", OLD."conversionFactor")
     AND EXISTS (
       SELECT 1
       FROM "order_lines" AS line
       WHERE line."tenantId" = OLD."tenantId"
         AND line."productPresentationId" = OLD."id"
     ) THEN
    RAISE EXCEPTION
      'Cannot change a product presentation identity after order lines reference it.'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "product_presentations_preserve_historical_identity"
BEFORE UPDATE OF "productId", "unitCode", "dimensionCode", "conversionFactor"
ON "product_presentations"
FOR EACH ROW
EXECUTE FUNCTION "prevent_historical_presentation_identity_change"();

CREATE FUNCTION "lock_order_line_presentation_rows"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM presentation."id"
    FROM "product_presentations" AS presentation
    WHERE presentation."tenantId" = NEW."tenantId"
      AND presentation."id" = NEW."productPresentationId"
    ORDER BY presentation."tenantId", presentation."id"
    FOR UPDATE;
  ELSE
    PERFORM presentation."id"
    FROM "product_presentations" AS presentation
    WHERE (presentation."tenantId" = OLD."tenantId"
           AND presentation."id" = OLD."productPresentationId")
       OR (presentation."tenantId" = NEW."tenantId"
           AND presentation."id" = NEW."productPresentationId")
    ORDER BY presentation."tenantId", presentation."id"
    FOR UPDATE;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "order_lines_lock_presentation_rows"
BEFORE INSERT OR UPDATE OF "tenantId", "productPresentationId"
ON "order_lines"
FOR EACH ROW
EXECUTE FUNCTION "lock_order_line_presentation_rows"();

CREATE FUNCTION "prevent_historical_product_base_unit_change"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF ROW(NEW."baseUnitCode", NEW."baseUnitDimensionCode")
       IS DISTINCT FROM
     ROW(OLD."baseUnitCode", OLD."baseUnitDimensionCode")
     AND (
       EXISTS (
         SELECT 1
         FROM "stock_balances" AS balance
         WHERE balance."tenantId" = OLD."tenantId"
           AND balance."productId" = OLD."id"
       )
       OR EXISTS (
         SELECT 1
         FROM "stock_movements" AS movement
         WHERE movement."tenantId" = OLD."tenantId"
           AND movement."productId" = OLD."id"
       )
     ) THEN
    RAISE EXCEPTION
      'Cannot change a product base unit after stock balances or movements exist.'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "products_preserve_historical_base_unit"
BEFORE UPDATE OF "baseUnitCode", "baseUnitDimensionCode"
ON "products"
FOR EACH ROW
EXECUTE FUNCTION "prevent_historical_product_base_unit_change"();

-- Stock writers and a base-unit change lock the same Product row before
-- checking/creating dependent records. For multi-product operations callers
-- must lock Product rows by (tenantId, id) ascending before reading units.
CREATE FUNCTION "lock_stock_balance_product_rows"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM product."id"
    FROM "products" AS product
    WHERE product."tenantId" = NEW."tenantId"
      AND product."id" = NEW."productId"
    ORDER BY product."tenantId", product."id"
    FOR UPDATE;
  ELSE
    PERFORM product."id"
    FROM "products" AS product
    WHERE (product."tenantId" = OLD."tenantId"
           AND product."id" = OLD."productId")
       OR (product."tenantId" = NEW."tenantId"
           AND product."id" = NEW."productId")
    ORDER BY product."tenantId", product."id"
    FOR UPDATE;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "stock_balances_lock_product_rows"
BEFORE INSERT OR UPDATE OF "tenantId", "productId"
ON "stock_balances"
FOR EACH ROW
EXECUTE FUNCTION "lock_stock_balance_product_rows"();

CREATE FUNCTION "lock_stock_movement_product_row"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM product."id"
  FROM "products" AS product
  WHERE product."tenantId" = NEW."tenantId"
    AND product."id" = NEW."productId"
  ORDER BY product."tenantId", product."id"
  FOR UPDATE;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "stock_movements_lock_product_row"
BEFORE INSERT
ON "stock_movements"
FOR EACH ROW
EXECUTE FUNCTION "lock_stock_movement_product_row"();

-- Inventory movements are an append-only ledger. Corrections must be represented
-- by a new movement according to a separately approved business workflow.
CREATE FUNCTION "reject_stock_movement_mutation"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    'Stock movements are append-only; record a new movement instead of changing history.'
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$;

CREATE TRIGGER "stock_movements_append_only"
BEFORE UPDATE OR DELETE
ON "stock_movements"
FOR EACH ROW
EXECUTE FUNCTION "reject_stock_movement_mutation"();

CREATE TRIGGER "stock_movements_prevent_truncate"
BEFORE TRUNCATE
ON "stock_movements"
FOR EACH STATEMENT
EXECUTE FUNCTION "reject_stock_movement_mutation"();
