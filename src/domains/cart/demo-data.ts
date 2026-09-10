/**
 * Demo-only cart contents for the Phase 2 cart drawer shell.
 * This is presentational filler, not real cart state — Phase 7
 * ("Wishlist + cart") replaces it with guest/authenticated cart domain
 * logic where the server calculates authoritative line values and totals
 * (see TRENDS_PROJECT_CONTEXT.md §4.3 "Server is authoritative").
 */

export type DemoCartItem = {
  id: string;
  name: string;
  price: string;
};

export const demoCartItems: DemoCartItem[] = [
  { id: "daily-hoodie", name: "هودی روزانه", price: "۶۹۰,۰۰۰ تومان" },
  { id: "minimal-sneaker", name: "کتانی مینیمال", price: "۷۹۰,۰۰۰ تومان" },
];

export const demoCartTotal = "۱,۴۸۰,۰۰۰ تومان";
