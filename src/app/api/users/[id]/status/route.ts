import { NextRequest, NextResponse } from "next/server";
import { updateUserStatus, logTimeClock } from "@/utils/dynamo";


export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;
    const body = await req.json();
    const { status, userType, clockedById } = body; // userType optional; fallback if you store it elsewhere

    if (!["In", "Out"].includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    try {
        // 1️⃣ Update user state in your app
        const updatedUser = await updateUserStatus(id, status);

        // 2️⃣ Log to DynamoDB
        await logTimeClock(id, userType || "Learner", status, clockedById);

        return NextResponse.json(updatedUser);
    } catch (err) {
        console.error(err);
        return NextResponse.json(
            { error: "Failed to update status or log timeclock" },
            { status: 500 }
        );
    }
}