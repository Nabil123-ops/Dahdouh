// app/api/chat/ai/route.js
import { NextResponse } from "next/server";
import connectDB from "@/config/db";
import Chat from "@/models/Chat";
import { getAuth } from "@clerk/nextjs/server";

export async function POST(req) {
  try {
    await connectDB();

    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({
        success: false,
        message: "Not authenticated",
      });
    }

    // Get message from client
    const { prompt, image, chatId } = await req.json();

    if (!prompt || prompt.trim() === "") {
      return NextResponse.json({
        success: false,
        message: "Message cannot be empty",
      });
    }

    // -------------------------------
    // 1️⃣ CALL **GROQ**
    // -------------------------------
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "llama3-8b-8192",
        messages: [
          { role: "system", content: "You are Dahdouh AI assistant." },
          { role: "user", content: prompt },
        ],
      }),
    });

    const groqData = await groqRes.json();

    console.log("🔥 Groq Response:", groqData);

    if (!groqData?.choices?.[0]?.message?.content) {
      throw new Error("Groq API returned invalid format");
    }

    const reply = groqData.choices[0].message.content;

    // -------------------------------
    // 2️⃣ OPTIONAL: Huggingface image generation
    // -------------------------------
    let hfImage = null;

    if (prompt.toLowerCase().includes("generate image")) {
      const hfRes = await fetch(
        "https://api-inference.huggingface.co/models/stabilityai/sdxl",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.HUGGINGFACE_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ inputs: prompt }),
        }
      );

      const buffer = await hfRes.arrayBuffer();
      hfImage = Buffer.from(buffer).toString("base64");
    }

    // -------------------------------
    // 3️⃣ SAVE CHAT
    // -------------------------------
    await Chat.findByIdAndUpdate(chatId, {
      $push: {
        messages: {
          role: "assistant",
          content: reply,
          image: hfImage,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: { content: reply, image: hfImage },
    });

  } catch (err) {
    console.error("🔥 API ERROR:", err.message);
    return NextResponse.json({
      success: false,
      message: err.message,
    });
  }
}