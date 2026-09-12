import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { addresses, type Address, type NewAddress } from "@/lib/db/schema";

/**
 * The only sanctioned place for application code to read/write
 * `addresses` rows. Every function here takes `userId` and scopes its
 * query by it — this is the server-side ownership check
 * TRENDS_PROJECT_CONTEXT.md §6 "Checkout"/§11 requires ("Account
 * ownership checks exist"), not just hidden UI. There is no
 * `getAddressById(id)` without a `userId` — that shape would make it too
 * easy for a caller to accidentally skip the ownership check.
 */

export async function getAddressesForUser(userId: string): Promise<Address[]> {
  return db.select().from(addresses).where(eq(addresses.userId, userId)).orderBy(addresses.createdAt);
}

export async function getAddressForUser(addressId: string, userId: string): Promise<Address | null> {
  const [row] = await db
    .select()
    .from(addresses)
    .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)))
    .limit(1);
  return row ?? null;
}

export type AddressInput = Omit<NewAddress, "id" | "userId" | "createdAt" | "updatedAt">;

export async function createAddressForUser(userId: string, input: AddressInput): Promise<Address> {
  return db.transaction(async (tx) => {
    if (input.isDefault) {
      await tx.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, userId));
    }
    const [row] = await tx
      .insert(addresses)
      .values({ ...input, userId })
      .returning();
    if (!row) throw new Error("Address insert returned no row");
    return row;
  });
}

export async function updateAddressForUser(
  addressId: string,
  userId: string,
  input: AddressInput,
): Promise<Address | null> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: addresses.id })
      .from(addresses)
      .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)))
      .limit(1);
    if (!existing) return null;

    if (input.isDefault) {
      await tx.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, userId));
    }

    const [row] = await tx
      .update(addresses)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)))
      .returning();
    return row ?? null;
  });
}

/** Returns `true` if a row was actually deleted (i.e. it existed and
 * belonged to `userId`) — callers use this to distinguish "not found /
 * not yours" from a real failure. */
export async function deleteAddressForUser(addressId: string, userId: string): Promise<boolean> {
  const deleted = await db
    .delete(addresses)
    .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)))
    .returning({ id: addresses.id });
  return deleted.length > 0;
}
