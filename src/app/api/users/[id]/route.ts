// /app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getUserById, updateUserStatus, client, USERS_TABLE } from "@/utils/dynamo";
import { DeleteItemCommand } from "@aws-sdk/client-dynamodb";
import { User } from "@/types/user";

// -------------------- GET --------------------
export async function GET(
    req: NextRequest,
    context: { params: { id: string } }
) {
    const { id } = context.params;
    const user = await getUserById(id);
    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json(user);
}

// -------------------- PATCH --------------------
export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const userId = params.id;
    const body = await req.json();
    const { status } = body;

    if (!["In", "Out"].includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    try {
        // Update status in DynamoDB
        await updateUserStatus(userId, status);

        // Fetch the fresh user to return
        const updatedUser: User | null = await getUserById(userId);

        if (!updatedUser) {
            return NextResponse.json({ error: "User not found after update" }, { status: 404 });
        }

        return NextResponse.json(updatedUser);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
    }
}

// -------------------- DELETE --------------------
export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await client.send(
            new DeleteItemCommand({
                TableName: USERS_TABLE,
                Key: { UserId: { S: params.id } },
            })
        );
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
    }
}
