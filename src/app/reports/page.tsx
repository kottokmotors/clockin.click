'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    format,
    parseISO,
    differenceInMinutes,
    startOfWeek,
    endOfWeek,
} from 'date-fns';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Download,
    Search,
    BarChart3,
    Table,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import DatePicker from "@/components/DatePicker";
import { TimeAttendanceRecord } from '@/types/attendance'

export default function AttendanceReportPage() {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [records, setRecords] = useState<TimeAttendanceRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'daily' | 'weekly'>('daily');

    const [userFilter, setUserFilter] = useState('');
    const [userTypeFilter, setUserTypeFilter] = useState('staff');

    // Fetch records (you can optimize by caching later)
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

// ---------------- Filter and Sort ----------------
    const filteredRecords = useMemo(() => {
        let result = [...records];
        if (userFilter.trim()) {
            const query = userFilter.toLowerCase();
            result = result.filter((r) => {
                const userName = r.user
                    ? `${r.user.FirstName} ${r.user.LastName}`.toLowerCase()
                    : '';
                const clockedByName = r.clockedBy
                    ? `${r.clockedBy.firstName} ${r.clockedBy.lastName}`.toLowerCase()
                    : '';
                return userName.includes(query) || clockedByName.includes(query);
            });
        }

        console.log(result)
        return result.sort(
            (a, b) =>
                new Date(a.dateTimeStamp).getTime() - new Date(b.dateTimeStamp).getTime()
        );
    }, [records, userFilter, userTypeFilter]);

// ---------------- Daily Aggregates ----------------
    const dailyAgg = useMemo(() => {
        const totalTransactions = filteredRecords.length;
        const userSessions: Record<string, number> = {};

        const byUser: Record<string, AttendanceRecord[]> = {};
        filteredRecords.forEach((r) => {
            const userId = r.User?.UserId ?? '(unknown)';
            if (!byUser[userId]) byUser[userId] = [];
            byUser[userId].push(r);
        });

        Object.keys(byUser).forEach((userId) => {
            const entries = byUser[userId].sort(
                (a, b) => new Date(a.DateTimeStamp).getTime() - new Date(b.DateTimeStamp).getTime()
            );
            for (let i = 0; i < entries.length - 1; i += 2) {
                if (entries[i].State === 'IN' && entries[i + 1].State === 'OUT') {
                    const diff = differenceInMinutes(
                        parseISO(entries[i + 1].DateTimeStamp),
                        parseISO(entries[i].DateTimeStamp)
                    );
                    userSessions[userId] = (userSessions[userId] || 0) + diff;
                }
            }
        });

        const totalMinutes = Object.values(userSessions).reduce((a, b) => a + b, 0);
        const totalHours = (totalMinutes / 60).toFixed(2);
        return { totalTransactions, totalHours };
    }, [filteredRecords]);

// ---------------- Weekly Summary ----------------
    const weeklySummary = useMemo(() => {
        const start = startOfWeek(selectedDate, { weekStartsOn: 0 });
        const end = endOfWeek(selectedDate, { weekStartsOn: 0 });

        const userTotals: Record<string, number> = {};
        const allRecords = records.filter((r) => {
            const d = new Date(r.DateTimeStamp);
            return d >= start && d <= end;
        });

        const byUser: Record<string, AttendanceRecord[]> = {};
        allRecords.forEach((r) => {
            const userId = r.User?.UserId ?? '(unknown)';
            if (!byUser[userId]) byUser[userId] = [];
            byUser[userId].push(r);
        });

        Object.keys(byUser).forEach((userId) => {
            const entries = byUser[userId].sort(
                (a, b) => new Date(a.DateTimeStamp).getTime() - new Date(b.DateTimeStamp).getTime()
            );
            for (let i = 0; i < entries.length - 1; i += 2) {
                if (entries[i].State === 'IN' && entries[i + 1].State === 'OUT') {
                    const diff = differenceInMinutes(
                        parseISO(entries[i + 1].DateTimeStamp),
                        parseISO(entries[i].DateTimeStamp)
                    );
                    userTotals[userId] = (userTotals[userId] || 0) + diff;
                }
            }
        });

        return Object.entries(userTotals).map(([userId, mins]) => ({
            userId,
            totalHours: (mins / 60).toFixed(2),
        }));
    }, [records, selectedDate]);

// ---------------- CSV Export ----------------
    const exportCSV = () => {
        const csv = [
            ['User', 'State', 'Clocked By', 'DateTimeStamp', 'User Type'],
            ...filteredRecords.map((r) => [
                r.User ? `${r.User.FirstName} ${r.User.LastName}` : '(Unknown)',
                r.State,
                r.ClockedBy ? `${r.ClockedBy.FirstName} ${r.ClockedBy.LastName}` : '(System)',
                r.DateTimeStamp,
                r.UserType,
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
        <main className="p-6 max-w-6xl mx-auto space-y-6">
            <Card className="shadow-lg">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <CardTitle className="text-2xl font-semibold flex items-center gap-2">
                            {activeTab === 'daily' ? (
                                <>
                                    <Table className="w-5 h-5" /> Daily Attendance Report
                                </>
                            ) : (
                                <>
                                    <BarChart3 className="w-5 h-5" /> Weekly Summary
                                </>
                            )}
                        </CardTitle>

                        <div className="flex items-center gap-2">
                            <DatePicker
                                selectedDate={selectedDate}
                                setSelectedDate={setSelectedDate}
                            />
                            <Button onClick={exportCSV} className="flex items-center gap-2">
                                <Download className="w-4 h-4" /> Export CSV
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    <Tabs
                        value={activeTab}
                        onValueChange={(v) => setActiveTab(v as 'daily' | 'weekly')}
                        className="w-full"
                    >
                        <TabsList className="mb-4">
                            <TabsTrigger value="daily">Daily</TabsTrigger>
                            <TabsTrigger value="weekly">Weekly</TabsTrigger>
                        </TabsList>

                        {/* DAILY TAB */}
                        <TabsContent value="daily" className="space-y-4">
                            <div className="flex flex-wrap gap-3 items-center">
                                <div className="relative">
                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <Input
                                        placeholder="Filter by user..."
                                        value={userFilter}
                                        onChange={(e) => setUserFilter(e.target.value)}
                                        className="pl-8 w-56"
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
                                        <SelectItem value="guardian">Guardian</SelectItem>
                                        <SelectItem value="volunteer">Volunteer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="text-sm text-gray-500 flex gap-6">
                                <span>Total Transactions: {dailyAgg.totalTransactions}</span>
                                <span>Total Hours (est.): {dailyAgg.totalHours}</span>
                            </div>

                            {loading ? (
                                <p className="text-center text-gray-500 py-6">
                                    Loading records...
                                </p>
                            ) : filteredRecords.length === 0 ? (
                                <p className="text-center text-gray-500 py-6">
                                    No records found for this day.
                                </p>
                            ) : (
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
                                        {filteredRecords.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="text-center p-4 text-gray-500">
                                                    No records found for this day.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredRecords.map((r, i) => (
                                                <tr key={i} className="hover:bg-gray-50">
                                                    <td className="px-4 py-2 border">
                                                        {r.User
                                                            ? `${r.User.FirstName} ${r.User.LastName}`
                                                            : "(Unknown)"}
                                                    </td>
                                                    <td className="px-4 py-2 border">{r.State}</td>
                                                    <td className="px-4 py-2 border">
                                                        {r.ClockedBy
                                                            ? `${r.ClockedBy.FirstName} ${r.ClockedBy.LastName}`
                                                            : "(System)"}
                                                    </td>
                                                    <td className="px-4 py-2 border capitalize">{r.UserType}</td>
                                                    <td className="px-4 py-2 border">
                                                        {format(new Date(r.DateTimeStamp), "PPpp")}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </TabsContent>

                        {/* WEEKLY TAB */}
                        <TabsContent value="weekly">
                            {loading ? (
                                <p className="text-center text-gray-500 py-6">
                                    Loading records...
                                </p>
                            ) : weeklySummary.length === 0 ? (
                                <p className="text-center text-gray-500 py-6">
                                    No weekly data found.
                                </p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full border border-gray-200 text-sm">
                                        <thead className="bg-gray-100">
                                        <tr>
                                            <th className="px-4 py-2 border">User ID</th>
                                            <th className="px-4 py-2 border">Total Hours</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {weeklySummary.map((row, i) => (
                                            <tr key={i} className="hover:bg-gray-50">
                                                <td className="px-4 py-2 border">{row.userId}</td>
                                                <td className="px-4 py-2 border">
                                                    {row.totalHours}
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </main>
    );
}
