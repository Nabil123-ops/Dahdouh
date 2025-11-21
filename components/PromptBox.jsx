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
  const fileInputRef = useRef(null);

  const { user, chats, setChats, selectedChat, setSelectedChat } =
    useAppContext();

  // ========================================================
  // 1️⃣ PREVIEW ONLY
  // ========================================================
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);

    // preview blob only
    const previewMsg = {
      role: "user",
      content: URL.createObjectURL(file),
      isImage: true,
      timestamp: Date.now(),
    };

    // add preview msg to chat
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
  // 2️⃣ Upload to server → returns public URL
  // ========================================================
  const uploadToServer = async () => {
    if (!selectedFile) return null;

    try {
      const form = new FormData();
      form.append("file", selectedFile);

      const { data } = await axios.post("/api/upload-image", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (data.success) return data.url;
      return null;
    } catch (err) {
      console.error("Upload error", err);
      return null;
    }
  };

  // ENTER KEY
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendPrompt(e);
    }
  };

  // ========================================================
  // 3️⃣ SEND TO AI
  // ========================================================
  const sendPrompt = async (e) => {
    e.preventDefault();

    if (!prompt.trim() && !selectedFile)
      return toast.error("Write a message or upload an image");

    if (!user) return toast.error("Please login first");
    if (isLoading) return toast.error("Wait for the AI");
    if (!selectedChat) return toast.error("Select or create a chat");

    setIsLoading(true);

    let finalPrompt = prompt.trim();
    setPrompt("");

    // Save text locally
    if (finalPrompt) {
      const msg = {
        role: "user",
        content: finalPrompt,
        timestamp: Date.now(),
      };

      setSelectedChat((prev) => ({
        ...prev,
        messages: [...prev.messages, msg],
      }));

      setChats((prev) =>
        prev.map((c) =>
          c._id === selectedChat._id
            ? { ...c, messages: [...c.messages, msg] }
            : c
        )
      );
    }

    // Upload image
    let uploadedImageURL = null;

    if (selectedFile) {
      uploadedImageURL = await uploadToServer();
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }

    // SEND TO AI API
    try {
      const { data } = await axios.post("/api/chat/ai", {
        chatId: selectedChat._id,
        prompt: finalPrompt,
        image: uploadedImageURL,
      });

      if (!data.success) {
        toast.error(data.message);
        setIsLoading(false);
        return;
      }

      // FIX: CORRECT FIELD FROM API
      const text = data.reply || "No response";
      const words = text.split(" ");

      let assistantMsg = {
        role: "assistant",
        content: "",
        timestamp: Date.now(),
      };

      // add empty message first
      setSelectedChat((prev) => ({
        ...prev,
        messages: [...prev.messages, assistantMsg],
      }));

      // update chat list
      setChats((prev) =>
        prev.map((c) =>
          c._id === selectedChat._id
            ? {
                ...c,
                messages: [...c.messages, assistantMsg],
              }
            : c
        )
      );

      // typing animation
      words.forEach((_, i) => {
        setTimeout(() => {
          assistantMsg.content = words.slice(0, i + 1).join(" ");

          setSelectedChat((prev) => ({
            ...prev,
            messages: [
              ...prev.messages.slice(0, prev.messages.length - 1),
              { ...assistantMsg },
            ],
          }));
        }, i * 60);
      });
    } catch (err) {
      console.error("AI error:", err);
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
