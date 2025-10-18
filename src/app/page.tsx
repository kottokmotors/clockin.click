"use client";

import { useState } from "react";
import { User } from "@/types/user";
import StatusBadge from "@/components/StatusBadge";

export default function PinEntry() {
    const [pin, setPin] = useState("");
    const [user, setUser] = useState<User | null>(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [selectedActions, setSelectedActions] = useState<
        { userId: string; status: "In" | "Out"; type: string; actorId: string }[]
    >([]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, "");
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
        setSelectedActions([]);
    };

    const toggleAction = (
        userId: string,
        status: "In" | "Out",
        type: string,
        actorId: string
    ) => {
        setSelectedActions((prev) => {
            const existing = prev.find((a) => a.userId === userId);
            if (existing?.status === status) {
                // deselect if same
                return prev.filter((a) => a.userId !== userId);
            }
            // replace if exists, otherwise add
            const others = prev.filter((a) => a.userId !== userId);
            return [...others, { userId, status, type, actorId }];
        });
    };

    const handleClockSubmit = async () => {
        if (selectedActions.length === 0) {
            setError("Please select at least one Clock In/Out action first.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            // Perform all updates in parallel
            await Promise.all(
                selectedActions.map(async (action) => {
                    const { userId, status, type, actorId } = action;
                    const res = await fetch(`/api/users/${userId}/status`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            status,
                            userType: type,
                            clockedById: actorId,
                        }),
                    });
                    if (!res.ok) throw new Error(`Failed to update ${userId}`);
                })
            );

            // Refresh after all updates
            if (user) {
                const refreshedUser: User = await fetch(`/api/users/${user.userId}`).then((r) =>
                    r.json()
                );
                setUser(refreshedUser);
            }

            setSelectedActions([]);
        } catch (err) {
            console.error(err);
            setError("One or more updates failed.");
        } finally {
            setLoading(false);
            clearPin();
            setUser(null);
        }
    };

    const canClockSelf =
        user && user.roles.some((r) => ["staff", "volunteer"].includes(r.toLowerCase()));

    const isGuardian = user?.roles.includes("guardian");
    const userType = user?.roles.includes("staff")
        ? "staff"
        : user?.roles.includes("volunteer")
            ? "volunteer"
            : "learner";

    const isSelected = (userId: string, status: "In" | "Out") =>
        selectedActions.some((a) => a.userId === userId && a.status === status);

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
                <div className="bg-white p-6 rounded shadow text-center flex flex-col gap-4 items-center w-full max-w-2xl">
                    <h2 className="text-3xl font-semibold">
                        Welcome, {user.firstName} {user.lastName}!
                    </h2>
                    <p>Roles: {user.roles.join(", ")}</p>
                    {user.status && (
                        <p className="text-gray-500 text-sm">
                            Current status: <StatusBadge status={user.status} />
                        </p>
                    )}

                    {/* SELF CLOCKING */}
                    {canClockSelf && (
                        <div className="flex gap-4">
                            <button
                                onClick={() =>
                                    toggleAction(user.userId, "In", userType, user.userId)
                                }
                                className={`px-6 py-3 text-xl font-semibold rounded ${
                                    isSelected(user.userId, "In")
                                        ? "bg-green-600 text-white"
                                        : "bg-gray-200 hover:bg-gray-300 border-green-600 border"
                                }`}
                            >
                                Clock In
                            </button>
                            <button
                                onClick={() =>
                                    toggleAction(user.userId, "Out", userType, user.userId)
                                }
                                className={`px-6 py-3 text-xl font-semibold rounded ${
                                    isSelected(user.userId, "Out")
                                        ? "bg-red-600 text-white"
                                        : "bg-gray-200 hover:bg-gray-300 border-red-600 border"
                                }`}
                            >
                                Clock Out
                            </button>
                        </div>
                    )}

                    {/* LEARNER CLOCKING */}
                    {isGuardian && (user.learners?.length ?? 0) > 0 && (
                        <div className="mt-4 w-full">
                            <h3 className="font-semibold mb-2">Your Learners</h3>
                            <ul className="space-y-2">
                                {user.learners?.map((learner) => (
                                    <li
                                        key={learner.userId}
                                        className="flex justify-between items-center border text-2xl p-2 rounded"
                                    >
                    <span>
                      {learner.firstName} {learner.lastName}{" "}
                        {learner.status ? (
                            <p className="text-gray-500 text-sm">
                                Current status: <StatusBadge status={learner.status} />
                            </p>
                        ) : (
                            ""
                        )}
                    </span>
                                        <div className="flex gap-4">
                                            <button
                                                onClick={() =>
                                                    toggleAction(learner.userId, "In", "learner", user.userId)
                                                }
                                                className={`px-4 py-2 rounded ${
                                                    isSelected(learner.userId, "In")
                                                        ? "bg-green-600 text-white"
                                                        : "bg-gray-200 hover:bg-gray-300 border-green-600 border"
                                                }`}
                                            >
                                                In
                                            </button>
                                            <button
                                                onClick={() =>
                                                    toggleAction(learner.userId, "Out", "learner", user.userId)
                                                }
                                                className={`px-4 py-2 rounded ${
                                                    isSelected(learner.userId, "Out")
                                                        ? "bg-red-600 text-white"
                                                        : "bg-gray-200 hover:bg-gray-300 border-red-600 border"
                                                }`}
                                            >
                                                Out
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* SUBMIT ALL */}
                    <button
                        onClick={handleClockSubmit}
                        disabled={loading || selectedActions.length === 0}
                        className="mt-4 px-6 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
                    >
                        {loading ? "Processing..." : "Submit All"}
                    </button>

                    <button
                        type="button"
                        onClick={clearPin}
                        className="mt-2 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 text-black cursor-pointer"
                    >
                        Back
                    </button>
                </div>
            )}
        </div>
    );
}
