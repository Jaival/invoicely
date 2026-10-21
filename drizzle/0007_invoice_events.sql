CREATE TABLE "invoice_event" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"type" text NOT NULL,
	"data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoice_event_type_valid" CHECK ("invoice_event"."type" in ('sent', 'emailed', 'paid', 'unpaid', 'voided'))
);
--> statement-breakpoint
ALTER TABLE "invoice_event" ADD CONSTRAINT "invoice_event_invoice_id_invoice_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoice"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invoice_event_invoice_id_created_at_idx" ON "invoice_event" USING btree ("invoice_id","created_at");--> statement-breakpoint
-- Hand-written backfill: invoices sent before the log existed get the events
-- their columns still show. A sent invoice can't be edited, so a paid one's
-- updated_at is when it was marked paid. Earlier emails aren't known.
INSERT INTO "invoice_event" ("invoice_id", "type", "created_at")
SELECT "id", 'sent', "sent_at" FROM "invoice" WHERE "sent_at" IS NOT NULL;--> statement-breakpoint
INSERT INTO "invoice_event" ("invoice_id", "type", "data", "created_at")
SELECT "id", 'paid', jsonb_build_object('paidOn', "paid_on"), "updated_at"
FROM "invoice" WHERE "status" = 'paid';--> statement-breakpoint
INSERT INTO "invoice_event" ("invoice_id", "type", "created_at")
SELECT "id", 'voided', "voided_at" FROM "invoice" WHERE "status" = 'void';
