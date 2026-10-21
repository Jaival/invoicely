ALTER TABLE "invoice" ADD COLUMN "public_token" text;--> statement-breakpoint
-- Hand-written backfill: invoices sent before this column existed get a
-- token like newPublicToken()'s, 24 random bytes as 32 base64url characters.
UPDATE "invoice" SET "public_token" = translate(encode(substring(sha256(
  gen_random_uuid()::text::bytea || gen_random_uuid()::text::bytea
) from 1 for 24), 'base64'), '+/', '-_')
WHERE "status" <> 'draft';--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_publicToken_unique" UNIQUE("public_token");
