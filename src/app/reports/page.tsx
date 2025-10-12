'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    format,
    parseISO,
    differenceInMinutes,
    startOfWeek,
    endOfWeek,
    addDays,
    isSameDay,
} from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
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
    CalendarIcon,
    Download,
    Search,
    BarChart3,
    Table,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

type AttendanceRecord = {
    UserId: string;
    State: string;
    ClockedBy: string;
    DateTimeStamp: string;
    UserTypeYearMonth: string;
};

export default function AttendanceReportPage() {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [showCalendar, setShowCalendar] = useState(false);
    const [activeTab, setActiveTab] = useState<'daily' | 'weekly'>('daily');

    const [userFilter, setUserFilter] = useState('');
    const [userTypeFilter, setUserTypeFilter] = useState('all');

    // Fetch records (you can optimize by caching later)
    useEffect(() => {
        const fetchRecords = async () => {
            setLoading(true);
            try {
                const formattedDate = format(selectedDate, 'yyyy-MM-dd');
                const res = await fetch(`/api/reports/attendance?date=${formattedDate}`);
                const data = await res.json();
                setRecords(data);
            } catch (err) {
                console.error('Error fetching attendance:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchRecords();
    }, [selectedDate]);

    // Filter and sort
    const filteredRecords = useMemo(() => {
        let result = [...records];

        if (userFilter.trim()) {
            const query = userFilter.toLowerCase();
            result = result.filter(
                (r) =>
                    r.UserId.toLowerCase().includes(query) ||
                    r.ClockedBy.toLowerCase().includes(query)
            );
        }

        if (userTypeFilter !== 'all') {
            result = result.filter((r) =>
                r.UserTypeYearMonth.startsWith(userTypeFilter)
            );
        }

        return result.sort(
            (a, b) =>
                new Date(a.DateTimeStamp).getTime() -
                new Date(b.DateTimeStamp).getTime()
        );
    }, [records, userFilter, userTypeFilter]);

    // Compute daily aggregates
    const dailyAgg = useMemo(() => {
        const totalTransactions = filteredRecords.length;
        const userSessions: Record<string, number> = {};

        const byUser: Record<string, AttendanceRecord[]> = {};
        filteredRecords.forEach((r) => {
            if (!byUser[r.UserId]) byUser[r.UserId] = [];
            byUser[r.UserId].push(r);
        });

        Object.keys(byUser).forEach((u) => {
            const entries = byUser[u].sort(
                (a, b) =>
                    new Date(a.DateTimeStamp).getTime() -
                    new Date(b.DateTimeStamp).getTime()
            );
            for (let i = 0; i < entries.length - 1; i += 2) {
                if (entries[i].State === 'IN' && entries[i + 1].State === 'OUT') {
                    const diff = differenceInMinutes(
                        parseISO(entries[i + 1].DateTimeStamp),
                        parseISO(entries[i].DateTimeStamp)
                    );
                    userSessions[u] = (userSessions[u] || 0) + diff;
                }
            }
        });

        const totalMinutes = Object.values(userSessions).reduce((a, b) => a + b, 0);
        const totalHours = (totalMinutes / 60).toFixed(2);
        return { totalTransactions, totalHours };
    }, [filteredRecords]);

    // Compute weekly summary (aggregate by user)
    const weeklySummary = useMemo(() => {
        const start = startOfWeek(selectedDate, { weekStartsOn: 0 });
        const end = endOfWeek(selectedDate, { weekStartsOn: 0 });
        const days: Date[] = Array.from({ length: 7 }, (_, i) => addDays(start, i));

        const userTotals: Record<string, number> = {};
        const allRecords = records.filter((r) => {
            const d = new Date(r.DateTimeStamp);
            return d >= start && d <= end;
        });

        const byUser: Record<string, AttendanceRecord[]> = {};
        allRecords.forEach((r) => {
            if (!byUser[r.UserId]) byUser[r.UserId] = [];
            byUser[r.UserId].push(r);
        });

        Object.keys(byUser).forEach((userId) => {
            const entries = byUser[userId].sort(
                (a, b) =>
                    new Date(a.DateTimeStamp).getTime() -
                    new Date(b.DateTimeStamp).getTime()
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

    const exportCSV = () => {
        const csv = [
            ['UserId', 'State', 'ClockedBy', 'DateTimeStamp', 'UserTypeYearMonth'],
            ...filteredRecords.map((r) => [
                r.UserId,
                r.State,
                r.ClockedBy,
                r.DateTimeStamp,
                r.UserTypeYearMonth,
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
                            <Button
                                variant="outline"
                                onClick={() => setShowCalendar(!showCalendar)}
                                className="flex items-center gap-2"
                            >
                                <CalendarIcon className="w-4 h-4" />
                                {format(selectedDate, 'PPP')}
                            </Button>

                            <Button onClick={exportCSV} className="flex items-center gap-2">
                                <Download className="w-4 h-4" /> Export CSV
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    {showCalendar && (
                        <div className="border rounded-lg p-3 inline-block">
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
                    )}

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
                                        <SelectItem value="all">All Types</SelectItem>
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
                                <div className="overflow-x-auto">
                                    <table className="min-w-full border border-gray-200 text-sm">
                                        <thead className="bg-gray-100">
                                        <tr>
                                            <th className="px-4 py-2 border">Time</th>
                                            <th className="px-4 py-2 border">User ID</th>
                                            <th className="px-4 py-2 border">State</th>
                                            <th className="px-4 py-2 border">Clocked By</th>
                                            <th className="px-4 py-2 border">User Type</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {filteredRecords.map((r, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="px-4 py-2 border">
                                                    {format(
                                                        new Date(r.DateTimeStamp),
                                                        'h:mm:ss a'
                                                    )}
                                                </td>
                                                <td className="px-4 py-2 border">{r.UserId}</td>
                                                <td className="px-4 py-2 border">{r.State}</td>
                                                <td className="px-4 py-2 border">{r.ClockedBy}</td>
                                                <td className="px-4 py-2 border">
                                                    {r.UserTypeYearMonth.split('-')[0]}
                                                </td>
                                            </tr>
                                        ))}
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
