import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * «تی‌مگ» (T-Mag), the store's fashion/style magazine.
 *
 * - `blog_categories`: flat topic list (not the product taxonomy; a magazine
 *   section such as «راهنمای سایز» has nothing to do with `categories`).
 * - `blog_posts`: one article. `content` is **Markdown** (GFM: tables, lists,
 *   images). It is rendered with `react-markdown` WITHOUT raw-HTML support, so
 *   stored text can never inject markup. `keyTakeaways` and `faq` are the
 *   structured, answer-first parts that search engines and AI answer engines
 *   (SEO/GEO) can quote; they also feed the JSON-LD.
 * - `blog_comments`: reader comments. Same trust model as product reviews:
 *   signed-in users only, `pending` until staff approve.
 *
 * Invariants kept in the database, not only in the actions:
 * - a published post always has `published_at`;
 * - slug is unique;
 * - comment length is bounded.
 */
export const blogPostStatusEnum = pgEnum("blog_post_status", ["draft", "published"]);
export const blogCommentStatusEnum = pgEnum("blog_comment_status", ["pending", "approved", "rejected"]);

export type BlogFaqItem = { question: string; answer: string };

export const blogCategories = pgTable(
  "blog_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    displayOrder: integer("display_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("blog_categories_slug_idx").on(table.slug)],
);

export const blogPosts = pgTable(
  "blog_posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    /** Short summary: list cards, meta description fallback, JSON-LD `description`. */
    excerpt: text("excerpt").notNull(),
    /** Markdown body. */
    content: text("content").notNull(),
    coverImageUrl: text("cover_image_url"),
    coverImageAlt: text("cover_image_alt"),
    categoryId: uuid("category_id").references(() => blogCategories.id, { onDelete: "set null" }),
    authorName: text("author_name").notNull().default("تحریریه ترندز"),
    status: blogPostStatusEnum("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    tags: text("tags").array().notNull().default([]),
    /** «خلاصه مقاله»: 3-6 short answer-first points shown above the body. */
    keyTakeaways: text("key_takeaways").array().notNull().default([]),
    /** Frequently asked questions shown below the body (+ FAQPage JSON-LD). */
    faq: jsonb("faq").$type<BlogFaqItem[]>().notNull().default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("blog_posts_slug_idx").on(table.slug),
    index("blog_posts_status_published_at_idx").on(table.status, table.publishedAt),
    index("blog_posts_category_id_idx").on(table.categoryId),
    index("blog_posts_tags_idx").using("gin", table.tags),
    check("blog_posts_published_has_date", sql`${table.status} <> 'published' OR ${table.publishedAt} IS NOT NULL`),
  ],
);

export const blogComments = pgTable(
  "blog_comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(() => blogPosts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    status: blogCommentStatusEnum("status").notNull().default("pending"),
    moderatedByUserId: uuid("moderated_by_user_id").references(() => users.id, { onDelete: "set null" }),
    moderatedAt: timestamp("moderated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("blog_comments_post_status_created_idx").on(table.postId, table.status, table.createdAt),
    index("blog_comments_status_idx").on(table.status),
    check("blog_comments_body_length", sql`char_length(${table.body}) BETWEEN 2 AND 1500`),
  ],
);

export const blogCategoriesRelations = relations(blogCategories, ({ many }) => ({
  posts: many(blogPosts),
}));

export const blogPostsRelations = relations(blogPosts, ({ one, many }) => ({
  category: one(blogCategories, { fields: [blogPosts.categoryId], references: [blogCategories.id] }),
  comments: many(blogComments),
}));

export const blogCommentsRelations = relations(blogComments, ({ one }) => ({
  post: one(blogPosts, { fields: [blogComments.postId], references: [blogPosts.id] }),
  user: one(users, { fields: [blogComments.userId], references: [users.id] }),
}));

export type BlogCategory = typeof blogCategories.$inferSelect;
export type BlogPost = typeof blogPosts.$inferSelect;
export type NewBlogPost = typeof blogPosts.$inferInsert;
export type BlogComment = typeof blogComments.$inferSelect;
