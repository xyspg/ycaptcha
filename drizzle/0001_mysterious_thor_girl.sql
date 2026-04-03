ALTER TABLE "captcha_session" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "captcha_session" CASCADE;--> statement-breakpoint
ALTER TABLE "puzzle" DROP CONSTRAINT "puzzle_image_set_id_image_set_id_fk";
--> statement-breakpoint
ALTER TABLE "image" ADD COLUMN "content_hash" text;--> statement-breakpoint
ALTER TABLE "puzzle" ADD COLUMN "correct_count" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "puzzle" ADD COLUMN "correct_count_max" integer;--> statement-breakpoint
ALTER TABLE "puzzle" ADD COLUMN "enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "puzzle" ADD CONSTRAINT "puzzle_image_set_id_image_set_id_fk" FOREIGN KEY ("image_set_id") REFERENCES "public"."image_set"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "image_imageSetId_contentHash_idx" ON "image" USING btree ("image_set_id","content_hash");--> statement-breakpoint
ALTER TABLE "site" ADD CONSTRAINT "site_secret_key_unique" UNIQUE("secret_key");