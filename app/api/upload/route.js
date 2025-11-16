import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!file) {
      return NextResponse.json({ success: false, error: "No file received" });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileName = `uploads/${Date.now()}-${file.name}`;

    const { data, error } = await supabase.storage
      .from("images")
      .upload(fileName, fileBuffer, {
        contentType: file.type,
      });

    if (error) throw error;

    const publicUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL +
      `/storage/v1/object/public/images/${fileName}`;

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
