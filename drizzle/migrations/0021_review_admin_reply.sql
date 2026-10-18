ALTER TABLE "reviews" ADD COLUMN "admin_reply" text;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "admin_reply_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "admin_reply_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_admin_reply_by_user_id_users_id_fk" FOREIGN KEY ("admin_reply_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_admin_reply_length" CHECK ("reviews"."admin_reply" IS NULL OR char_length("reviews"."admin_reply") BETWEEN 1 AND 1000);