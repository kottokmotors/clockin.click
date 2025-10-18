import { NextRequest, NextResponse } from "next/server";
import { putUser, getAllUsers, getUsersByRoles } from "@/utils/dynamo";
import { User } from "@/types/user";

// -------------------- GET: fetch users (with optional filtering) --------------------
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const rolesParam = searchParams.get("roles");
        const roles = rolesParam
            ? rolesParam.split(",").map((r) => r.trim().toLowerCase())
            : [];

        const users: User[] = roles.length
            ? await getUsersByRoles(roles)
            : await getAllUsers();

        return NextResponse.json(users);
    } catch (err) {
        console.error("Error fetching users:", err);
        return NextResponse.json(
            { error: "Failed to fetch users" },
            { status: 500 }
        );
    }
}

// -------------------- POST: create a new user --------------------
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const requiredFields = ["userId", "firstName", "lastName", "roles"];
        for (const field of requiredFields) {
            if (!body[field]) {
                return NextResponse.json(
                    { error: `${field} is required` },
                    { status: 400 }
                );
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
        return NextResponse.json({ success: true, user: newUser });
    } catch (err) {
        console.error("Error creating user:", err);
        return NextResponse.json(
            { error: "Failed to create user" },
            { status: 500 }
        );
    }
}
