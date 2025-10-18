import { DefaultSession } from "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            /** Add custom field */
            isAdmin?: boolean;
            adminLevel?: string | null;
        } & DefaultSession["user"];
    }
}