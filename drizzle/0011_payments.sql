CREATE TABLE "payment" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"amount" bigint NOT NULL,
	"received_on" date NOT NULL,
	"method" text NOT NULL,
	"reference" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_amount_positive" CHECK ("payment"."amount" > 0),
	CONSTRAINT "payment_method_valid" CHECK ("payment"."method" in ('bank_transfer', 'card', 'cash', 'cheque', 'other'))
);
--> statement-breakpoint
ALTER TABLE "invoice_event" DROP CONSTRAINT "invoice_event_type_valid";--> statement-breakpoint
ALTER TABLE "invoice" ADD COLUMN "amount_paid" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_invoice_id_invoice_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoice"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_invoice_id_idx" ON "payment" USING btree ("invoice_id");--> statement-breakpoint
-- Hand-written backfill so the check below holds for invoices marked paid
-- before payments were recorded: one payment of the whole total, on the day
-- it was marked paid. How it was paid wasn't asked, so it's "other".
INSERT INTO "payment" ("invoice_id", "amount", "received_on", "method")
SELECT "id", "total", "paid_on", 'other' FROM "invoice"
WHERE "status" = 'paid' AND "total" > 0;--> statement-breakpoint
UPDATE "invoice" SET "amount_paid" = "total" WHERE "status" = 'paid';--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_amount_paid_matches_status" CHECK ("invoice"."amount_paid" >= 0 and case "invoice"."status" when 'paid' then "invoice"."amount_paid" = "invoice"."total" when 'sent' then "invoice"."amount_paid" = 0 or "invoice"."amount_paid" < "invoice"."total" else "invoice"."amount_paid" = 0 end);--> statement-breakpoint
ALTER TABLE "invoice_event" ADD CONSTRAINT "invoice_event_type_valid" CHECK ("invoice_event"."type" in ('sent', 'emailed', 'paid', 'unpaid', 'payment_recorded', 'payment_removed', 'voided'));