import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getServerSession } from "next-auth/next";


export const metadata = {
    title: "User Management - Admin",
};

/**
 * Enforces that the current session belongs to an admin user.
 * Redirects to /auth/signin if not signed in, or /auth/unauthorized if not admin.
 * @returns session object (with session.user.isAdmin)
 */
export default async function requireAdmin() {
    // 1️⃣ Get session
    const session = await getServerSession(authOptions);

    // 2️⃣ Redirect if not signed in
    if (!session?.user) {
        redirect("/");
    }

    // 3️⃣ Redirect if not an admin
    if (!session.user.isAdmin) {
        redirect("/auth/unauthorized");
    }

    return session;
};
