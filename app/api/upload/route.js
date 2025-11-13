import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!file) {
      return NextResponse.json({ success: false, error: "No file uploaded" });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const filePath = `uploads/${Date.now()}-${file.name}`;

    // Upload to Supabase REST API
    const uploadRes = await fetch(
      `${process.env.SUPABASE_URL}/storage/v1/object/${process.env.SUPABASE_BUCKET}/${filePath}`,
      {
        method: "POST",
        headers: {
          "Content-Type": file.type,
          Authorization: `Bearer ${process.env.SUPABASE_KEY}`,
        },
        body: fileBuffer
      }
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      return NextResponse.json({ success: false, error: err });
    }

    const publicURL = `${process.env.SUPABASE_URL}/storage/v1/object/public/${process.env.SUPABASE_BUCKET}/${filePath}`;

    return NextResponse.json({ success: true, url: publicURL });

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
