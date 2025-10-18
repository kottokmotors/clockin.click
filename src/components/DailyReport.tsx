"use client";

import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DatePicker from "@/components/DatePicker";
import AttendanceTable from "@/components/AttendanceTable";
import DownloadCSVButton from "@/components/DownloadCsvButton";

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
                <DownloadCSVButton
                    columns={['User', 'State', 'Clocked By', 'DateTimeStamp', 'User Type']}
                    rows={filtered.map((r) => [
                        r.user ? `${r.user.firstName} ${r.user.lastName}` : "(Unknown)",
                        r.state,
                        r.clockedByUser ? `${r.clockedByUser.firstName} ${r.clockedByUser.lastName}` : "(System)",
                        r.dateTimeStamp,
                        userTypeFilter,
                    ])}
                    fileName={`attendance-${format(selectedDate, "yyyy-MM-dd")}.csv`}
                    className="flex items-center gap-2"
                />

            </div>

            <div className="overflow-x-auto border rounded-lg">

                <AttendanceTable
                    data={filtered}
                    loading={loading}
                    columns={[
                        {
                            key: "user",
                            label: "User",
                            render: (r) =>
                                r.user ? `${r.user.firstName} ${r.user.lastName}` : "(Unknown)",
                        },
                        {
                            key: "state",
                            label: "State",
                            render: (r) => (
                                <span
                                    className={`px-2 py-1 rounded font-semibold ${
                                        r.state?.toLowerCase() === "in"
                                            ? "bg-green-50 text-green-900"
                                            : r.state?.toLowerCase() === "out"
                                                ? "bg-red-50 text-red-900"
                                                : "bg-gray-50 text-gray-700"
                                    }`}
                                >
          {r.state}
        </span>
                            ),
                            className: "text-center",
                        },
                        {
                            key: "clockedByUser",
                            label: "Clocked By",
                            render: (r) =>
                                r.clockedByUser
                                    ? `${r.clockedByUser.firstName} ${r.clockedByUser.lastName}`
                                    : "(System)",
                        },
                        {
                            key: "userType",
                            label: "Type",
                            render: () => userTypeFilter,
                            className: "capitalize",
                        },
                        {
                            key: "dateTimeStamp",
                            label: "Timestamp",
                            render: (r) => format(new Date(r.dateTimeStamp), "PPpp"),
                        },
                    ]}
                />
            </div>
        </div>
    );
}
