"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useFormStatus } from "react-dom";
import { submitBlogCommentAction } from "@/domains/blog/actions";
import type { ActionResult } from "@/domains/auth/roles";

const initialState: ActionResult = { ok: true };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-fit rounded-full bg-brand px-6 py-2.5 text-[0.92rem] font-semibold text-white transition-colors duration-200 hover:bg-brand-dark disabled:opacity-60"
    >
      {pending ? "در حال ارسال..." : "ثبت دیدگاه"}
    </button>
  );
}

/**
 * Comment form. The article page is statically cached, so whether the reader
 * is signed in is decided here on the client (`useSession`) rather than with
 * a server-side `auth()` call that would make the whole page dynamic. This is
 * only presentation: `submitBlogCommentAction` checks the session again.
 */
export function BlogCommentForm({ postSlug, loginHref }: { postSlug: string; loginHref: string }) {
  const { data: session, status } = useSession();
  const [state, formAction] = useActionState(
    async (_previous: ActionResult & { sent?: boolean }, formData: FormData) => {
      const result = await submitBlogCommentAction(_previous, formData);
      return { ...result, sent: result.ok };
    },
    { ok: true } as ActionResult & { sent?: boolean },
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.sent) formRef.current?.reset();
  }, [state]);

  if (status === "loading") return <div aria-hidden="true" className="h-[168px] rounded-[22px] bg-ink/5" />;

  if (!session?.user) {
    return (
      <p className="m-0 rounded-[22px] bg-benefit-bg px-5 py-6 text-[0.95rem] leading-8 text-text-secondary">
        برای ثبت دیدگاه، ابتدا{" "}
        <Link href={loginHref} className="font-semibold text-brand underline underline-offset-4">
          وارد حساب کاربری
        </Link>{" "}
        خود شوید.
      </p>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3 rounded-[22px] border border-line bg-white p-5">
      <input type="hidden" name="postSlug" value={postSlug} />
      <label htmlFor="blog-comment-body" className="text-[0.92rem] font-semibold text-ink">
        دیدگاه شما
      </label>
      <textarea
        id="blog-comment-body"
        name="body"
        required
        minLength={2}
        maxLength={1500}
        rows={4}
        className="w-full resize-y rounded-[14px] border border-line bg-bg px-4 py-3 text-[0.95rem] leading-7 text-ink focus:border-ink focus:outline-none"
        placeholder="نظر یا تجربه‌ی خود را بنویسید (درج لینک مجاز نیست)"
      />
      {!state.ok && (
        <p role="alert" className="m-0 rounded-[8px] bg-red-50 px-4 py-2.5 text-[0.85rem] text-red-700">
          {state.error}
        </p>
      )}
      {state.ok && state.sent && (
        <p role="status" className="m-0 rounded-[8px] bg-sage/40 px-4 py-2.5 text-[0.85rem] text-ink">
          دیدگاه شما ثبت شد و پس از بررسی نمایش داده می‌شود. سپاسگزاریم!
        </p>
      )}
      <Submit />
    </form>
  );
}
