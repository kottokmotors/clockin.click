import { useState, useEffect } from "react";
import { format, parseISO, setHours as dfSetHours, setMinutes as dfSetMinutes } from "date-fns";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

interface DateTimePickerProps {
    value: string; // ISO string
    onChange: (isoString: string) => void;
}

export default function DateTimePicker({ value, onChange }: DateTimePickerProps) {
    const initialDate = value ? parseISO(value) : new Date();

    // Internal state — decoupled from parent
    const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
    const [hourValue, setHourValue] = useState<number>(initialDate.getHours());
    const [minuteValue, setMinuteValue] = useState<number>(initialDate.getMinutes());

    // Update internal state when parent value changes
    useEffect(() => {
        const parsed = parseISO(value);
        if (!isNaN(parsed.getTime())) {
            setSelectedDate(parsed);
            setHourValue(parsed.getHours());
            setMinuteValue(parsed.getMinutes());
        }
    }, [value]);

    const handleApply = () => {
        const updated = dfSetHours(dfSetMinutes(selectedDate, minuteValue), hourValue);
        onChange(updated.toISOString());
    };

    const hours = Array.from({ length: 24 }, (_, i) => i);
    const minutes = Array.from({ length: 60 }, (_, i) => i);

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline">{format(parseISO(value), "yyyy-MM-dd HH:mm")}</Button>
            </PopoverTrigger>

            <PopoverContent className="w-80 p-4 space-y-4">
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                        if (date) setSelectedDate(date);
                    }}
                    className="w-full"
                />

                <div className="flex gap-2 justify-between">
                    <Select value={hourValue.toString()} onValueChange={(v) => setHourValue(Number(v))}>
                        <SelectTrigger className="w-20">
                            <SelectValue placeholder="Hour" />
                        </SelectTrigger>
                        <SelectContent>
                            {hours.map((h) => (
                                <SelectItem key={h} value={h.toString()}>
                                    {h.toString().padStart(2, "0")}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={minuteValue.toString()} onValueChange={(v) => setMinuteValue(Number(v))}>
                        <SelectTrigger className="w-20">
                            <SelectValue placeholder="Minute" />
                        </SelectTrigger>
                        <SelectContent>
                            {minutes.map((m) => (
                                <SelectItem key={m} value={m.toString()}>
                                    {m.toString().padStart(2, "0")}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <Button onClick={handleApply} className="w-full mt-2">
                    Apply
                </Button>
            </PopoverContent>
        </Popover>
    );
}
