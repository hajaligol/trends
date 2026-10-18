import { describe, expect, it } from "vitest";
import { MAX_REVIEW_REPLY_LENGTH, reviewReplySchema } from "@/lib/validation/admin";

const reviewId = "3f2b8a52-6c1e-4f6e-9a1d-0d1c2b3a4e5f";

describe("reviewReplySchema", () => {
  it("accepts and trims a save reply", () => {
    const parsed = reviewReplySchema.parse({ intent: "save", reviewId, reply: "  ممنون از نظر شما  " });
    expect(parsed).toMatchObject({ intent: "save", reply: "ممنون از نظر شما" });
  });
  it("rejects empty / whitespace-only / too-long replies", () => {
    expect(reviewReplySchema.safeParse({ intent: "save", reviewId, reply: "   " }).success).toBe(false);
    expect(reviewReplySchema.safeParse({ intent: "save", reviewId, reply: "a".repeat(MAX_REVIEW_REPLY_LENGTH + 1) }).success).toBe(false);
  });
  it("allows delete without text and rejects bad ids / intents", () => {
    expect(reviewReplySchema.safeParse({ intent: "delete", reviewId }).success).toBe(true);
    expect(reviewReplySchema.safeParse({ intent: "save", reviewId: "nope", reply: "x" }).success).toBe(false);
    expect(reviewReplySchema.safeParse({ intent: "other", reviewId }).success).toBe(false);
  });
});
