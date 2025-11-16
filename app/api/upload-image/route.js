// app/api/upload-image/route.js
import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({
        success: false,
        message: "No file uploaded",
      });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Create a unique filename
    const fileName = `upload-${Date.now()}-${file.name}`;
    const filePath = path.join("/tmp", fileName);

    // Save the image in Vercel temp folder
    await writeFile(filePath, buffer);

    // Create a public URL through Vercel File System API
    const publicUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/tmp?filename=${fileName}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: fileName,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({
      success: false,
      message: err.message,
    });
  }
}
