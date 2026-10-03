"use client";

import { useEffect, type RefObject } from "react";

/**
 * After a failed submission, move focus to the first invalid field (or the
 * form-level alert) so keyboard and screen-reader users land on the problem.
 */
export function useFocusOnError(
  formRef: RefObject<HTMLFormElement | null>,
  state: { error?: string; fieldErrors?: Record<string, string> } | void,
) {
  useEffect(() => {
    if (!state) return;
    const form = formRef.current;
    if (!form) return;
    // Wait a frame so React has re-rendered aria-invalid / the alert.
    const id = requestAnimationFrame(() => {
      const invalid = form.querySelector<HTMLElement>('[aria-invalid="true"]');
      if (invalid) return invalid.focus();
      form.querySelector<HTMLElement>('[role="alert"]')?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [state, formRef]);
}
