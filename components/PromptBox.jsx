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

  // File preview
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

  // Upload to API route (Supabase)
  const uploadToServer = async () => {
    if (!selectedFile) return null;

    try {
      const form = new FormData();
      form.append("file", selectedFile);

      const res = await axios.post("/api/upload-image", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      return res.data.success ? res.data.url : null;
    } catch {
      return null;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendPrompt(e);
    }
  };

  // Send Prompt
  const sendPrompt = async (e) => {
    e.preventDefault();

    if (!prompt.trim() && !selectedFile)
      return toast.error("Write a message or upload an image");

    if (!user) return toast.error("Login required");
    if (isLoading) return toast.error("Wait...");
    if (!selectedChat) return toast.error("Select a chat");

    setIsLoading(true);

    const finalPrompt = prompt.trim();
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
    }

    let uploadedImageURL = null;
    if (selectedFile) {
      uploadedImageURL = await uploadToServer();
      setSelectedFile(null);
      fileInputRef.current.value = "";
    }

    try {
      const res = await axios.post("/api/chat/ai", {
        message: finalPrompt,
        image: uploadedImageURL,
      });

      if (!res.data.success) {
        toast.error(res.data.error || "AI Error");
        setIsLoading(false);
        return;
      }

      const text = res.data.reply;
      const words = text.split(" ");

      let assistantMsg = {
        role: "assistant",
        content: "",
        timestamp: Date.now(),
      };

      // Add empty assistant bubble
      setSelectedChat((prev) => ({
        ...prev,
        messages: [...prev.messages, assistantMsg],
      }));

      // Typing animation
      words.forEach((_, i) => {
        setTimeout(() => {
          assistantMsg.content = words.slice(0, i + 1).join(" ");

          setSelectedChat((prev) => {
            const updated = [...prev.messages];
            updated[updated.length - 1] = { ...assistantMsg };
            return { ...prev, messages: updated };
          });
        }, i * 60);
      });

      // Stop loading
      setTimeout(() => setIsLoading(false), words.length * 60);
    } catch (err) {
      toast.error("AI server error");
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