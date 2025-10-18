"use client";

import { useState, useRef, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface DatePickerProps {
    selectedDate: Date | undefined;
    setSelectedDate: (date: Date) => void;
}

const LOCAL_STORAGE_KEY = "report-selected-date";

export default function DatePicker({ selectedDate, setSelectedDate }: DatePickerProps) {
    const [showCalendar, setShowCalendar] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // 🧠 Load persisted date on mount
    useEffect(() => {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
            const parsed = new Date(saved);
            if (!isNaN(parsed.getTime())) {
                setSelectedDate(parsed);
            }
        }
    }, [setSelectedDate]);

    // 🗂️ Save selected date when it changes
    useEffect(() => {
        if (selectedDate) {
            localStorage.setItem(LOCAL_STORAGE_KEY, selectedDate.toISOString());
        }
    }, [selectedDate]);

    // 🚪 Close calendar when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowCalendar(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div ref={containerRef} className="relative inline-block">
            {/* Trigger Button */}
            <Button
                variant="outline"
                onClick={() => setShowCalendar((prev) => !prev)}
                className="w-48 justify-start text-left font-normal whitespace-nowrap"
            >
                {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
            </Button>

            {/* Animated Calendar Dropdown */}
            <AnimatePresence>
                {showCalendar && (
                    <motion.div
                        key="calendar"
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-50 mt-2 border rounded-lg p-3 bg-white shadow-lg min-w-[280px]"
                    >
                        <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) => {
                                if (date) setSelectedDate(date);
                                setShowCalendar(false);
                            }}
                            className="min-w-[280px]"
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
