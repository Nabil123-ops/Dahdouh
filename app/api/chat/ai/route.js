import connectDB from "@/config/db";
import Chat from "@/models/Chat";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const maxDuration = 60;

// 🧠 Use Groq API directly
export async function POST(req) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ success: false, message: "User not authenticated" });
    }

    const { chatId, prompt } = await req.json();
    if (!chatId || !prompt) {
      return NextResponse.json({ success: false, message: "Missing chatId or prompt" });
    }

    await connectDB();
    const data = await Chat.findOne({ userId, _id: chatId });
    if (!data) {
      return NextResponse.json({ success: false, message: "Chat not found" });
    }

    // Add the user’s message
    const userPrompt = { role: "user", content: prompt, timestamp: Date.now() };
    data.messages.push(userPrompt);

    // 🔥 Call Groq API
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: (process.env.GROQ_MODEL || "llama-3.1-8b-instant").trim(),
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const result = await response.json();

    if (result.error) {
      console.error("❌ Groq API Error:", result);
      return NextResponse.json({ success: false, message: result.error.message });
    }

    const message = result.choices?.[0]?.message || {
      role: "assistant",
      content: "No response received.",
    };
    message.timestamp = Date.now();

    data.messages.push(message);
    await data.save();

    return NextResponse.json({ success: true, data: message });
  } catch (error) {
    console.error("❌ Server error:", error);
    return NextResponse.json({ success: false, error: error.message });
  }
}
