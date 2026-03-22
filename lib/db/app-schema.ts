import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
  real,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { nanoid } from "nanoid";
import { user } from "./schema";

/**
 * Sites - each site represents a domain where the CAPTCHA will be deployed.
 * A user can own multiple sites. Each site gets a unique siteKey (public)
 * and secretKey (private) for API authentication.
 */
export const site = pgTable(
  "site",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    domain: text("domain"),
    siteKey: text("site_key")
      .notNull()
      .unique()
      .$defaultFn(() => `pk_${nanoid(32)}`),
    secretKey: text("secret_key")
      .notNull()
      .$defaultFn(() => `sk_${nanoid(32)}`),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("site_userId_idx").on(table.userId)],
);

/**
 * Image Sets - a themed pool of images (e.g. "NYC Subway Lines").
 * Owned by user, not site — so the same image set can be reused across multiple sites.
 */
export const imageSet = pgTable(
  "image_set",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("imageSet_userId_idx").on(table.userId)],
);

/**
 * Images - individual images within an image set.
 * No tags — correctness is determined at the puzzle level, not the image level.
 */
export const image = pgTable(
  "image",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    imageSetId: text("image_set_id")
      .notNull()
      .references(() => imageSet.id, { onDelete: "cascade" }),
    url: text("url").notNull(), // public URL from Cloudflare R2
    name: text("name"), // optional display name
    contentHash: text("content_hash"), // SHA-256 of processed image for dedup
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("image_imageSetId_idx").on(table.imageSetId),
    index("image_contentHash_idx").on(table.contentHash),
  ],
);

/**
 * Puzzles - a specific question within a site.
 * References an image set for the image pool, and stores which images
 * are correct answers. Optionally stores hand-picked incorrect images
 * for curated misleading answers; if null, incorrect images are randomly
 * drawn from the remaining images in the set.
 */
export const puzzle = pgTable(
  "puzzle",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    siteId: text("site_id")
      .notNull()
      .references(() => site.id, { onDelete: "cascade" }),
    imageSetId: text("image_set_id")
      .notNull()
      .references(() => imageSet.id, { onDelete: "cascade" }),
    prompt: text("prompt").notNull(),
    correctImageIds: jsonb("correct_image_ids")
      .$type<string[]>()
      .notNull()
      .default([]),
    incorrectImageIds: jsonb("incorrect_image_ids").$type<string[]>(), // null = random from pool
    correctCount: integer("correct_count").notNull().default(3), // min (or exact) correct images per challenge
    correctCountMax: integer("correct_count_max"), // null = exact mode, non-null = random range [correctCount, correctCountMax]
    difficulty: real("difficulty").notNull().default(0.5),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("puzzle_siteId_idx").on(table.siteId)],
);


export const siteRelations = relations(site, ({ one, many }) => ({
  user: one(user, { fields: [site.userId], references: [user.id] }),
  puzzles: many(puzzle),
}));

export const imageSetRelations = relations(imageSet, ({ one, many }) => ({
  user: one(user, { fields: [imageSet.userId], references: [user.id] }),
  images: many(image),
}));

export const imageRelations = relations(image, ({ one }) => ({
  imageSet: one(imageSet, {
    fields: [image.imageSetId],
    references: [imageSet.id],
  }),
}));

export const puzzleRelations = relations(puzzle, ({ one }) => ({
  site: one(site, { fields: [puzzle.siteId], references: [site.id] }),
  imageSet: one(imageSet, {
    fields: [puzzle.imageSetId],
    references: [imageSet.id],
  }),
}));
