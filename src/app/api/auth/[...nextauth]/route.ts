import NextAuth, {AuthOptions} from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import {getAdminLevel} from "@/utils/dynamo";

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
                return false; // must return boolean, not null
            }

            const email = user.email;
            const adminLevel = await getAdminLevel(email);

            if (!adminLevel) {
                console.warn(`Unauthorized login attempt: ${email}`);
                return false; // reject login
            }

            return true; // allow login
        },
        async session({ session }) {
            // optional: add isAdmin flag to session
            session.user.isAdmin = true;
            session.user.adminLevel = session.user.email ? await getAdminLevel(session.user.email) : null;
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
