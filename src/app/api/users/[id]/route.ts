// /app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getUserById, client, USERS_TABLE, updateUser } from "@/utils/dynamo";
import { DeleteItemCommand } from "@aws-sdk/client-dynamodb";
import {User} from "@/types/user";

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;
    const user = await getUserById(id);
    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json(user);
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    const body = await req.json();

    try {
        const allowedUpdates = {
            firstName: body.firstName,
            lastName: body.lastName,
            pin: body.pin,
            email: body.email,
            adminLevel: body.adminLevel,
        };

        const updatedUser: User | null = await updateUser(id, allowedUpdates);

        return NextResponse.json({ success: true, user: updatedUser });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;

    await client.send(
        new DeleteItemCommand({
            TableName: USERS_TABLE,
            Key: { UserId: { S: id } },
        })
    );

    return NextResponse.json({ success: true });
}
