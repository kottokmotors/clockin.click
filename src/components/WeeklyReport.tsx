"use client";

import React, {useState, useEffect, useMemo, useCallback} from "react";
import {
    format,
    startOfWeek,
    endOfWeek,
    addDays,
    isSameDay,
    parseISO,
} from "date-fns";
import DatePicker from "@/components/DatePicker";
import AttendanceTable, { Column } from "@/components/AttendanceTable";
import { cn } from "@/lib/utils";
import DownloadCSVButton from "@/components/DownloadCsvButton";

type BaseUser = {
    userId: string;
    firstName: string;
    lastName: string;
    email?: string;
    userType: string;
};

type AttendanceRecord = {
    userId: string;
    dateTimeStamp: string;
    state: "IN" | "OUT";
};

type UserDayData = {
    day: Date;
    inTimes: string[];
    outTimes: string[];
    status: string;
    tooltip: string;
};

export default function WeeklyReport() {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [users, setUsers] = useState<BaseUser[]>([]);
    const [loading, setLoading] = useState(false);

    // Memoize weekStart and weekEnd to avoid rerender loops
    const weekStart = useMemo(() => startOfWeek(selectedDate, { weekStartsOn: 0 }), [selectedDate]);
    const weekEnd = useMemo(() => endOfWeek(selectedDate, { weekStartsOn: 0 }), [selectedDate]);

    // Days of the week
    const daysOfWeek = useMemo(
        () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
        [weekStart]
    );

    // Fetch users once
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/api/users?type=allClockable");
                const data = await res.json();
                setUsers(data);
            } catch (err) {
                console.error("Error fetching users:", err);
            }
        })();
    }, []);

    // Fetch attendance when week changes
    useEffect(() => {
        const fetchRecords = async () => {
            setLoading(true);
            try {
                const start = format(weekStart, "yyyy-MM-dd");
                const end = format(weekEnd, "yyyy-MM-dd");
                const res = await fetch(`/api/reports/attendance?start=${start}&end=${end}`);
                const data = await res.json();
                setRecords(data);
            } catch (err) {
                console.error("Error fetching weekly attendance:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchRecords();
    }, [weekStart, weekEnd]);

    // Precompute all user-day data to avoid recalculating per cell
    const userDayData = useMemo(() => {
        return users.map((user) => {
            const days: UserDayData[] = daysOfWeek.map((day) => {
                const dayRecords = records.filter(
                    (r) => r.userId === user.userId && isSameDay(parseISO(r.dateTimeStamp), day)
                );

                const inTimes = dayRecords
                    .filter((r) => r.state.toLowerCase() === "in")
                    .map((r) => format(parseISO(r.dateTimeStamp), "HH:mm"));

                const outTimes = dayRecords
                    .filter((r) => r.state.toLowerCase() === "out")
                    .map((r) => format(parseISO(r.dateTimeStamp), "HH:mm"));

                const status =
                    inTimes.length && outTimes.length
                        ? "Present"
                        : inTimes.length || outTimes.length
                            ? "Partial"
                            : "";

                const tooltip = [
                    inTimes.length ? `IN: ${inTimes.join(", ")}` : null,
                    outTimes.length ? `OUT: ${outTimes.join(", ")}` : null,
                ]
                    .filter(Boolean)
                    .join(" | ");

                return { day, inTimes, outTimes, status, tooltip };
            });

            return { user, days };
        });
    }, [users, records, daysOfWeek]);

    // Columns
    const columns = useMemo<Column<BaseUser>[]>(() => {
        const today = new Date();
        return [
            {
                key: "name",
                label: "Name",
                render: (user: BaseUser) => `${user.firstName} ${user.lastName}`,
                className: "font-medium whitespace-nowrap",
            },
            ...daysOfWeek.map((day, idx) => {
                const isToday = isSameDay(day, today);
                return {
                    key: format(day, "yyyy-MM-dd"),
                    label: format(day, "EEE MM/dd"),
                    render: (user: BaseUser) => {
                        const dayData = userDayData.find((d) => d.user.userId === user.userId)?.days[idx];
                        if (!dayData) return "";

                        return (
                            <span
                                className={cn(
                                    "block text-center font-medium rounded-md px-2 py-1 transition-colors",
                                    dayData.status === "Present"
                                        ? "bg-green-100 text-green-800"
                                        : dayData.status === "Partial"
                                            ? "bg-yellow-100 text-yellow-800"
                                            : "text-gray-500",
                                    isToday ? "ring-2 ring-blue-400 ring-inset" : ""
                                )}
                                title={dayData.tooltip || undefined}
                            >
                                {dayData.status || ""}
                            </span>
                        );
                    },
                    className: cn("text-center", isToday ? "bg-blue-50" : ""),
                    headerTitle: isToday ? "Today" : undefined,
                };
            }),
        ];
    }, [daysOfWeek, userDayData]);

    const csvRows = useMemo(() => {
        return userDayData.map(({ user, days }) => [
            `${user.firstName} ${user.lastName}`,
            ...days.map((d) => d.tooltip || d.status || ""),
        ]);
    }, [userDayData]);

    const handleDownloadCSV = useCallback(() => {
        if (!csvRows.length) return;

        const headers = ["Name", ...daysOfWeek.map((d) => format(d, "EEE MM/dd"))];

        const csvContent = [headers, ...csvRows]
            .map((row) => row.map((cell) => `"${cell ?? ""}"`).join(","))
            .join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `WeeklyReport_${format(weekStart, "yyyy-MM-dd")}_to_${format(weekEnd, "yyyy-MM-dd")}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }, [csvRows, daysOfWeek, weekStart, weekEnd]);


    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
                <DatePicker selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
                <span className="text-gray-600">
                    Week of {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
                </span>
                <DownloadCSVButton
                    columns={["Name", ...daysOfWeek.map((d) => format(d, "EEE MM/dd"))]}
                    rows={csvRows}
                    fileName={`WeeklyReport_${format(weekStart, "yyyy-MM-dd")}_to_${format(weekEnd, "yyyy-MM-dd")}.csv`}
                    className="flex items-center gap-2"
                    onClick={handleDownloadCSV}
                />
            </div>

            <AttendanceTable<BaseUser>
                data={users}
                columns={columns}
                loading={loading}
                emptyMessage="No users found."
            />
        </div>
    );
}
