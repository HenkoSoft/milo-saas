-- Purchase metadata and explicit manual IVA; separate deployment authorization required.
BEGIN;
SET LOCAL lock_timeout='10s';
SET LOCAL statement_timeout='60s';
ALTER TABLE purchases ADD COLUMN "documentType" VARCHAR(4), ADD COLUMN "pointOfSale" VARCHAR(5), ADD COLUMN "documentNumber" VARCHAR(8), ADD COLUMN "purchaseCategory" VARCHAR(100), ADD COLUMN "taxAmount" DECIMAL(18,2);
ALTER TABLE purchases ADD CONSTRAINT purchases_document_check CHECK (
("documentType" IS NULL OR "documentType" IN ('FA','FB','FC','OTRO'))
AND ("pointOfSale" IS NULL OR "pointOfSale" ~ '^[0-9]{1,5}$')
AND ("documentNumber" IS NULL OR "documentNumber" ~ '^[0-9]{1,8}$')
AND ("purchaseCategory" IS NULL OR length(btrim("purchaseCategory"))>0)
AND ("taxAmount" IS NULL OR ("taxAmount">=0 AND "taxAmount"<='9999999999999999.99'::numeric AND "taxAmount"<>'NaN'::numeric))
);
CREATE OR REPLACE FUNCTION check_purchase_integrity() RETURNS trigger LANGUAGE plpgsql AS $$
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
  IF n<1 OR n>100 OR amount + coalesce(p."taxAmount",0) IS DISTINCT FROM p.total THEN RAISE EXCEPTION 'Purchase total or lines mismatch'; END IF;
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
COMMIT;
