import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { isStaffOrAdmin } from "@/domains/auth/roles";
import { searchProductsForPicker } from "@/domains/campaigns/admin-queries";

/** Product search for the campaign form's picker. Staff/admin only —
 * re-checked here, not assumed from the `/admin` layout gate. */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user || !isStaffOrAdmin(session.user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const q = new URL(request.url).searchParams.get("q") ?? "";
  const results = await searchProductsForPicker(q);
  return NextResponse.json({ products: results }, { headers: { "Cache-Control": "no-store" } });
}
