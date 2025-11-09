export const maxDuration = 60;

import connectDB from "@/config/db";
import Chat from "@/models/Chat";
import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req) {
  console.log("📩 Incoming request to /api/chat/ai");

  try {
    const body = await req.text();
    console.log("📦 Raw body:", body);

    let chatId = null;
    let prompt = null;

    try {
      const parsed = JSON.parse(body);
      chatId = parsed.chatId;
      prompt = parsed.prompt;
    } catch (e) {
      console.error("❌ JSON parse error:", e);
      return NextResponse.json({ success: false, error: "Invalid JSON body" });
    }

    console.log("🧠 chatId:", chatId);
    console.log("💬 prompt:", prompt);

    if (!prompt) {
      return NextResponse.json({
        success: false,
        message: "Missing prompt",
      });
    }

    // ✅ Initialize OpenAI client
    if (!process.env.OPENAI_API_KEY) {
      console.error("❌ Missing OPENAI_API_KEY");
      return NextResponse.json({
        success: false,
        error: "Missing OPENAI_API_KEY in environment",
      });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    console.log("✅ OpenAI initialized");

    // ✅ Handle default owner chat
    if (!chatId || chatId === "owner-chat") {
      console.log("🟢 Using owner-chat mode");

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
      });

      const message = completion.choices?.[0]?.message || {
        role: "assistant",
        content: "No response generated.",
      };

      console.log("✅ AI response:", message);
      return NextResponse.json({ success: true, data: message });
    }

    // ✅ MongoDB handling
    console.log("🧩 Connecting to MongoDB...");
    await connectDB();
    console.log("✅ MongoDB connected");

    const data = await Chat.findById(chatId);
    if (!data) {
      console.error("❌ Chat not found in DB");
      return NextResponse.json({
        success: false,
        message: "Chat not found",
      });
    }

    console.log("📝 Adding user message to chat");
    const userPrompt = {
      role: "user",
      content: prompt,
      timestamp: Date.now(),
    };
    data.messages.push(userPrompt);

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const message = completion.choices?.[0]?.message || {
      role: "assistant",
      content: "No response generated.",
    };
    message.timestamp = Date.now();

    console.log("💾 Saving to DB");
    data.messages.push(message);
    await data.save();

    console.log("✅ Chat updated successfully");
    return NextResponse.json({ success: true, data: message });
  } catch (error) {
    console.error("❌ AI route error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Server error",
      stack: error.stack,
    });
  }
}
