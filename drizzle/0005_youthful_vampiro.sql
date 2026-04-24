CREATE TABLE "gallery_item" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"author_id" text,
	"author_display_name" text NOT NULL,
	"anonymous" boolean DEFAULT false NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"images_hash" text NOT NULL,
	"download_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "gallery_item_slug_unique" UNIQUE("slug"),
	CONSTRAINT "gallery_item_images_hash_unique" UNIQUE("images_hash")
);
--> statement-breakpoint
CREATE TABLE "verification_event" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"site_id" text NOT NULL,
	"puzzle_id" text,
	"event_type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gallery_item" ADD CONSTRAINT "gallery_item_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_event" ADD CONSTRAINT "verification_event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_event" ADD CONSTRAINT "verification_event_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_event" ADD CONSTRAINT "verification_event_puzzle_id_puzzle_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."puzzle"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "galleryItem_authorId_idx" ON "gallery_item" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "galleryItem_status_createdAt_idx" ON "gallery_item" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "verificationEvent_userId_createdAt_idx" ON "verification_event" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "verificationEvent_siteId_createdAt_idx" ON "verification_event" USING btree ("site_id","created_at");--> statement-breakpoint
CREATE INDEX "verificationEvent_puzzleId_createdAt_idx" ON "verification_event" USING btree ("puzzle_id","created_at");