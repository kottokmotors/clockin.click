"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export default function LoginButton() {
    const { data: session } = useSession();

    if (session) {
        return (
            <div className="flex items-center gap-4">
                <span className="text-gray-700">Hello, {session.user?.name}</span>
                <button
                    onClick={() => signOut()}
                    className="rounded bg-red-500 px-3 py-1 text-white"
                >
                    Sign out
                </button>
            </div>
        );
    }
    return (
        <button
            onClick={() => signIn("google")}
            className="rounded bg-blue-600 px-3 py-1 text-white"
        >
            Sign in
        </button>
    );
}
