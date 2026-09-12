import type { DefaultSession } from "next-auth";

/**
 * Extends NextAuth's built-in `Session`/`JWT`/`User` shapes with the
 * fields `src/lib/auth/config.ts`'s callbacks actually attach
 * (`id`, `mobile`, `role`). Without this, `session.user.role` etc. would
 * not type-check anywhere else in the app (Server Components, Server
 * Actions checking `role === "admin"` in a future phase).
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      mobile: string;
      role: "customer" | "staff" | "admin";
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    mobile: string;
    role: "customer" | "staff" | "admin";
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    mobile: string;
    role: "customer" | "staff" | "admin";
  }
}
