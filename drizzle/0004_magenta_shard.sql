ALTER TABLE "audio" ADD COLUMN "size_bytes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "image" ADD COLUMN "size_bytes" integer DEFAULT 0 NOT NULL;