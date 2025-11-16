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

    // Read form-data (text + optional file)
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

    // Load chat (offline chat allowed)
    let chat;

    if (chatId === "owner-chat") {
      chat = {
        _id: "owner-chat",
        userId: userId,
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

    // Save user text
    chat.messages.push({
      role: "user",
      content: prompt,
      timestamp: Date.now(),
    });

    // Prepare Hugging Face input
    let hfBody;

    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const base64Img = buffer.toString("base64");

      hfBody = {
        inputs: {
          image: base64Img,
          question: prompt,
        },
      };
    } else {
      hfBody = {
        inputs: prompt,
      };
    }

    // Call HuggingFace API
    const hfRes = await fetch(
      `https://api-inference.huggingface.co/models/${process.env.HUGGINGFACE_VISION_MODEL}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.HUGGINGFACE_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(hfBody),
      }
    );

    const hfData = await hfRes.json();

    if (hfData.error) {
      console.error("❌ HuggingFace Error:", hfData);
      return NextResponse.json({
        success: false,
        message: hfData.error,
      });
    }

    // Extract text
    const assistantText =
      hfData.generated_text ||
      hfData[0]?.generated_text ||
      JSON.stringify(hfData);

    const assistantMessage = {
      role: "assistant",
      content: assistantText,
      timestamp: Date.now(),
    };

    chat.messages.push(assistantMessage);

    if (chatId !== "owner-chat") {
      await chat.save();
    }

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
}      };
    }

    // Call HuggingFace
    const resHF = await fetch(
      `https://api-inference.huggingface.co/models/${process.env.HUGGINGFACE_VISION_MODEL}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(hfBody),
      }
    );

    const hfData = await resHF.json();

    if (hfData.error) {
      console.error("❌ HuggingFace Error:", hfData);
      return NextResponse.json({
        success: false,
        message: hfData.error,
      });
    }

    const assistantText =
      hfData?.generated_text ||
      hfData?.[0]?.generated_text ||
      JSON.stringify(hfData);

    const assistantMessage = {
      role: "assistant",
      content: assistantText,
      timestamp: Date.now(),
    };

    chat.messages.push(assistantMessage);

    if (chatId !== "owner-chat") {
      await chat.save();
    }

    return NextResponse.json({
      success: true,
      data: assistantMessage,
    });
  } catch (err) {
    console.error("❌ AI route error:", err);
    return NextResponse.json({
      success
