"use client";

import React, { useEffect, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

type BaseUser = {
    userId: string;
    firstName: string;
    lastName: string;
    email?: string;
};

type AttendanceRecord = {
    user: BaseUser | null;
    clockedBy: BaseUser | null;
    state: string;
    dateTimeStamp: string;
    userType: string;
};

export default function DailyReport() {
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [showCalendar, setShowCalendar] = useState(false);
    const [query, setQuery] = useState("");

    useEffect(() => {
        const loadData = async () => {
            const dateStr = format(selectedDate, "yyyy-MM-dd");
            const res = await fetch(`/api/attendance?date=${dateStr}`);
            if (res.ok) {
                const data: AttendanceRecord[] = await res.json();
                setRecords(data);
            } else {
                setRecords([]);
            }
        };
        loadData();
    }, [selectedDate]);

    const filtered = records
        .filter((r) => {
            const q = query.toLowerCase();
            const userName = r.user
                ? `${r.user.firstName} ${r.user.lastName}`.toLowerCase()
                : "";
            const clockedByName = r.clockedBy
                ? `${r.clockedBy.firstName} ${r.clockedBy.lastName}`.toLowerCase()
                : "";
            return userName.includes(q) || clockedByName.includes(q);
        })
        .sort(
            (a, b) =>
                new Date(a.dateTimeStamp).getTime() -
                new Date(b.dateTimeStamp).getTime()
        );

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => setShowCalendar(!showCalendar)}>
                    {format(selectedDate, "PPP")}
                </Button>

                {showCalendar && (
                    <div className="border rounded-lg p-4 absolute z-50 bg-white shadow-lg">
                        <div className="w-[320px]">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={(date) => {
                                    if (date) setSelectedDate(date);
                                    setShowCalendar(false);
                                }}
                                initialFocus
                            />
                        </div>
                    </div>
                )}

                <Input
                    placeholder="Search name..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-60"
                />
            </div>

            <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full border-collapse text-sm">
                    <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-2 border text-left">User</th>
                        <th className="px-4 py-2 border text-left">State</th>
                        <th className="px-4 py-2 border text-left">Clocked By</th>
                        <th className="px-4 py-2 border text-left">Type</th>
                        <th className="px-4 py-2 border text-left">Timestamp</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filtered.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="text-center p-4 text-gray-500">
                                No records found for this day.
                            </td>
                        </tr>
                    ) : (
                        filtered.map((r, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                                <td className="px-4 py-2 border">
                                    {r.user
                                        ? `${r.user.firstName} ${r.user.lastName}`
                                        : "(Unknown)"}
                                </td>
                                <td className="px-4 py-2 border">{r.state}</td>
                                <td className="px-4 py-2 border">
                                    {r.clockedBy
                                        ? `${r.clockedBy.firstName} ${r.clockedBy.lastName}`
                                        : "(System)"}
                                </td>
                                <td className="px-4 py-2 border capitalize">{r.userType}</td>
                                <td className="px-4 py-2 border">
                                    {format(new Date(r.dateTimeStamp), "PPpp")}
                                </td>
                            </tr>
                        ))
                    )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
