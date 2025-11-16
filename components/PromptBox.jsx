"use client";

import { assets } from "@/assets/assets";
import { useAppContext } from "@/context/AppContext";
import Image from "next/image";
import React, { useState } from "react";
import toast from "react-hot-toast";

const PromptBox = ({ isLoading, setIsLoading }) => {
  const [prompt, setPrompt] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  const { user, chats, setChats, selectedChat, setSelectedChat } =
    useAppContext();

  // 📌 File input handler (NO UPLOAD HERE!)
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    toast.success("Image selected — now type your question");
  };

  // 📌 Send On Enter
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendPrompt(e);
    }
  };

  // 📌 SEND MESSAGE (TEXT OR IMAGE+TEXT)
  const sendPrompt = async (e) => {
    e.preventDefault();

    if (!user) return toast.error("Please login to send a message");
    if (!selectedChat?._id)
      return toast.error("⚠️ Please select or create a chat first");
    if (!prompt.trim()) return toast.error("Prompt cannot be empty");
    if (isLoading) return;

    const promptCopy = prompt.trim();
    setPrompt("");
    setIsLoading(true);

    try {
      // === 1️⃣ Insert user message in UI ===
      const userMessage = {
        role: "user",
        content: selectedFile
          ? `🖼 Image + "${promptCopy}"`
          : promptCopy,
        timestamp: Date.now(),
        image: selectedFile ? URL.createObjectURL(selectedFile) : null,
      };

      setSelectedChat((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage],
      }));

      // === 2️⃣ Build FormData for backend ===
      const formData = new FormData();
      formData.append("chatId", selectedChat._id);
      formData.append("prompt", promptCopy);
      if (selectedFile) formData.append("file", selectedFile);

      // === 3️⃣ Send to /api/chat/ai ===
      const res = await fetch("/api/chat/ai", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!data.success) {
        toast.error(data.message);
        return;
      }

      // === 4️⃣ Add assistant message ===
      const assistantMessage = data.data;

      setSelectedChat((prev) => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
      }));

      // clean image
      setSelectedFile(null);

    } catch (err) {
      console.error(err);
      toast.error("Failed to send message");
    }

    setIsLoading(false);
  };

  return (
    <form
      onSubmit={sendPrompt}
      className={`w-full ${
        selectedChat?.messages?.length > 0 ? "max-w-3xl" : "max-w-2xl"
      } bg-[#404045] p-4 rounded-3xl mt-4 transition-all`}
    >
      <textarea
        onKeyDown={handleKeyDown}
        className="outline-none w-full resize-none bg-transparent"
        rows={2}
        placeholder={
          selectedFile
            ? "Ask Dahdouh AI about the image…"
            : "Message Dahdouh AI"
        }
        required
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <p className="flex items-center gap-2 text-xs border border-gray-300/40 px-2 py-1 rounded-full">
            <Image className="h-5" src={assets.deepthink_icon} alt="" />
            DeepThink (R1)
          </p>
          <p className="flex items-center gap-2 text-xs border border-gray-300/40 px-2 py-1 rounded-full">
            <Image className="h-5" src={assets.search_icon} alt="" />
            Search
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Hidden File Input */}
          <input
            type="file"
            id="upload-input"
            className="hidden"
            onChange={handleFileUpload}
            accept="image/*"
          />

          {/* Upload Button */}
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
              src={prompt || selectedFile ? assets.arrow_icon : assets.arrow_icon_dull}
              alt="send"
            />
          </button>
        </div>
      </div>
    </form>
  );
};

export default PromptBox;
