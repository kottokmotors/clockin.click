'use client';

import React, { useState } from 'react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    BarChart3,
    Table,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import DailyReport from "@/components/DailyReport";
import WeeklyReport from "@/components/WeeklyReport";

export default function AttendanceReportPage() {
    const [activeTab, setActiveTab] = useState<'daily' | 'weekly'>('daily');

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
                            <DailyReport />
                        </TabsContent>

                        {/* WEEKLY TAB */}
                        <TabsContent value="weekly">
                            <WeeklyReport />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </main>
    );
}
