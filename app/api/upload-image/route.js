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

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `upload-${Date.now()}-${file.name}`;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { error } = await supabase.storage
      .from(process.env.SUPABASE_BUCKET)
      .upload(fileName, buffer, { contentType: file.type });

    if (error) {
      console.error(error);
      return NextResponse.json({ success: false, message: error.message });
    }

    const { data: publicData } = supabase.storage
      .from(process.env.SUPABASE_BUCKET)
      .getPublicUrl(fileName);

    return NextResponse.json({
      success: true,
      url: publicData.publicUrl,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ success: false, message: err.message });
  }
}
