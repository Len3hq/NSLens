import { pgTable, text, serial, timestamp, index, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export type PostAttachment = {
  // "image" / "video" come from direct file uploads (objectPath set).
  // "link" is a URL the user pasted; we may enrich it with og: metadata.
  // "file" is a generic upload that's not image/video.
  type: "image" | "video" | "link" | "file";
  // For uploaded files: object storage path like "/objects/uploads/abc".
  objectPath?: string;
  // For links: the user-supplied URL.
  url?: string;
  mimeType?: string;
  caption?: string;
  // Enriched metadata (populated server-side after the post is created).
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  // AI-generated description for images / link previews — used for retrieval.
  aiDescription?: string;
};

export const postsTable = pgTable(
  "posts",
  {
    id: serial("id").primaryKey(),
    authorId: text("author_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    attachments: jsonb("attachments").$type<PostAttachment[]>().notNull().default([]),
    // Combined searchable text: content + extracted attachment context. Used
    // by the fan-out matcher so a post with only an image still finds matches.
    searchableText: text("searchable_text"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("posts_author_idx").on(t.authorId)],
);

export type Post = typeof postsTable.$inferSelect;
export type InsertPost = typeof postsTable.$inferInsert;
