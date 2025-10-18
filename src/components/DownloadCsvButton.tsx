"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface DownloadCSVButtonProps {
    columns: string[];
    rows: (string | number | undefined)[][];
    fileName?: string;
    className?: string;
    onClick?: () => void;
}

export default function DownloadCSVButton({
                                              columns,
                                              rows,
                                              fileName = "export.csv",
                                              className,
                                              onClick,
                                          }: DownloadCSVButtonProps) {
    const handleDownload = () => {
        if (onClick) {
            onClick();
            return;
        }

        const csvContent = [columns, ...rows]
            .map((row) => row.map((cell) => `"${cell ?? ""}"`).join(","))
            .join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <Button onClick={handleDownload} className={className}>
            <Download className="w-4 h-4" /> Export CSV
        </Button>
    );
}
