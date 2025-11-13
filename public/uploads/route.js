import { writeFile } from "fs/promises";
import { NextResponse } from "next/server";
import path from "path";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ success: false, message: "No file found" });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const filePath = path.join(process.cwd(), "public", "uploads", file.name);
    await writeFile(filePath, buffer);

    const url = `/uploads/${file.name}`;
    return NextResponse.json({ success: true, url });
  } catch (err) {
    console.error("❌ Upload error:", err);
    return NextResponse.json({ success: false, message: err.message });
  }
}
