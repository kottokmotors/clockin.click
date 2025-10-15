import React from "react";
import {Spinner} from "./Spinner";

interface ClockButtonProps {
    userId: string;
    status: "In" | "Out";
    type: "learner" | "staff" | "volunteer";
    actorId: string;
    currentStatus?: string;
    loadingAction: string | null;
    handleClock: (userId: string, status: "In" | "Out", type: string, actorId: string) => Promise<void>;
    label?: string; // optional, defaults to status
}

export const ClockButton: React.FC<ClockButtonProps> = ({
                                                            userId,
                                                            status,
                                                            type,
                                                            actorId,
                                                            currentStatus,
                                                            loadingAction,
                                                            handleClock,
                                                            label,
                                                        }) => {
    const isLoading = loadingAction === `${userId}-${status}`;
    const isDisabled = currentStatus?.toLowerCase() === status.toLowerCase() || isLoading;

    const baseClasses = 'rounded flex items-center justify-center transition-all duration-200 px-4 py-2 text-white text-3xl';

    const bgClass =
        status === "In"
            ? isDisabled
                ? "bg-gray-400 cursor-not-allowed opacity-70 border-green-600 hover:border-green-700"
                : "bg-green-600 hover:bg-green-700"
            : isDisabled
                ? "bg-gray-400 cursor-not-allowed opacity-70 border-red-600 hover:border-red-700"
                : "bg-red-600 hover:bg-red-700";

    return (
        <button
            onClick={() => handleClock(userId, status, type, actorId)}
            className={`${baseClasses} ${bgClass}`}
            disabled={isDisabled}
        >
            {isLoading ? <Spinner /> : label || status}
        </button>
    );
};
