// app/api/chat/get/route.js
import { NextResponse } from "next/server";
import connectDB from "@/config/db";
import Chat from "@/models/Chat";
import { getAuth } from "@clerk/nextjs/server";

export async function GET(req) {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return NextResponse.json({ success: false, message: "Not authenticated" });
    }

    await connectDB();

    const chats = await Chat.find({ userId }).sort({ updatedAt: -1 });

    return NextResponse.json({
      success: true,
      data: chats,
    });
  } catch (err) {
    console.error("❌ Get chats error:", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
