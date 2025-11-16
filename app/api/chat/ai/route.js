// app/api/chat/ai/route.js
import { NextResponse } from "next/server";
import connectDB from "@/config/db.js";
import Chat from "@/models/Chat.js";
import { getAuth } from "@clerk/nextjs/server";

export async function POST(req) {
  try {
    await connectDB();

    // --- AUTH ---
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({
        success: false,
        message: "Not authenticated",
      });
    }

    // --- READ JSON BODY ---
    const body = await req.json();
    const chatId = body.chatId;
    const prompt = body.prompt;
    const imageUrl = body.image || null; // Public Supabase URL

    if (!chatId || !prompt) {
      return NextResponse.json({
        success: false,
        message: "Missing chatId or prompt",
      });
    }

    // --- LOAD CHAT ---
    let chat;

    if (chatId === "owner-chat") {
      chat = { _id: "owner-chat", userId, messages: [], save: () => {} };
    } else {
      chat = await Chat.findOne({ _id: chatId, userId });
      if (!chat) {
        return NextResponse.json({
          success: false,
          message: "Invalid chat ID",
        });
      }
    }

    // --- SAVE USER MESSAGE ---
    chat.messages.push({
      role: "user",
      content: prompt,
      timestamp: Date.now(),
    });

    let aiResponseText = "";

    // =====================================================================
    // 🔵 1. VISION MODE → HuggingFace (Salesforce/blip-vqa-base)
    // =====================================================================
    if (imageUrl) {
      if (!process.env.HUGGINGFACE_TOKEN) {
        return NextResponse.json({
          success: false,
          message: "Missing HuggingFace Token",
        });
      }

      const visionRes = await fetch(
        `https://api-inference.huggingface.co/models/${process.env.HUGGINGFACE_VISION_MODEL}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.HUGGINGFACE_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: {
              image: imageUrl, // PUBLIC URL — BLIP supports this
              question: prompt,
            },
          }),
        }
      );

      if (!visionRes.ok) {
        const raw = await visionRes.text();
        console.error("HF Vision Error:", raw);

        return NextResponse.json({
          success: false,
          message: "HuggingFace vision model error. Check model name/token.",
        });
      }

      const visionData = await visionRes.json();

      aiResponseText =
        visionData.generated_text ||
        visionData[0]?.generated_text ||
        "I could not understand the image.";
    }

    // =====================================================================
    // 🔵 2. TEXT MODE → Groq
    // =====================================================================
    if (!imageUrl) {
      if (!process.env.GROQ_API_KEY) {
        return NextResponse.json({
          success: false,
          message: "Missing GROQ API Key",
        });
      }

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
        return NextResponse.json({
          success: false,
          message: groqData.error.message,
        });
      }

      aiResponseText = groqData.choices[0].message.content;
    }

    // =====================================================================
    // 🔵 SAVE ASSISTANT MESSAGE
    // =====================================================================
    const assistantMessage = {
      role: "assistant",
      content: aiResponseText,
      timestamp: Date.now(),
    };

    chat.messages.push(assistantMessage);

    if (chatId !== "owner-chat") await chat.save();

    // SUCCESS
    return NextResponse.json({
      success: true,
      data: assistantMessage,
    });
  } catch (err) {
    console.error("AI Route Error:", err);
    return NextResponse.json({
      success: false,
      message: err.message,
    });
  }
        }
