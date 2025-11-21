"use client";

import { assets } from "@/assets/assets";
import { useAppContext } from "@/context/AppContext";
import axios from "axios";
import Image from "next/image";
import React, { useState, useRef } from "react";
import toast from "react-hot-toast";

const PromptBox = ({ isLoading, setIsLoading }) => {
  const [prompt, setPrompt] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef();

  const { user, chats, setChats, selectedChat, setSelectedChat } =
    useAppContext();

  // ========================================================
  // 1️⃣ PREVIEW ONLY (BLOB) — NOT SENT TO SERVER
  // ========================================================
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);

    const previewMsg = {
      role: "user",
      content: URL.createObjectURL(file), // <--- BLOB ONLY FOR PREVIEW
      isImage: true,
      timestamp: Date.now(),
    };

    setSelectedChat((prev) => ({
      ...prev,
      messages: [...prev.messages, previewMsg],
    }));

    setChats((prev) =>
      prev.map((c) =>
        c._id === selectedChat._id
          ? { ...c, messages: [...c.messages, previewMsg] }
          : c
      )
    );

    toast.success("Image added!");
  };

  // ========================================================
  // 2️⃣ UPLOAD TO SERVER → RETURN PUBLIC URL (SUPABASE)
  // ========================================================
  const uploadToServer = async () => {
    if (!selectedFile) return null;

    try {
      const form = new FormData();
      form.append("file", selectedFile);

      const res = await axios.post("/api/upload-image", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) return res.data.url;

      return null;
    } catch (err) {
      console.error("Upload error:", err);
      return null;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendPrompt(e);
    }
  };

  // ========================================================
  // 3️⃣ SEND PROMPT TO AI ROUTE
  // ========================================================
  const sendPrompt = async (e) => {
    e.preventDefault();

    if (!prompt.trim() && !selectedFile)
      return toast.error("Write a message or upload an image");

    if (!user) return toast.error("Please login first");
    if (isLoading) return toast.error("Wait for the AI");
    if (!selectedChat) return toast.error("Select or create a chat");

    setIsLoading(true);

    // --- Save user text locally ---
    let finalPrompt = prompt.trim();
    setPrompt("");

    if (finalPrompt) {
      const userMsg = {
        role: "user",
        content: finalPrompt,
        timestamp: Date.now(),
      };

      setSelectedChat((prev) => ({
        ...prev,
        messages: [...prev.messages, userMsg],
      }));

      setChats((prev) =>
        prev.map((c) =>
          c._id === selectedChat._id
            ? { ...c, messages: [...c.messages, userMsg] }
            : c
        )
      );
    }

    // --- Upload image & get public URL ---
    let uploadedImageURL = null;

    if (selectedFile) {
      uploadedImageURL = await uploadToServer();
      setSelectedFile(null);
      fileInputRef.current.value = "";
    }

    // --- Send to AI (FINAL FIX) ---
    try {
      const res = await axios.post("/api/chat/ai", {
        chatId: selectedChat._id,
        prompt: finalPrompt,
        image: uploadedImageURL, // REAL PUBLIC URL
      });

      if (!res.data.success) {
        toast.error(res.data.message);
        setIsLoading(false);
        return;
      }

      const text = res.data.data.content;
      const words = text.split(" ");

      let assistantMsg = {
        role: "assistant",
        content: "",
        timestamp: Date.now(),
      };

      setSelectedChat((prev) => ({
        ...prev,
        messages: [...prev.messages, assistantMsg],
      }));

      setChats((prev) =>
        prev.map((c) =>
          c._id === selectedChat._id
            ? { ...c, messages: [...c.messages, assistantMsg] }
            : c
        )
      );

      // Typing animation
      words.forEach((_, i) => {
        setTimeout(() => {
          assistantMsg.content = words.slice(0, i + 1).join(" ");
          setSelectedChat((prev) => ({
            ...prev,
            messages: [
              ...prev.messages.slice(0, -1),
              { ...assistantMsg },
            ],
          }));
        }, i * 60);
      });
    } catch (err) {
      console.error(err);
      toast.error("AI server error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={sendPrompt}
      className="w-full max-w-3xl bg-[#404045] p-4 rounded-3xl mt-4"
    >
      <textarea
        onKeyDown={handleKeyDown}
        className="outline-none w-full resize-none bg-transparent"
        rows={2}
        placeholder="Message Dahdouh AI"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />

      <div className="flex items-center justify-between text-sm">
        <p className="flex items-center gap-2 text-xs border border-gray-300/40 px-2 py-1 rounded-full">
          <Image className="h-5" src={assets.deepthink_icon} alt="" />
          DeepThink (R1)
        </p>

        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            id="upload-input"
            className="hidden"
            onChange={handleFileUpload}
          />

          <Image
            onClick={() => document.getElementById("upload-input").click()}
            className="w-4 cursor-pointer"
            src={assets.pin_icon}
            alt="upload"
          />

          <button
            type="submit"
            className={`${
              prompt || selectedFile ? "bg-primary" : "bg-[#71717a]"
            } rounded-full p-2`}
          >
            <Image
              className="w-3.5"
              src={
                prompt || selectedFile
                  ? assets.arrow_icon
                  : assets.arrow_icon_dull
              }
              alt="send"
            />
          </button>
        </div>
      </div>
    </form>
  );
};

export default PromptBox;
