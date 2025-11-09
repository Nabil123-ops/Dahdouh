import connectDB from "@/config/db";
import Chat from "@/models/Chat";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

export async function POST(req) {
  try {
    const { userId } = getAuth(req);
    if (!userId) return NextResponse.json({ success: false, message: "User not authenticated" });

    const { chatId, name } = await req.json();
    if (!mongoose.Types.ObjectId.isValid(chatId))
      return NextResponse.json({ success: false, message: "Invalid chat ID" });

    await connectDB();
    await Chat.findOneAndUpdate({ userId, _id: chatId }, { name });

    return NextResponse.json({ success: true, message: "Chat renamed successfully" });
  } catch (error) {
    console.error("❌ Rename chat error:", error);
    return NextResponse.json({ success: false, error: error.message });
  }
}
