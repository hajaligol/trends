import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { addresses, categories, users, wishlistItems, carts, cartItems, products } from "@/lib/db/schema";
import {
  createAddressForUser,
  deleteAddressForUser,
  getAddressForUser,
  updateAddressForUser,
} from "@/domains/addresses/queries";
import { addToWishlist, getWishlistedProductIds, removeFromWishlist } from "@/domains/wishlist/queries";
import { createCart, removeCartItem, updateCartItemQuantity, addItemToCart } from "@/domains/cart/queries";
import { createTestCategory, createTestProductWithVariant, createTestUser } from "./helpers";

/**
 * Server-side ownership checks — TRENDS_PROJECT_CONTEXT.md §11 ("Account
 * ownership checks exist") and §6 acceptance for Phase 6/7. Every
 * function under test here is documented as "structurally hard to skip
 * the ownership check" (no bare `getById`); this proves that holds for a
 * genuinely different user's id, not just by reading the comment.
 */

const createdUserIds: string[] = [];
const createdCategoryIds: string[] = [];
const createdProductIds: string[] = [];
const createdCartIds: string[] = [];

afterAll(async () => {
  for (const cartId of createdCartIds) await db.delete(cartItems).where(eq(cartItems.cartId, cartId));
  for (const cartId of createdCartIds) await db.delete(carts).where(eq(carts.id, cartId));
  for (const userId of createdUserIds) await db.delete(wishlistItems).where(eq(wishlistItems.userId, userId));
  for (const userId of createdUserIds) await db.delete(addresses).where(eq(addresses.userId, userId));
  for (const userId of createdUserIds) await db.delete(users).where(eq(users.id, userId));
  for (const productId of createdProductIds) await db.delete(products).where(eq(products.id, productId));
  for (const categoryId of createdCategoryIds) await db.delete(categories).where(eq(categories.id, categoryId));
});

const addressInput = {
  recipientName: "علی رضایی",
  recipientMobile: "+989123456789",
  province: "تهران",
  city: "تهران",
  addressLine: "خیابان ولیعصر، پلاک ۱۲۳",
  postalCode: "1234567890",
  plaqueUnitDetails: null,
  deliveryNotes: null,
  isDefault: false,
};

describe("address ownership", () => {
  it("a second user cannot read, update, or delete a first user's address", async () => {
    const owner = await createTestUser();
    createdUserIds.push(owner.id);
    const attacker = await createTestUser();
    createdUserIds.push(attacker.id);

    const address = await createAddressForUser(owner.id, addressInput);

    expect(await getAddressForUser(address.id, attacker.id)).toBeNull();

    const updateResult = await updateAddressForUser(address.id, attacker.id, {
      ...addressInput,
      recipientName: "نام جعلی",
    });
    expect(updateResult).toBeNull();

    const deleteResult = await deleteAddressForUser(address.id, attacker.id);
    expect(deleteResult).toBe(false);

    // The address is untouched, and the real owner can still manage it.
    const stillThere = await getAddressForUser(address.id, owner.id);
    expect(stillThere?.recipientName).toBe("علی رضایی");

    expect(await deleteAddressForUser(address.id, owner.id)).toBe(true);
  });

  it("setting a new address as default unsets the previous default for that user only", async () => {
    const userA = await createTestUser();
    createdUserIds.push(userA.id);
    const userB = await createTestUser();
    createdUserIds.push(userB.id);

    const addressA1 = await createAddressForUser(userA.id, { ...addressInput, isDefault: true });
    const addressB1 = await createAddressForUser(userB.id, { ...addressInput, isDefault: true });
    const addressA2 = await createAddressForUser(userA.id, { ...addressInput, isDefault: true });

    const a1After = await getAddressForUser(addressA1.id, userA.id);
    const a2After = await getAddressForUser(addressA2.id, userA.id);
    const b1After = await getAddressForUser(addressB1.id, userB.id);

    expect(a1After?.isDefault).toBe(false);
    expect(a2After?.isDefault).toBe(true);
    // User B's default is unaffected by user A's address changes.
    expect(b1After?.isDefault).toBe(true);
  });
});

describe("wishlist ownership and duplicate prevention", () => {
  it("wishlisting is scoped per user and adding the same product twice is idempotent", async () => {
    const category = await createTestCategory();
    createdCategoryIds.push(category.id);
    const { product } = await createTestProductWithVariant(category.id);
    createdProductIds.push(product.id);

    const userA = await createTestUser();
    createdUserIds.push(userA.id);
    const userB = await createTestUser();
    createdUserIds.push(userB.id);

    await addToWishlist(userA.id, product.id);
    await addToWishlist(userA.id, product.id); // duplicate add, should not throw or double-insert

    const userAWishlist = await getWishlistedProductIds(userA.id);
    const userBWishlist = await getWishlistedProductIds(userB.id);

    expect(userAWishlist).toEqual([product.id]);
    expect(userBWishlist).toEqual([]);

    // User B removing a product they never wishlisted is a safe no-op.
    await removeFromWishlist(userB.id, product.id);
    expect(await getWishlistedProductIds(userA.id)).toEqual([product.id]);

    await removeFromWishlist(userA.id, product.id);
    expect(await getWishlistedProductIds(userA.id)).toEqual([]);
  });
});

describe("cart item ownership", () => {
  it("cannot update or remove a cart item using the wrong cart id", async () => {
    const category = await createTestCategory();
    createdCategoryIds.push(category.id);
    const { product, variant } = await createTestProductWithVariant(category.id, { stock: 5 });
    createdProductIds.push(product.id);

    const userA = await createTestUser();
    createdUserIds.push(userA.id);
    const cartA = await createCart(userA.id);
    createdCartIds.push(cartA.id);
    await addItemToCart(cartA.id, variant.id, 1);

    const userB = await createTestUser();
    createdUserIds.push(userB.id);
    const cartB = await createCart(userB.id);
    createdCartIds.push(cartB.id);

    const [itemRow] = await db.select().from(cartItems).where(eq(cartItems.cartId, cartA.id));
    expect(itemRow).toBeDefined();

    // Attacker tries to manipulate cart A's line item by guessing its id
    // while operating "as" cart B.
    const updateResult = await updateCartItemQuantity(cartB.id, itemRow!.id, 99);
    expect(updateResult).toBe(false);

    const removeResult = await removeCartItem(cartB.id, itemRow!.id);
    expect(removeResult).toBe(false);

    // Untouched from the real cart's perspective.
    const [itemAfter] = await db.select().from(cartItems).where(eq(cartItems.id, itemRow!.id));
    expect(itemAfter?.quantity).toBe(1);
  });
});
