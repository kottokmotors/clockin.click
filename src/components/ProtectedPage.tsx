"use client";

import { useSession } from "next-auth/react";
import { useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";

export default function ProtectedPage({ children }: { children: ReactNode }) {
    const { status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === "unauthenticated") router.push("/");
    }, [status, router]);

    if (status === "loading") return <p>Loading...</p>;

    return <>{children}</>;
}
