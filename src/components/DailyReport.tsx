"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { Download } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DatePicker from "@/components/DatePicker";

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
    clockedByUser: BaseUser | null;
};

const LOCAL_DATE_STORAGE_KEY = "report-selected-date";
const LOCAL_TYPE_STORAGE_KEY = "report-user-type";

export default function DailyReport() {


    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date>(() => {
        if (typeof window !== "undefined") {
            const savedDate = localStorage.getItem(LOCAL_DATE_STORAGE_KEY);
            if (savedDate) {
                const parsed = new Date(savedDate);
                if (!isNaN(parsed.getTime())) {
                    return parsed;
                }
            }
        }
        return new Date();
    });
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [userTypeFilter, setUserTypeFilter] = useState(() => {
        if (typeof window !== "undefined") {
            const savedType = localStorage.getItem(LOCAL_TYPE_STORAGE_KEY);
            if (savedType) {
                return savedType;
            }
        }
        return "staff";
    });

    useEffect(() => {
        const fetchRecords = async () => {
            setLoading(true);
            try {
                const formattedDate = format(selectedDate, 'yyyy-MM-dd');
                const res = await fetch(`/api/reports/attendance?date=${formattedDate}&userType=${userTypeFilter}`);
                const data = await res.json();
                setRecords(data);
            } catch (err) {
                console.error('Error fetching attendance:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchRecords();
    }, [selectedDate, userTypeFilter]);

    // ✅ Persist changes
    useEffect(() => {
        localStorage.setItem(LOCAL_DATE_STORAGE_KEY, selectedDate.toISOString());
    }, [selectedDate]);

    useEffect(() => {
        localStorage.setItem(LOCAL_TYPE_STORAGE_KEY, userTypeFilter);
    }, [userTypeFilter]);

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

    // ---------------- CSV Export ----------------
    const exportCSV = () => {
        const csv = [
            ['User', 'State', 'Clocked By', 'DateTimeStamp', 'User Type'],
            ...filtered.map((r) => [
                r.user ? `${r.user.firstName} ${r.user.lastName}` : '(Unknown)',
                r.state,
                r.clockedByUser ? `${r.clockedByUser?.firstName} ${r.clockedByUser?.lastName}` : '(System)',
                r.dateTimeStamp,
                userTypeFilter,
            ]),
        ]
            .map((row) => row.join(','))
            .join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance-${format(selectedDate, 'yyyy-MM-dd')}.csv`;
        a.click();
    };


    return (
        <div className="p-6 space-y-4">
            <div className="flex flex-wrap gap-3 items-center">

            </div>
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                    <DatePicker
                        selectedDate={selectedDate}
                        setSelectedDate={setSelectedDate}
                    />
                </div>

                <Select
                    value={userTypeFilter}
                    onValueChange={setUserTypeFilter}
                >
                    <SelectTrigger className="w-40">
                        <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="learner">Learner</SelectItem>
                        <SelectItem value="volunteer">Volunteer</SelectItem>
                    </SelectContent>
                </Select>

                <Input
                    placeholder="Search name..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-60"
                />
                <Button onClick={exportCSV} className="flex items-center gap-2">
                    <Download className="w-4 h-4" /> Export CSV
                </Button>
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
                    {loading ? (
                        <tr>
                            <td colSpan={5} className="text-center text-gray-500 py-4">
                                Loading records...
                            </td>
                        </tr>
                    ) : filtered.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="text-center p-4 text-gray-500">
                                No records found for this day.
                            </td>
                        </tr>
                    ) : (
                        filtered.map((r, i) => (
                            <tr
                                key={i}
                                className="hover:bg-gray-50 transition-all duration-500 ease-in-out"
                            >
                                <td className="px-4 py-2 border">
                                    {r.user
                                        ? `${r.user.firstName} ${r.user.lastName}`
                                        : "(Unknown)"}
                                </td>

                                {/* State cell — color-coded */}
                                <td
                                    className={`px-4 py-2 border font-semibold text-center rounded transition-all duration-500 ease-in-out
      ${
                                        r.state?.toLowerCase() === "in"
                                            ? "bg-green-50 text-green-900 hover:bg-green-200 border-green-300"
                                            : r.state?.toLowerCase() === "out"
                                                ? "bg-red-50 text-red-900 hover:bg-red-200 border-red-300"
                                                : "bg-gray-50 text-gray-700"
                                    }`}
                                >
                                    {r.state}
                                </td>

                                <td className="px-4 py-2 border">
                                    {r.clockedByUser
                                        ? `${r.clockedByUser.firstName} ${r.clockedByUser.lastName}`
                                        : "(System)"}
                                </td>

                                <td className="px-4 py-2 border capitalize">{userTypeFilter}</td>

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
