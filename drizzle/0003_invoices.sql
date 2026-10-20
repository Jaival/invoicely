CREATE TABLE "invoice" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"sequence" integer,
	"number" text,
	"currency" text NOT NULL,
	"issue_date" date NOT NULL,
	"due_date" date NOT NULL,
	"notes" text,
	"terms" text,
	"subtotal" bigint DEFAULT 0 NOT NULL,
	"discount" bigint DEFAULT 0 NOT NULL,
	"tax" bigint DEFAULT 0 NOT NULL,
	"total" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoice_organization_id_sequence_unique" UNIQUE("organization_id","sequence"),
	CONSTRAINT "invoice_organization_id_number_unique" UNIQUE("organization_id","number"),
	CONSTRAINT "invoice_status_valid" CHECK ("invoice"."status" in ('draft', 'sent', 'paid', 'void')),
	CONSTRAINT "invoice_numbered_unless_draft" CHECK (("invoice"."status" = 'draft') = ("invoice"."sequence" is null) and ("invoice"."sequence" is null) = ("invoice"."number" is null)),
	CONSTRAINT "invoice_currency_iso" CHECK ("invoice"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "invoice_due_after_issue" CHECK ("invoice"."due_date" >= "invoice"."issue_date")
);
--> statement-breakpoint
CREATE TABLE "invoice_counter" (
	"organization_id" uuid PRIMARY KEY NOT NULL,
	"last_sequence" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_line" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"description" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" bigint NOT NULL,
	"tax_rate" integer DEFAULT 0 NOT NULL,
	"discount_rate" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "invoice_line_invoice_id_position_unique" UNIQUE("invoice_id","position"),
	CONSTRAINT "invoice_line_quantity_not_negative" CHECK ("invoice_line"."quantity" >= 0),
	CONSTRAINT "invoice_line_unit_price_not_negative" CHECK ("invoice_line"."unit_price" >= 0),
	CONSTRAINT "invoice_line_tax_rate_range" CHECK ("invoice_line"."tax_rate" between 0 and 10000),
	CONSTRAINT "invoice_line_discount_rate_range" CHECK ("invoice_line"."discount_rate" between 0 and 10000)
);
--> statement-breakpoint
ALTER TABLE "client" ADD CONSTRAINT "client_organization_id_id_unique" UNIQUE("organization_id","id");--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_client_fk" FOREIGN KEY ("organization_id","client_id") REFERENCES "public"."client"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_counter" ADD CONSTRAINT "invoice_counter_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_line" ADD CONSTRAINT "invoice_line_invoice_id_invoice_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoice"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invoice_organization_id_client_id_idx" ON "invoice" USING btree ("organization_id","client_id");