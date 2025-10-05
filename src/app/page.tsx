"use client";

import { useState } from "react";
import { User } from "@/types/user"; // Use the centralized User type

export default function PinEntry() {
    const [pin, setPin] = useState("");
    const [user, setUser] = useState<User | null>(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, ""); // only numbers
        if (value.length <= 4) setPin(value);
        setError("");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (pin.length !== 4) {
            setError("Please enter a 4-digit PIN");
            return;
        }
        setLoading(true);
        setError("");
        try {
            const res = await fetch(`/api/users/by-pin?pin=${encodeURIComponent(pin)}`);
            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "User not found");
                setLoading(false);
                return;
            }
            const userData: User = await res.json();
            setUser(userData);
        } catch (err) {
            console.error(err);
            setError("Failed to fetch user");
        } finally {
            setLoading(false);
        }
    };

    const clearPin = () => {
        setPin("");
        setUser(null);
        setError("");
    };

    const handleClock = async (userId: string, newStatus: string, userType: string, clockedById: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/users/${userId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus, userType: userType, clockedById: clockedById}),
            });
            if (!res.ok) throw new Error("Failed to update status");

            // Refresh user state
            const refreshedUser: User = await fetch(`/api/users/${user?.userId}`).then((r) => r.json());
            setUser(refreshedUser);
        } catch (err) {
            console.error(err);
            setError("Failed to update status");
        } finally {
            setLoading(false);
        }
    };

    const canClockSelf =
        user &&
        user.roles.some((r) => ["staff", "learner", "volunteer", "guardian"].includes(r.toLowerCase()));

    const isGuardian = user?.roles.includes("guardian");
    const userType = user?.roles.includes("staff")
        ? "staff"
        : user?.roles.includes("volunteer")
            ? "volunteer"
            : "";

    return (
        <div className="flex flex-col items-center min-h-screen p-4 pt-20 bg-gray-100">
            {!user ? (
                <form onSubmit={handleSubmit} className="flex flex-col items-center space-y-4">
                    <h1 className="text-3xl font-bold mb-6">Enter Your PIN</h1>
                    <input
                        type="text"
                        inputMode="numeric"
                        pattern="\d*"
                        maxLength={4}
                        value={pin}
                        onChange={handleChange}
                        autoFocus
                        className="w-60 text-center text-5xl border rounded-md p-2 shadow focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    {error && <p className="text-red-500">{error}</p>}

                    <div className="flex space-x-2">
                        <button
                            type="button"
                            onClick={clearPin}
                            className="px-4 py-2 text-2xl bg-gray-300 rounded hover:bg-gray-400 text-black cursor-pointer"
                        >
                            Clear
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 w-35 text-2xl bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer"
                            disabled={loading}
                        >
                            {loading ? "Loading..." : "Lookup"}
                        </button>
                    </div>
                </form>
            ) : (
                <div className="bg-white p-6 rounded shadow text-center flex flex-col gap-4 items-center w-full max-w-md">
                    <h2 className="text-3xl font-semibold">
                        Welcome, {user.firstName} {user.lastName}!
                    </h2>
                    <p>Roles: {user.roles.join(", ")}</p>
                    {user.status && <p>Status: {user.status}</p>}

                    {canClockSelf && (
                        <div className="flex gap-4">
                            <button
                                onClick={() => handleClock(user.userId, "In", userType, user?.userId)}
                                className={`px-4 py-2 rounded text-white
                                                ${user.status?.toLowerCase() === "in"
                                    ? "bg-gray-400 cursor-not-allowed"
                                    : "bg-green-600 hover:bg-green-700"}`}
                                disabled={user.status?.toLowerCase() === "in"}
                            >
                                Clock In
                            </button>
                            <button
                                onClick={() => handleClock(user.userId, "Out", userType, user?.userId)}
                                className={`px-4 py-2 rounded text-white
                                                ${user.status?.toLowerCase() === "out"
                                    ? "bg-gray-400 cursor-not-allowed"
                                    : "bg-red-600 hover:bg-red-700"}`}
                                disabled={user.status?.toLowerCase() === "out"}
                            >
                                Clock Out
                            </button>
                        </div>
                    )}

                    {isGuardian && user.learners ? (
                        <div className="mt-4 w-full">
                            <h3 className="font-semibold mb-2">Your Learners</h3>
                            <ul className="space-y-2">
                                {user.learners.map((learner) => (
                                    <li
                                        key={learner.userId}
                                        className="flex justify-between items-center border text-2xl p-2 rounded"
                                    >
                    <span>
                      {learner.firstName} {learner.lastName} {learner.status ? `(${learner.status})` : ""}
                    </span>
                                        <div className="flex gap-8">
                                            <button
                                                onClick={() => handleClock(learner.userId, "In", "learner", user?.userId)}
                                                className={`px-2 py-1 rounded text-white
                                                ${learner.status?.toLowerCase() === "in"
                                                    ? "bg-gray-400 cursor-not-allowed"
                                                    : "bg-green-600 hover:bg-green-700"}`}
                                                disabled={learner.status?.toLowerCase() === "in"}
                                            >
                                                In
                                            </button>
                                            <button
                                                onClick={() => handleClock(learner.userId, "Out", "learner", user?.userId)}
                                                className={`px-2 py-1 rounded text-white
                                                ${learner.status?.toLowerCase() === "out"
                                                    ? "bg-gray-400 cursor-not-allowed"
                                                    : "bg-red-600 hover:bg-red-700"}`}
                                                disabled={learner.status?.toLowerCase() === "out"}
                                            >
                                                Out
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : null}

                    <button
                        type="button"
                        onClick={clearPin}
                        className="mt-4 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 text-black cursor-pointer"
                    >
                        Submit
                    </button>
                </div>
            )}
        </div>
    );
}
