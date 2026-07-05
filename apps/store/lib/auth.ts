import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { magicLink } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import { sendMagicLinkEmail } from "@/lib/email";
import * as authSchema from "@/lib/db/auth-schema";

const baseURL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema: authSchema }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL,
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendMagicLinkEmail(email, url);
      },
    }),
    nextCookies(),
  ],
});
