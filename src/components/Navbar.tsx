"use client";

import Link from "next/link";
import LoginButton from "./LoginButton";
import { useSession } from "next-auth/react";
import Image from "next/image";

export default function Navbar() {
    const { data: session } = useSession();

    return (
        <nav className="flex items-center justify-between bg-white drop-shadow-xl px-6 py-3">
            {/* Left side - App name / Logo */}
            <div className="text-xl font-bold text-gray-800">
                <Link href="/">
                    <Image
                        src={"/images/logo.png"}
                        alt={"School logo"}
                        width={250}
                        height={250}
                    />
                </Link>
            </div>

            {/* Center - Navigation links */}
            <div className="flex gap-6 text-gray-700">
                {session && (
                    <>
                        <Link href="/users" className="hover:text-blue-600">
                            User Management
                        </Link>
                        <Link href="/reports" className="hover:text-blue-600">
                            Reports
                        </Link>
                    </>
                )}
            </div>

            {/* Right side - Login / User */}
            <LoginButton />
        </nav>
    );
}
