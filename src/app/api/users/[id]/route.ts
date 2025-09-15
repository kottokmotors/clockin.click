import { NextRequest, NextResponse } from "next/server";
import { getUserById } from "@/utils/dynamo";
import { DeleteItemCommand } from "@aws-sdk/client-dynamodb";
import { client, USERS_TABLE, updateUserStatus } from "@/utils/dynamo";

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const user = await getUserById(params.id);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json(user);
}

export async function PATCH(req: NextRequest, { params }: { params: { userId: string } }) {
    const userId = params.userId;
    const body = await req.json();
    const { status } = body;

    if (!["In", "Out"].includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    try {
        const updatedUser = await updateUserStatus(userId, status); // your dynamo utils
        return NextResponse.json(updatedUser);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    await client.send(
        new DeleteItemCommand({
            TableName: USERS_TABLE,
            Key: { UserId: { S: params.id } },
        })
    );
    return NextResponse.json({ success: true });
}
