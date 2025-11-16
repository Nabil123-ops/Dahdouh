// app/api/chat/ai/route.js
import { NextResponse } from "next/server";
import connectDB from "@/config/db.js";
import Chat from "@/models/Chat.js";
import { getAuth } from "@clerk/nextjs/server";

export async function POST(req) {
  try {
    await connectDB();

    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ success: false, message: "Not authenticated" });
    }

    // Detect multipart for images
    const contentType = req.headers.get("content-type") || "";

    let chatId, prompt, file;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      chatId = form.get("chatId");
      prompt = form.get("prompt");
      file = form.get("file");
    } else {
      const body = await req.json();
      chatId = body.chatId;
      prompt = body.prompt;
    }

    if (!chatId || !prompt) {
      return NextResponse.json({
        success: false,
        message: "Missing chatId or prompt",
      });
    }

    // Load chat
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

    // Save user message
    chat.messages.push({
      role: "user",
      content: prompt,
      timestamp: Date.now(),
    });

    let aiResponseText = "";

    // If file → Use HuggingFace Vision Model
    if (file) {
      const array = await file.arrayBuffer();
      const base64 = Buffer.from(array).toString("base64");

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
              image: base64,
              question: prompt,
            },
          }),
        }
      );

      const hfData = await hfRes.json();

      if (hfData.error) {
        console.error("HF error:", hfData);
        return NextResponse.json({ success: false, message: hfData.error });
      }

      aiResponseText =
        hfData.generated_text ||
        hfData[0]?.generated_text ||
        "No response from vision model.";
    }

    // If text only → Groq text model
    if (!file) {
      const groqRes = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: process.env.GROQ_MODEL,
            messages: [{ role: "user", content: prompt }],
          }),
        }
      );

      const groqData = await groqRes.json();

      if (groqData.error) {
        console.error("Groq error:", groqData);
        return NextResponse.json({
          success: false,
          message: groqData.error.message,
        });
      }

      aiResponseText = groqData.choices[0].message.content;
    }

    // Save AI response
    const assistantMessage = {
      role: "assistant",
      content: aiResponseText,
      timestamp: Date.now(),
    };

    chat.messages.push(assistantMessage);

    if (chatId !== "owner-chat") await chat.save();

    return NextResponse.json({ success: true, data: assistantMessage });

  } catch (err) {
    console.error("Route.js error:", err);
    return NextResponse.json({ success: false, message: err.message });
  }
  }
