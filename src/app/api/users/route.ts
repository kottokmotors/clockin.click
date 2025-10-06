// /app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { putUser, client, USERS_TABLE, unmarshallUser } from "@/utils/dynamo";
import { User } from "@/types/user";
import { ScanCommand } from "@aws-sdk/client-dynamodb";

// -------------------- GET: fetch all users --------------------
export async function GET() {
    try {
        const result = await client.send(
            new ScanCommand({
                TableName: USERS_TABLE,
            })
        );

        const users: User[] = await Promise.all(
            (result.Items ?? [])
                .map(async (item) => {
                    return unmarshallUser(item);
                })
        );

        return NextResponse.json(users);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }
}

// -------------------- POST: create a new user --------------------
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Validate required fields
        const requiredFields = ["userId", "firstName", "lastName", "roles"];
        for (const field of requiredFields) {
            if (!body[field]) {
                return NextResponse.json({ error: `${field} is required` }, { status: 400 });
            }
        }

        const isGuardian = body.roles?.includes("guardian");

        const newUser: User = {
            userId: body.userId,
            firstName: body.firstName,
            lastName: body.lastName,
            roles: body.roles || [],
            email: body.email,
            pin: body.pin,
            status: body.status,
            lastClockTransaction: body.lastClockTransaction,
            adminLevel: body.adminLevel,
            ...(isGuardian ? { learners: body.learners || [] } : {}),
        };

        await putUser(newUser);

        return NextResponse.json(newUser, { status: 201 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    }
}
