// app/api/chat/create/route.js
import { NextResponse } from "next/server";
import connectDB from "@/config/db";
import Chat from "@/models/Chat";
import { getAuth } from "@clerk/nextjs/server";

export async function POST(req) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ success: false, message: "Not authenticated" });
    }

    await connectDB();

    const newChat = await Chat.create({
      name: "New Chat",
      userId,
      messages: []
    });

    return NextResponse.json({
      success: true,
      data: newChat,
    });
  } catch (err) {
    console.error("❌ Create chat error:", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
      }
