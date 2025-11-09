export const maxDuration = 60;

import connectDB from "@/config/db";
import Chat from "@/models/Chat";
import { NextResponse } from "next/server";
import OpenAI from "openai";

// ✅ Initialize DeepSeek or OpenAI API
const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

export async function POST(req) {
  try {
    // ✅ Parse request body
    const { chatId, prompt } = await req.json();

    if (!chatId || !prompt) {
      return NextResponse.json({
        success: false,
        message: "Missing chatId or prompt",
      });
    }

    // ✅ If it's the default "owner-chat", just simulate it
    if (chatId === "owner-chat") {
      const completion = await openai.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "deepseek-chat",
      });

      const message = completion.choices?.[0]?.message || {
        role: "assistant",
        content: "No response generated.",
      };

      return NextResponse.json({ success: true, data: message });
    }

    // ✅ Otherwise handle MongoDB chat
    await connectDB();
    const data = await Chat.findById(chatId);
    if (!data) {
      return NextResponse.json({
        success: false,
        message: "Chat not found in database",
      });
    }

    // ✅ Add user's message
    const userPrompt = {
      role: "user",
      content: prompt,
      timestamp: Date.now(),
    };
    data.messages.push(userPrompt);

    // ✅ Get AI reply
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "deepseek-chat",
    });

    const message = completion.choices?.[0]?.message || {
      role: "assistant",
      content: "No response generated.",
    };
    message.timestamp = Date.now();

    // ✅ Save assistant message to MongoDB
    data.messages.push(message);
    await data.save();

    return NextResponse.json({ success: true, data: message });
  } catch (error) {
    console.error("❌ AI route error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Server error",
    });
  }
}
