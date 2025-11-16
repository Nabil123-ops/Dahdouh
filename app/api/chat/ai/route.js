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

    const contentType = req.headers.get("content-type");

    let chatId, prompt, file = null;

    // 🟢 CASE 1: FormData (prompt + file)
    if (contentType && contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      chatId = form.get("chatId");
      prompt = form.get("prompt");
      file = form.get("file"); // File object
    } 
    // 🟢 CASE 2: JSON (text only)
    else {
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

    // Save user prompt message
    chat.messages.push({
      role: "user",
      content: file ? `📷 Image + ${prompt}` : prompt,
      timestamp: Date.now(),
    });

    // =====================================================
    // 🟣 1️⃣ IF IMAGE EXISTS → HuggingFace Vision (Moondream)
    // =====================================================

    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const base64Image = buffer.toString("base64");

      const hfResponse = await fetch(
        "https://router.huggingface.co/hf-inference",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.HUGGINGFACE_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: process.env.HUGGINGFACE_VISION_MODEL,
            inputs: {
              image: base64Image,
              question: prompt,
            },
          }),
        }
      );

      const hfData = await hfResponse.json();

      if (hfData.error) {
        return NextResponse.json({
          success: false,
          message: hfData.error,
        });
      }

      const aiText =
        hfData.generated_text ||
        hfData.answer ||
        hfData[0]?.generated_text ||
        JSON.stringify(hfData);

      const assistantMessage = {
        role: "assistant",
        content: aiText,
        timestamp: Date.now(),
      };

      chat.messages.push(assistantMessage);
      if (chatId !== "owner-chat") await chat.save();

      return NextResponse.json({
        success: true,
        data: assistantMessage,
      });
    }

    // =====================================================
    // 🔵 2️⃣ IF TEXT ONLY → Groq AI
    // =====================================================

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
      return NextResponse.json({
        success: false,
        message: groqData.error.message,
      });
    }

    const assistantMessage = {
      role: "assistant",
      content: groqData.choices[0].message.content,
      timestamp: Date.now(),
    };

    chat.messages.push(assistantMessage);
    if (chatId !== "owner-chat") await chat.save();

    return NextResponse.json({
      success: true,
      data: assistantMessage,
    });

  } catch (err) {
    console.error("❌ AI route error:", err);
    return NextResponse.json({
      success: false,
      message: err.message,
    });
  }
        }
