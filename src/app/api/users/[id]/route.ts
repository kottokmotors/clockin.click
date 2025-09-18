// /app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getUserById, updateUserStatus, client, USERS_TABLE } from "@/utils/dynamo";
import { DeleteItemCommand } from "@aws-sdk/client-dynamodb";

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

export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;
    const body = await req.json();
    const { status } = body;

    if (!["In", "Out"].includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    try {
        const updatedUser = await updateUserStatus(id, status);
        return NextResponse.json(updatedUser);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
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
