// app/api/chat/ai/route.js
import { NextResponse } from "next/server";
import connectDB from "@/config/db.js";
import Chat from "@/models/Chat.js";
import { getAuth } from "@clerk/nextjs/server";

export async function POST(req) {
  try {
    await connectDB();

    // Check user
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({
        success: false,
        message: "Not authenticated",
      });
    }

    // Read JSON ONLY (PromptBox uses axios JSON)
    const body = await req.json();
    const chatId = body.chatId;
    const prompt = body.prompt;
    const imageUrl = body.image || null; // <-- PUBLIC SUPABASE URL

    if (!chatId || !prompt) {
      return NextResponse.json({
        success: false,
        message: "Missing chatId or prompt",
      });
    }

    // Load chat
    let chat;

    if (chatId === "owner-chat") {
      chat = {
        _id: "owner-chat",
        userId,
        messages: [],
        save: () => {},
      };
    } else {
      chat = await Chat.findOne({ _id: chatId, userId });
      if (!chat) {
        return NextResponse.json({
          success: false,
          message: "Invalid chat ID",
        });
      }
    }

    // Save user message
    chat.messages.push({
      role: "user",
      content: prompt,
      timestamp: Date.now(),
    });

    let aiResponseText = "";

    // ---------------------------------------------------------
    // VISION MODE: IMAGE + TEXT --> HUGGINGFACE
    // ---------------------------------------------------------
    if (imageUrl) {
      const hfRes = await fetch(
        `https://router.huggingface.co/hf-inference/${process.env.HUGGINGFACE_VISION_MODEL}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.HUGGINGFACE_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: {
              image: imageUrl, // <-- PUBLIC URL (IMPORTANT)
              question: prompt,
            },
          }),
        }
      );

      const hfData = await hfRes.json();
      console.log("HF DATA =====>", hfData);

      if (hfData.error)
        return NextResponse.json({ success: false, message: hfData.error });

      aiResponseText =
        hfData.generated_text ||
        hfData[0]?.generated_text ||
        "I could not understand the image.";
    }

    // ---------------------------------------------------------
    // TEXT-ONLY MODE --> GROQ
    // ---------------------------------------------------------
    if (!imageUrl) {
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
        return NextResponse.json({
          success: false,
          message: groqData.error.message,
        });
      }

      aiResponseText = groqData.choices[0].message.content;
    }

    // Save AI message
    const assistantMessage = {
      role: "assistant",
      content: aiResponseText,
      timestamp: Date.now(),
    };

    chat.messages.push(assistantMessage);

    if (chatId !== "owner-chat") await chat.save();

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
