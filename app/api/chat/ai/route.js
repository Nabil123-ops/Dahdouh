import { NextResponse } from "next/server";
import connectDB from "@/config/db";
import Chat from "@/models/Chat";
import { getAuth } from "@clerk/nextjs/server";

export async function POST(req) {
  try {
    await connectDB();

    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ success: false, message: "Not authenticated" });
    }

    const contentType = req.headers.get("content-type");

    let chatId, prompt, file = null;

    // 🟢 CASE 1: Multiform (image + text)
    if (contentType && contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      chatId = form.get("chatId");
      prompt = form.get("prompt");
      file = form.get("file");
    }
    // 🟢 CASE 2: JSON (normal text)
    else {
      const body = await req.json();
      chatId = body.chatId;
      prompt = body.prompt;
    }

    if (!chatId || !prompt) {
      return NextResponse.json({ success: false, message: "Missing chatId or prompt" });
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
        return NextResponse.json({ success: false, message: "Invalid chat ID" });
      }
    }

    // Save user message
    chat.messages.push({
      role: "user",
      content: prompt,
      timestamp: Date.now(),
    });

    // 🟢 Build HuggingFace input
    let hfPayload;

    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const base64Image = buffer.toString("base64");

      hfPayload = {
        inputs: {
          image: base64Image,
          question: prompt,
        },
      };
    } else {
      // Normal text message
      hfPayload = {
        inputs: prompt,
      };
    }

    // 🟢 Call HuggingFace Vision/Text Model
    const hfRes = await fetch(
      `https://api-inference.huggingface.co/models/${process.env.HUGGINGFACE_VISION_MODEL}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(hfPayload),
      }
    );

    const hfData = await hfRes.json();

    if (hfData.error) {
      return NextResponse.json({ success: false, message: hfData.error });
    }

    const aiText =
      hfData.generated_text ||
      hfData[0]?.generated_text ||
      hfData.answer ||
      JSON.stringify(hfData);

    const assistantMessage = {
      role: "assistant",
      content: aiText,
      timestamp: Date.now(),
    };

    chat.messages.push(assistantMessage);

    if (chatId !== "owner-chat") await chat.save();

    return NextResponse.json({ success: true, data: assistantMessage });
  } catch (err) {
    console.error("❌ AI route error:", err);
    return NextResponse.json({ success: false, message: err.message });
  }
  }
