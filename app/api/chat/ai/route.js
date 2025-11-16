// app/api/chat/ai/route.js

import { NextResponse } from "next/server";
import connectDB from "@/config/db";
import Chat from "@/models/Chat";
import { getAuth } from "@clerk/nextjs/server";

export const runtime = "edge"; // Faster & cheaper

export async function POST(req) {
  try {
    await connectDB();

    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ success: false, message: "Not authenticated" });
    }

    // Read form-data
    const form = await req.formData();
    const chatId = form.get("chatId");
    const prompt = form.get("prompt");
    const file = form.get("file");

    if (!chatId || !prompt) {
      return NextResponse.json({
        success: false,
        message: "Missing chatId or prompt",
      });
    }

    // Load chat (offline owner mode)
    let chat;
    if (chatId === "owner-chat") {
      chat = { _id: "owner-chat", userId, messages: [], save: () => {} };
    } else {
      chat = await Chat.findOne({ _id: chatId, userId });
      if (!chat) {
        return NextResponse.json({ success: false, message: "Invalid chat ID" });
      }
    }

    // Save user message
    chat.messages.push({
      role: "user",
      content: prompt,
      timestamp: Date.now(),
    });

    let assistantText = "";

    // ----------------------------------------------------------------------
    // IF IMAGE → USE MOONDREAM2 VISION MODEL
    // ----------------------------------------------------------------------
    if (file) {
      const bytes = await file.arrayBuffer();
      const base64Image = Buffer.from(bytes).toString("base64");

      const visionRes = await fetch(
        `https://router.huggingface.co/hf-inference/${process.env.HF_VISION_MODEL}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.HF_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: {
              image: base64Image,
              question: prompt,
            },
          }),
        }
      );

      const visionData = await visionRes.json();

      if (visionData.error) {
        console.error("HF Vision Error:", visionData);
        return NextResponse.json({ success: false, message: visionData.error });
      }

      assistantText =
        visionData.answer ||
        visionData.generated_text ||
        JSON.stringify(visionData);

    } else {
      // ----------------------------------------------------------------------
      // IF NO IMAGE → USE GROQ TEXT AI
      // ----------------------------------------------------------------------
      const groqRes = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: process.env.GROQ_MODEL,
            messages: [{ role: "user", content: prompt }],
          }),
        }
      );

      const groqData = await groqRes.json();

      if (groqData.error) {
        console.error("Groq Error:", groqData);
        return NextResponse.json({ success: false, message: groqData.error });
      }

      assistantText = groqData.choices[0].message.content;
    }

    // Save AI message
    const assistantMessage = {
      role: "assistant",
      content: assistantText,
      timestamp: Date.now(),
    };

    chat.messages.push(assistantMessage);

    if (chatId !== "owner-chat") {
      await chat.save();
    }

    return NextResponse.json({ success: true, data: assistantMessage });
  } catch (err) {
    console.error("AI route error:", err);
    return NextResponse.json({ success: false, message: err.message });
  }
        }
