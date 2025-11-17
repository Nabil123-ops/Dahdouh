// app/api/chat/ai/route.js
"use server";

import { NextResponse } from "next/server";
import connectDB from "@/config/db";
import Chat from "@/models/Chat";
import { getAuth } from "@clerk/nextjs/server";

// 🔥 Groq client
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export async function POST(req) {
  try {
    // Connect DB
    await connectDB();

    // Get user session
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Get user message
    const { message } = await req.json();
    if (!message || message.trim() === "") {
      return NextResponse.json({
        success: false,
        message: "Message cannot be empty",
      });
    }

    // -----------------------------
    // 1. GROQ RESPONSE
    // -----------------------------
    const groqRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        messages: [
          { role: "system", content: "You are Dahdouh AI assistant." },
          { role: "user", content: message },
        ],
      }),
    });

    const groqData = await groqRes.json();

    if (!groqData?.choices?.[0]?.message?.content) {
      throw new Error("Groq API returned invalid format");
    }

    const groqReply = groqData.choices[0].message.content;

    // -----------------------------
    // 2. HUGGINGFACE IMAGE MODEL
    // (if message contains: "generate image")
    // -----------------------------
    let hfImage = null;

    if (message.toLowerCase().includes("generate image")) {
      const hfRes = await fetch(
        "https://api-inference.huggingface.co/models/stabilityai/sdxl",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.HUGGINGFACE_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ inputs: message }),
        }
      );

      if (!hfRes.ok) throw new Error("HuggingFace API error");

      const buffer = await hfRes.arrayBuffer();
      hfImage = Buffer.from(buffer).toString("base64");
    }

    // Save chat into DB
    await Chat.create({
      userId,
      message,
      reply: groqReply,
      image: hfImage || null,
    });

    return NextResponse.json({
      success: true,
      reply: groqReply,
      image: hfImage || null,
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err.message,
    });
  }
}