import NextAuth, {AuthOptions} from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import {isAdmin} from "@/utils/dynamo";

export const authOptions: AuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],
    callbacks: {
        async signIn({ user }) {
            if (!user?.email) {
                console.warn("Sign in failed: no email provided");
                return false; // reject login
            }

            const email = user.email;
            const authorized = await isAdmin(email);

            if (!authorized) {
                console.warn(`Unauthorized login attempt: ${email}`);
            }

            return authorized; // only allow login if admin
        },
        async session({ session }) {
            // optional: add isAdmin flag to session
            session.user.isAdmin = true;
            return session;
        },
    },
    pages: {
        signIn: "/auth/signin",
        error: "/auth/unauthorized", // redirect non-admins here
    },
}

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
