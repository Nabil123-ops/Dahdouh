"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { assets } from "@/assets/assets";

export default function PromptBox({ onSend }) {
  const [message, setMessage] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef(null);

  // Convert file to base64
  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  // When user uploads an image
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Preview image
    const previewURL = URL.createObjectURL(file);
    setImagePreview(previewURL);

    // Convert to base64
    const base64 = await convertToBase64(file);
    setImageBase64(base64);
  };

  // Send the message
  const handleSend = async () => {
    if (!message.trim() && !imageBase64) return;

    setLoading(true);

    const payload = {
      prompt: message,
      image: imageBase64 || null,
    };

    // Call parent function OR directly call API
    if (onSend) {
      await onSend(payload);
    } else {
      await fetch("/api/chat/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    }

    // Reset input
    setMessage("");
    setImagePreview(null);
    setImageBase64(null);
    setLoading(false);
  };

  // Handle Enter key
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full p-4 border-t bg-white flex items-center gap-3">

      {/* Upload Button */}
      <button
        onClick={() => fileInputRef.current.click()}
        className="p-2 rounded-lg hover:bg-gray-100"
      >
        <Image src={assets.gallery} alt="upload" width={24} height={24} />
      </button>

      <input
        type="file"
        accept="image/*"
        hidden
        ref={fileInputRef}
        onChange={handleFileSelect}
      />

      {/* Message Input */}
      <textarea
        className="flex-1 border rounded-xl px-4 py-2 resize-none min-h-[45px] max-h-[120px]"
        placeholder="Ask Dahdouh AI anything..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyPress}
      />

      {/* Send Button */}
      <button
        onClick={handleSend}
        disabled={loading}
        className="p-3 rounded-xl bg-black text-white hover:bg-gray-800 disabled:opacity-60"
      >
        {loading ? "..." : "Send"}
      </button>

      {/* Image Preview */}
      {imagePreview && (
        <div className="absolute bottom-20 left-4 bg-white shadow-lg p-2 rounded-xl">
          <Image
            src={imagePreview}
            alt="preview"
            width={80}
            height={80}
            className="rounded-lg"
          />
        </div>
      )}
    </div>
  );
}