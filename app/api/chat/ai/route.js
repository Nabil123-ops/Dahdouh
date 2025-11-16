import { NextResponse } from "next/server";
import connectDB from "@/config/db";
import Chat from "@/models/Chat";
import { getAuth } from "@clerk/nextjs/server";

// HuggingFace Vision model (Moondream2)
const HF_MODEL = "vikhyatk/moondream2";
const HF_API = "https://router.huggingface.co/hf-inference";

export async function POST(req) {
  try {
    await connectDB();

    // Clerk authentication
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({
        success: false,
        message: "Not authenticated",
      });
    }

    // Read multipart form-data
    const formData = await req.formData();
    const chatId = formData.get("chatId");
    const prompt = formData.get("prompt");
    const file = formData.get("file");

    if (!chatId || !prompt) {
      return NextResponse.json({
        success: false,
        message: "Missing chatId or prompt",
      });
    }

    // Prepare chat object
    let chat;

    if (chatId === "owner-chat") {
      // Offline mode – no DB
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

    // Save user message locally
    chat.messages.push({
      role: "user",
      content: prompt,
      timestamp: Date.now(),
    });

    let assistantReply = "";

    // ============================
    // 📌 IF IMAGE EXISTS → Use HF Vision
    // ============================
    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const base64Image = buffer.toString("base64");

      const hfPayload = {
        inputs: {
          image: base64Image,
          question: prompt,
        },
      };

      const hfRes = await fetch(`${HF_API}/${HF_MODEL}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(hfPayload),
      });

      const hfData = await hfRes.json();

      if (hfData.error) {
        console.error("❌ HuggingFace Vision Error:", hfData);
        return NextResponse.json({
          success: false,
          message: hfData.error,
        });
      }

      assistantReply =
        hfData.generated_text ||
        hfData[0]?.generated_text ||
        "I analyzed the image, here are the results:\n" +
          JSON.stringify(hfData);
    }

    // ============================
    // 📌 IF NO IMAGE → Use Groq text
    // ============================
    else {
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
        console.error("❌ Groq API Error:", groqData);
        return NextResponse.json({
          success: false,
          message: groqData.error.message,
        });
      }

      assistantReply = groqData.choices[0].message.content;
    }

    // Save assistant message
    const assistantMessage = {
      role: "assistant",
      content: assistantReply,
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
          }
