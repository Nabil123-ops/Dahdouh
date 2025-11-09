export const maxDuration = 60;

import connectDB from "@/config/db";
import Chat from "@/models/Chat";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { chatId, prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({
        success: false,
        message: "Missing prompt",
      });
    }

    // ✅ Handle default chat
    if (!chatId || chatId === "owner-chat") {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL || "llama3-70b-8192",
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("❌ Groq API Error:", data);
        return NextResponse.json({
          success: false,
          error: data.error?.message || "Groq API failed",
        });
      }

      const message = data.choices?.[0]?.message || {
        role: "assistant",
        content: "No response generated.",
      };

      return NextResponse.json({ success: true, data: message });
    }

    // ✅ Handle MongoDB chats (for logged users)
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

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "llama3-70b-8192",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const result = await response.json();
    const message = result.choices?.[0]?.message || {
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
    });
  }
}
