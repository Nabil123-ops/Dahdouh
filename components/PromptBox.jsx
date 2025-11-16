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

  // 📌 FILE PREVIEW ONLY (Blob)
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);

    const previewMsg = {
      role: "user",
      content: URL.createObjectURL(file),
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
      console.log("Upload error:", err);
      return null;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendPrompt(e);
    }
  };

  const sendPrompt = async (e) => {
    e.preventDefault();

    if (!prompt.trim() && !selectedFile)
      return toast.error("Write a message or upload an image");

    if (!user) return toast.error("Please login");
    if (isLoading) return toast.error("Wait for the AI to finish");
    if (!selectedChat) return toast.error("Select or create a chat");

    setIsLoading(true);

    // Add user text message
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

    // 📌 Upload image FIRST (get public URL)
    let uploadedImageURL = null;
    if (selectedFile) {
      uploadedImageURL = await uploadToServer();
      setSelectedFile(null);
      fileInputRef.current.value = null;
    }

    // 📌 Send message to AI
    try {
      const res = await axios.post("/api/chat/ai", {
        chatId: selectedChat._id,
        prompt: finalPrompt,
        imageurl: uploadedImageURL, // FINAL FIX
      });

      if (!res.data.success) {
        toast.error(res.data.message);
        setIsLoading(false);
        return;
      }

      // AI typing effect
      const fullText = res.data.data.content;
      const words = fullText.split(" ");

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
        <div className="flex items-center gap-2">
          <p className="flex items-center gap-2 text-xs border border-gray-300/40 px-2 py-1 rounded-full">
            <Image className="h-5" src={assets.deepthink_icon} alt="" />
            DeepThink (R1)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="file"
            accept="image/*"
            id="upload-input"
            ref={fileInputRef}
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
