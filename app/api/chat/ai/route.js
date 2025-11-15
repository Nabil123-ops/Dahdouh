// app/api/chat/ai/route.js
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

    const { chatId, prompt } = await req.json();

    if (!chatId || !prompt) {
      return NextResponse.json({ success: false, message: "Missing chatId or prompt" });
    }

    await connectDB();

    // 🔥 Validate ID
    let chat = await Chat.findOne({ _id: chatId, userId });

    if (!chat) {
      return NextResponse.json({ success: false, message: "Invalid chat ID" });
    }

    // Add user message
    chat.messages.push({
      role: "user",
      content: prompt,
      timestamp: Date.now(),
    });

    // AI CALL (GROQ)
    const aiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const aiData = await aiRes.json();

    if (aiData.error) {
      console.error("❌ Groq API Error:", aiData);
      return NextResponse.json({ success: false, message: aiData.error.message });
    }

    const assistantMessage = {
      role: "assistant",
      content: aiData.choices[0].message.content,
      timestamp: Date.now(),
    };

    chat.messages.push(assistantMessage);
    await chat.save();

    return NextResponse.json({
      success: true,
      data: assistantMessage,
    });

  } catch (err) {
    console.error("❌ AI route error:", err);
    return NextResponse.json({ success: false, message: err.message });
  }
                                   }
