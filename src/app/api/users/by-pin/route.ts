import { NextRequest, NextResponse } from "next/server";
import { getUserByPin } from "@/utils/dynamo";

export async function GET(req: NextRequest) {
    const pin = req.nextUrl.searchParams.get("pin");
    if (!pin) return NextResponse.json({ error: "Pin is required" }, { status: 400 });

    const user = await getUserByPin(pin);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json(user);
}
