// /app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getUserById, deleteUser, updateUser, getAllUsers } from "@/utils/dynamo";
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
            roles: Array.isArray(body.roles) ? body.roles : [],        // roles as string[]
            learners: Array.isArray(body.learners) ? body.learners : [], // learners as User[]
        };

        const updatedUser: User | null = await updateUser(id, allowedUpdates);

        return NextResponse.json({ success: true, user: updatedUser });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;

    try {
        // 1. Get the user to be deleted
        const user = await getUserById(id);
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // 2. Delete the user
        await deleteUser(id);

        // 3. If the deleted user was a learner, remove references from guardians
        if (user.roles.includes("learner")) {
            // Fetch all guardians
            const allUsers = await getAllUsers(); // implement according to your DB
            const guardians = allUsers.filter(
                (u) => u.roles.includes("guardian") && u.learners?.length
            );

            for (const guardian of guardians) {
                const updatedLearners = (guardian.learners ?? []).filter((l) => l.userId !== id);
                if (updatedLearners.length !== (guardian.learners?.length ?? 0)) {
                    await updateUser(guardian.userId, { learners: updatedLearners });
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Failed to delete user:", err);
        return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
    }
}
