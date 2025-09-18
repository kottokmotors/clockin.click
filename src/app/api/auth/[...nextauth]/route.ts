import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],
    callbacks: {
        async signIn() {
            // You can add DynamoDB user provisioning here later
            return true;
        },
        async jwt({ token, account, profile }) {
            if (account && profile) {
                token.role = "Staff"; // default role, override later
            }
            return token;
        },
        async session({ session, token }) {
            session.user.role = token.role as string | undefined;
            return session;
        },
    },
});

export { handler as GET, handler as POST };
