// app/api/tmp/route.js
import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get("filename");

    if (!filename) {
      return new Response("File not found", { status: 404 });
    }

    const filePath = path.join("/tmp", filename);
    const fileBuffer = await readFile(filePath);

    return new Response(fileBuffer, {
      headers: {
        "Content-Type": "image/jpeg",
      },
    });
  } catch (e) {
    return new Response("Error reading file", { status: 500 });
  }
}
