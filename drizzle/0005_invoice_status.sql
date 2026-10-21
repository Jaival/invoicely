ALTER TABLE "invoice" ADD COLUMN "business_details" jsonb;--> statement-breakpoint
ALTER TABLE "invoice" ADD COLUMN "client_details" jsonb;--> statement-breakpoint
ALTER TABLE "invoice" ADD COLUMN "sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "invoice" ADD COLUMN "paid_on" date;--> statement-breakpoint
ALTER TABLE "invoice" ADD COLUMN "voided_at" timestamp with time zone;--> statement-breakpoint
-- Hand-written backfill so the checks below hold for invoices sent before
-- these columns existed: details as they are now, dates from the last update.
UPDATE "invoice" SET
  "sent_at" = "invoice"."updated_at",
  "paid_on" = CASE WHEN "invoice"."status" = 'paid' THEN "invoice"."updated_at"::date END,
  "voided_at" = CASE WHEN "invoice"."status" = 'void' THEN "invoice"."updated_at" END,
  "client_details" = (
    SELECT jsonb_build_object(
      'name', c."name", 'email', c."email", 'taxId', c."tax_id",
      'addressLine1', c."address_line1", 'addressLine2', c."address_line2",
      'city', c."city", 'region', c."region", 'postalCode', c."postal_code",
      'country', c."country")
    FROM "client" c WHERE c."id" = "invoice"."client_id"
  ),
  "business_details" = (
    SELECT jsonb_build_object(
      'name', coalesce(p."name", o."name"), 'logoUrl', p."logo_url",
      'email', p."email", 'taxId', p."tax_id",
      'addressLine1', p."address_line1", 'addressLine2', p."address_line2",
      'city', p."city", 'region', p."region", 'postalCode', p."postal_code",
      'country', p."country")
    FROM "organization" o
    LEFT JOIN "business_profile" p ON p."organization_id" = o."id"
    WHERE o."id" = "invoice"."organization_id"
  )
WHERE "invoice"."status" <> 'draft';--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_sent_details_unless_draft" CHECK (("invoice"."status" = 'draft') = ("invoice"."sent_at" is null) and ("invoice"."sent_at" is null) = ("invoice"."business_details" is null) and ("invoice"."sent_at" is null) = ("invoice"."client_details" is null));--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_paid_on_when_paid" CHECK (("invoice"."status" = 'paid') = ("invoice"."paid_on" is not null));--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_voided_at_when_void" CHECK (("invoice"."status" = 'void') = ("invoice"."voided_at" is not null));
