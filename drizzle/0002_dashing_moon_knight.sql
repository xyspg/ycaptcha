CREATE TABLE "audio" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"url" text NOT NULL,
	"name" text NOT NULL,
	"answer" text NOT NULL,
	"duration_ms" integer,
	"content_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "puzzle" ADD COLUMN "audio_id" text;--> statement-breakpoint
ALTER TABLE "audio" ADD CONSTRAINT "audio_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audio_userId_idx" ON "audio" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "puzzle" ADD CONSTRAINT "puzzle_audio_id_audio_id_fk" FOREIGN KEY ("audio_id") REFERENCES "public"."audio"("id") ON DELETE set null ON UPDATE no action;