// /components/UserStatus.tsx
"use client";

import { useState, useEffect } from "react";
import { fetchUser, fetchLearners } from "@/lib/api";
import { User } from "@/types/user";
import StatusBadge from "./StatusBadge";

interface UserStatusProps {
    userId: string;
}

export default function UserStatus({ userId }: UserStatusProps) {
    const [user, setUser] = useState<User | null>(null);
    const [learners, setLearners] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    const handleClock = async (targetUserId: string, newStatus: "In" | "Out") => {
        setLoading(true);
        try {
            const res = await fetch(`/api/users/${targetUserId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!res.ok) throw new Error("Failed to update status");

            // Refresh user & learners after update
            const refreshedUser: User = await fetchUser(userId);
            setUser(refreshedUser);

            if (refreshedUser.roles.includes("guardian")) {
                const refreshedLearners: User[] = await fetchLearners(userId);
                setLearners(refreshedLearners);
            }
        } catch (err) {
            console.error(err);
            alert("Failed to update status");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const userData: User = await fetchUser(userId);
                setUser(userData);

                if (userData.roles.includes("guardian")) {
                    const learnersData: User[] = await fetchLearners(userId);
                    setLearners(learnersData);
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [userId]);

    if (loading) return <div>Loading...</div>;
    if (!user) return <div>No user found</div>;

    const canClockSelf = user.roles.some((r) =>
        ["staff", "learner", "volunteer"].includes(r.toLowerCase())
    );

    const isClockedIn = user.status === "In";
    const isClockedOut = user.status === "Out";

    return (
        <div>
            <h2>
                {user.firstName} {user.lastName} <StatusBadge status={user.status} />
            </h2>

            {canClockSelf && (
                <div className="flex gap-2 my-2">
                    <button
                        onClick={() => handleClock(user.userId, "In")}
                        className={`px-4 py-2 rounded text-white ${
                            isClockedIn ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
                        }`}
                        disabled={isClockedIn || loading}
                    >
                        Clock In
                    </button>
                    <button
                        onClick={() => handleClock(user.userId, "Out")}
                        className={`px-4 py-2 rounded text-white ${
                            isClockedOut ? "bg-gray-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"
                        }`}
                        disabled={isClockedOut || loading}
                    >
                        Clock Out
                    </button>
                </div>
            )}

            {user.roles.includes("guardian") && learners.length > 0 && (
                <ul className="space-y-2 mt-4">
                    {learners.map((learner) => (
                        <li key={learner.userId} className="flex justify-between items-center border p-2 rounded">
              <span>
                {learner.firstName} {learner.lastName} <StatusBadge status={learner.status} />
              </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleClock(learner.userId, "In")}
                                    className={`px-2 py-1 rounded text-white ${
                                        learner.status === "In" ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
                                    }`}
                                    disabled={learner.status === "In" || loading}
                                >
                                    In
                                </button>
                                <button
                                    onClick={() => handleClock(learner.userId, "Out")}
                                    className={`px-2 py-1 rounded text-white ${
                                        learner.status === "Out" ? "bg-gray-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"
                                    }`}
                                    disabled={learner.status === "Out" || loading}
                                >
                                    Out
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
