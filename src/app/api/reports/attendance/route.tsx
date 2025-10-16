import { NextResponse } from "next/server";
import {
    TIME_ATTENDANCE_TABLE,
    queryAllAttendance,
    batchGetUsersByIds,
    unmarshallTimeAttendance,
} from "@/utils/dynamo";

import {RawTimeAttendanceItem} from '@/types/attendance'


export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const dateParam = searchParams.get("date");
        const userTypeParam = searchParams.get("userType") || "staff";

        if (!dateParam) {
            return NextResponse.json(
                { error: "Missing ?date=YYYY-MM-DD" },
                { status: 400 }
            );
        }

        // Calculate start and end of day (UTC)
        const date = new Date(dateParam);
        const start = new Date(date.setUTCHours(0, 0, 0, 0)).toISOString();
        const end = new Date(date.setUTCHours(23, 59, 59, 999)).toISOString();

        const userTypeYearMonth = `${userTypeParam}#${dateParam.slice(0, 7)}`;

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

        // Query all pages
        const items = await queryAllAttendance<RawTimeAttendanceItem>(params);

        if (items.length === 0) {
            return NextResponse.json([]);
        }

        // Convert DynamoDB records → plain JS
        const records = items.map(unmarshallTimeAttendance);

        // Gather user IDs and hydrate user data
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
