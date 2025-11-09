export const maxDuration = 60;

import connectDB from "@/config/db";
import Chat from "@/models/Chat";
import { NextResponse } from "next/server";
import OpenAI from "openai";

// ✅ Use OpenAI key directly
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  try {
    const { chatId, prompt } = await req.json();

    if (!chatId || !prompt) {
      return NextResponse.json({
        success: false,
        message: "Missing chatId or prompt",
      });
    }

    // ✅ Handle default offline chat (no DB)
    if (chatId === "owner-chat") {
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
      });

      const message = completion.choices?.[0]?.message || {
        role: "assistant",
        content: "No response generated.",
      };

      return NextResponse.json({ success: true, data: message });
    }

    // ✅ Handle MongoDB chat
    await connectDB();
    const data = await Chat.findById(chatId);
    if (!data) {
      return NextResponse.json({
        success: false,
        message: "Chat not found in database",
      });
    }

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

    data.messages.push(message);
    await data.save();

    return NextResponse.json({ success: true, data: message });
  } catch (error) {
    console.error("❌ AI route error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Server error",
      details: error.stack,
    });
  }
}
