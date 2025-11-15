import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req) {
  try {
    // Create Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    // Read form data
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file uploaded" },
        { status: 400 }
      );
    }

    // Normalize filename (allow Arabic + English)
    const originalName = file.name || "file";
    const safeName = originalName
      .normalize("NFKD")
      .replace(/[^\p{L}\p{N}.\-_]/gu, "");

    // Fallback name if empty
    const finalName = safeName.length > 0 ? safeName : "file";

    // Final filename with timestamp
    const fileName = `${Date.now()}-${finalName}`;

    // Convert to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(process.env.SUPABASE_BUCKET)
      .upload(fileName, buffer, {
        contentType: file.type,
      });

    if (uploadError) {
      console.error("❌ Supabase Upload Error:", uploadError);
      return NextResponse.json(
        { success: false, error: "Upload failed" },
        { status: 500 }
      );
    }

    // Generate public URL
    const { data: urlData } = supabase.storage
      .from(process.env.SUPABASE_BUCKET)
      .getPublicUrl(fileName);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
    });

  } catch (err) {
    console.error("❌ Upload route error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
      }
