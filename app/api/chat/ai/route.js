// app/api/chat/ai/route.js
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    // Read request body
    const body = await req.json();
    const { prompt, image } = body;

    if (!prompt || prompt.trim() === "") {
      return NextResponse.json(
        { success: false, message: "Prompt is required." },
        { status: 400 }
      );
    }

    // --- MODEL CONFIG ---
    const apiKey = process.env.GROQ_API_KEY;
    const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

    if (!apiKey) {
      return NextResponse.json(
        { success: false, message: "Missing GROQ_API_KEY" },
        { status: 500 }
      );
    }

    // --- BUILD REQUEST BODY FOR GROQ ---
    const messages = [
      {
        role: "user",
        content: prompt,
      },
    ];

    // If image is sent (base64)
    if (image) {
      messages.push({
        role: "user",
        content: [
          {
            type: "input_text",
            text: prompt,
          },
          {
            type: "input_image",
            image_url: image, // base64 string
          },
        ],
      });
    }

    // --- CALL GROQ API ---
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.6,
        max_tokens: 500,
      }),
    });

    const data = await response.json();

    // API error from Groq
    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: data.error?.message || "Groq API error",
        },
        { status: 500 }
      );
    }

    const aiMessage = data?.choices?.[0]?.message?.content || "No response";

    return NextResponse.json({
      success: true,
      reply: aiMessage,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message: err.message || "Server error",
      },
      { status: 500 }
    );
  }
}