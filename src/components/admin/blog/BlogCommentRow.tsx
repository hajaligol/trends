"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { adminButton, Avatar, formatDateTime, StatusBadge } from "@/components/admin/ui/layout";
import { FormAlert, Spinner, useAdminAction } from "@/components/admin/ui/form";
import { CheckIcon, XIcon } from "@/components/ui/icons";
import { deleteBlogCommentAction, moderateBlogCommentAction } from "@/domains/blog/admin-actions";
import type { AdminBlogCommentRow } from "@/domains/blog/admin-queries";
import type { ActionResult } from "@/domains/auth/roles";
import { blogPostHref } from "@/domains/blog/paths";

const LABELS = { pending: "در انتظار بررسی", approved: "تأیید شده", rejected: "رد شده" } as const;
const TONES = { pending: "warning", approved: "success", rejected: "danger" } as const;
const initialState: ActionResult = { ok: true };

function Decision({ value, tone, children }: { value: "approved" | "rejected"; tone: "primary" | "secondary"; children: React.ReactNode }) {
  const { pending, data } = useFormStatus();
  return (
    <button type="submit" name="status" value={value} disabled={pending} className={adminButton(tone, "sm")}>
      {pending && data?.get("status") === value && <Spinner />}
      {children}
    </button>
  );
}

export function BlogCommentRow({ comment }: { comment: AdminBlogCommentRow }) {
  const router = useRouter();
  const [state, formAction] = useAdminAction(moderateBlogCommentAction, initialState, {
    successMessage: "وضعیت دیدگاه به‌روزرسانی شد",
    onSuccess: () => router.refresh(),
  });

  return (
    <article className={`flex flex-col gap-3 rounded-[var(--radius-lg)] border bg-white p-5 ${comment.status === "pending" ? "border-yellow" : "border-line"}`}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={comment.authorName ?? comment.authorMobile} />
          <div className="flex flex-col leading-tight">
            <span className="text-[0.9rem] font-semibold text-ink">{comment.authorName ?? "بدون نام"}</span>
            <span className="text-[0.76rem] text-text-secondary">{formatDateTime(comment.createdAt)}</span>
          </div>
        </div>
        <StatusBadge tone={TONES[comment.status]}>{LABELS[comment.status]}</StatusBadge>
      </header>

      <Link href={blogPostHref(comment.postSlug)} target="_blank" className="w-fit text-[0.8rem] text-brand hover:underline">
        {comment.postTitle}
      </Link>
      <p className="m-0 whitespace-pre-line text-[0.9rem] leading-7 text-ink/85">{comment.body}</p>

      <form action={formAction} className="flex flex-col gap-3 border-t border-line pt-3">
        <input type="hidden" name="commentId" value={comment.id} />
        <FormAlert state={state} />
        <div className="flex flex-wrap items-center gap-2.5">
          <Decision value="approved" tone="primary">
            <CheckIcon width={16} height={16} />
            تأیید و انتشار
          </Decision>
          <Decision value="rejected" tone="secondary">
            <XIcon width={16} height={16} />
            رد دیدگاه
          </Decision>
          <ConfirmButton
            action={() => deleteBlogCommentAction(comment.id)}
            label="حذف"
            confirmMessage="این دیدگاه برای همیشه حذف می‌شود."
            successMessage="دیدگاه حذف شد"
          />
        </div>
      </form>
    </article>
  );
}
