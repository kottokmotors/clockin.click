import { NextResponse } from "next/server";
import {
    TIME_ATTENDANCE_TABLE,
    queryAllAttendance,
    batchGetUsersByIds,
    unmarshallTimeAttendance,
} from "@/utils/dynamo";
import { RawTimeAttendanceItem } from "@/types/attendance";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const dateParam = searchParams.get("date");
        const startParam = searchParams.get("start");
        const endParam = searchParams.get("end");
        const userTypeParam = searchParams.get("userType") || "staff";

        // --- Determine time range ---
        let start: string, end: string;
        if (startParam && endParam) {
            // Weekly / range query
            start = new Date(startParam).toISOString();
            end = new Date(endParam).toISOString();
        } else if (dateParam) {
            // Single day query (legacy support)
            const date = new Date(dateParam);
            start = new Date(date.setUTCHours(0, 0, 0, 0)).toISOString();
            end = new Date(date.setUTCHours(23, 59, 59, 999)).toISOString();
        } else {
            return NextResponse.json(
                { error: "Missing ?date=YYYY-MM-DD or ?start/end range" },
                { status: 400 }
            );
        }

        // --- Build key pattern for each month in range ---
        // DynamoDB keys use "UserTypeYearMonth" (e.g. staff#2025-10)
        // If the week crosses a month boundary, we need to query both
        const months: string[] = [];
        const startMonth = start.slice(0, 7);
        const endMonth = end.slice(0, 7);
        months.push(startMonth);
        if (endMonth !== startMonth) months.push(endMonth);

        const allItems: RawTimeAttendanceItem[] = [];

        for (const month of months) {
            const userTypeYearMonth = `${userTypeParam}#${month}`;
            const params = {
                TableName: TIME_ATTENDANCE_TABLE,
                KeyConditionExpression:
                    "#utym = :utym AND #ts BETWEEN :start AND :end",
                ExpressionAttributeNames: {
                    "#utym": "UserTypeYearMonth",
                    "#ts": "DateTimeStamp",
                },
                ExpressionAttributeValues: {
                    ":utym": { S: userTypeYearMonth },
                    ":start": { S: start },
                    ":end": { S: end },
                },
            };

            const items = await queryAllAttendance<RawTimeAttendanceItem>(params);
            allItems.push(...items);
        }

        if (allItems.length === 0) {
            return NextResponse.json([]);
        }

        // --- Unmarshall + enrich with user data ---
        const records = allItems.map(unmarshallTimeAttendance);
        const userIds = Array.from(
            new Set(records.flatMap((r) => [r.userId, r.clockedBy]))
        );
        const userMap = await batchGetUsersByIds(userIds);

        const enriched = records.map((r) => ({
            ...r,
            user: userMap.get(r.userId) ?? null,
            clockedByUser: userMap.get(r.clockedBy) ?? null,
        }));

        return NextResponse.json(enriched);
    } catch (err) {
        console.error("Error querying attendance:", err);
        const message =
            err instanceof Error ? err.message : "Unknown server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
