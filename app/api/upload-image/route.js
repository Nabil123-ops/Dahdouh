import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!file) {
      return NextResponse.json({
        success: false,
        message: "No file uploaded",
      });
    }

    // Convert file → buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create unique filename
    const fileName = `upload-${Date.now()}-${file.name}`;

    // Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Upload to Supabase
    const { data, error } = await supabase.storage
      .from("images")
      .upload(fileName, buffer, {
        contentType: file.type,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      return NextResponse.json({ success: false, message: error.message });
    }

    // Get public URL
    const { data: publicData } = supabase.storage
      .from("images")
      .getPublicUrl(fileName);

    return NextResponse.json({
      success: true,
      url: publicData.publicUrl,  // <--- THIS IS WHAT AI NEEDS
    });

  } catch (err) {
    console.error("Upload Error:", err);
    return NextResponse.json({ success: false, message: err.message });
  }
}
