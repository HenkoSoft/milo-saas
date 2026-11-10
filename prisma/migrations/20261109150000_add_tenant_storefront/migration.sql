-- Explicit transaction: all storefront DDL succeeds or rolls back together.
BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '60s';

-- CreateEnum
CREATE TYPE "StorefrontTemplate" AS ENUM ('WHOLESALE');

-- CreateEnum
CREATE TYPE "StorefrontRegistrationPolicy" AS ENUM ('MANUAL');

-- CreateTable
CREATE TABLE "tenant_storefronts" (
    "tenantId" UUID NOT NULL,
    "slug" VARCHAR(63) NOT NULL,
    "template" "StorefrontTemplate" NOT NULL DEFAULT 'WHOLESALE',
    "registrationPolicy" "StorefrontRegistrationPolicy" NOT NULL DEFAULT 'MANUAL',
    "draft" JSONB NOT NULL,
    "published" JSONB,
    "publishedAt" TIMESTAMPTZ(6),
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tenant_storefronts_pkey" PRIMARY KEY ("tenantId")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_storefronts_slug_key" ON "tenant_storefronts"("slug");

-- AddForeignKey
ALTER TABLE "tenant_storefronts" ADD CONSTRAINT "tenant_storefronts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Additional invariants not represented by Prisma's schema diff.
-- C collation keeps the canonical slug alphabet strictly ASCII.
ALTER TABLE "tenant_storefronts"
    ADD CONSTRAINT "tenant_storefronts_slug_canonical_check"
        CHECK (char_length("slug") BETWEEN 1 AND 63
            AND "slug" COLLATE "C" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    ADD CONSTRAINT "tenant_storefronts_revision_positive_check"
        CHECK ("revision" > 0),
    ADD CONSTRAINT "tenant_storefronts_draft_object_check"
        CHECK (jsonb_typeof("draft") = 'object'),
    ADD CONSTRAINT "tenant_storefronts_published_object_check"
        CHECK ("published" IS NULL OR jsonb_typeof("published") = 'object'),
    ADD CONSTRAINT "tenant_storefronts_publication_coherent_check"
        CHECK (("published" IS NULL AND "publishedAt" IS NULL)
            OR ("published" IS NOT NULL AND "publishedAt" IS NOT NULL));

COMMIT;
