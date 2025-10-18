import React from "react";
import {
    Table,
    TableHeader,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
} from "@/components/ui/table";

export type Column<T> = {
    key: string; // instead of keyof T
    label: string;
    render?: (item: T) => React.ReactNode;
    className?: string;
    headerTitle?: string;
};

interface AttendanceTableProps<T> {
    columns: Column<T>[];
    data: T[];
    loading?: boolean;
    emptyMessage?: string;
}

export default function AttendanceTable<T>({
                                               columns,
                                               data,
                                               loading = false,
                                               emptyMessage = "No records found",
                                           }: AttendanceTableProps<T>) {
    return (
        <div className="overflow-x-auto border rounded-lg">
            <Table>
                <TableHeader>
                    <TableRow>
                        {columns.map((col) => (
                            <TableHead
                                key={String(col.key)}
                                title={col.headerTitle} // <-- show tooltip on header
                                className={col.className}
                            >
                                {col.label}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {loading ? (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="text-center py-4 text-gray-500">
                                Loading...
                            </TableCell>
                        </TableRow>
                    ) : data.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="text-center py-4 text-gray-500">
                                {emptyMessage}
                            </TableCell>
                        </TableRow>
                    ) : (
                        data.map((item, idx) => (
                            <TableRow key={idx}>
                                {columns.map((col) => (
                                    <TableCell key={String(col.key)} className={col.className ?? "text-center"}>
                                        {typeof col.render === "function"
                                            ? col.render(item)
                                            : String((item as Record<string, unknown>)[col.key] ?? "")}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
