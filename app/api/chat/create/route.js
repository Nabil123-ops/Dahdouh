import connectDB from "@/config/db";
import Chat from "@/models/Chat";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { userId } = getAuth(req);
    if (!userId) return NextResponse.json({ success: false, message: "User not authenticated" });

    await connectDB();

    const newChat = await Chat.create({
      userId,
      name: "New Chat",
      messages: [],
    });

    return NextResponse.json({ success: true, data: newChat });
  } catch (error) {
    console.error("❌ Create chat error:", error);
    return NextResponse.json({ success: false, error: error.message });
  }
}
