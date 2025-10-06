"use client"; // make it a client component for interactivity (optional)

import { useRouter } from "next/navigation";

export default function UnauthorizedPage() {
    const router = useRouter();

    const handleGoBack = () => {
        router.push("/");
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen text-center p-4 bg-gray-50">
            <h1 className="text-4xl font-bold mb-4 text-red-600">Access Denied</h1>
            <p className="text-lg max-w-md">
                You do not have permission to access this application. Only authorized administrators can log in.
            </p>
            <button
                onClick={handleGoBack}
                className="mt-6 px-6 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition"
            >
                Go back to Home
            </button>
        </div>
    );
}
