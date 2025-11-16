// app/api/upload/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

export async function POST(req) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!file) {
      return NextResponse.json({ success: false, error: "No file" });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    const safeName =
      file.name.replace(/[^a-zA-Z0-9.\-_]/g, "") || "upload.jpg";
    const fileName = Date.now() + "-" + safeName;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error } = await supabase.storage
      .from(process.env.SUPABASE_BUCKET)
      .upload(fileName, buffer, {
        contentType: file.type,
      });

    if (error) {
      console.error("Upload Error:", error);
      return NextResponse.json({ success: false, error: error.message });
    }

    const { data } = supabase.storage
      .from(process.env.SUPABASE_BUCKET)
      .getPublicUrl(fileName);

    return NextResponse.json({ success: true, url: data.publicUrl });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
