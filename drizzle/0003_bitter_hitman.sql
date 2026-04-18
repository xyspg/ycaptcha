ALTER TABLE "puzzle" ALTER COLUMN "image_set_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "puzzle" ADD COLUMN "audio_answer" text;--> statement-breakpoint
ALTER TABLE "puzzle" ADD COLUMN "captcha_mode" text DEFAULT 'image' NOT NULL;--> statement-breakpoint
ALTER TABLE "audio" DROP COLUMN "answer";