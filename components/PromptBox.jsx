"use client";

import { assets } from "@/assets/assets";
import { useAppContext } from "@/context/AppContext";
import axios from "axios";
import Image from "next/image";
import React, { useState } from "react";
import toast from "react-hot-toast";

const PromptBox = ({ isLoading, setIsLoading }) => {
  const [prompt, setPrompt] = useState("");
  const { user, chats, setChats, selectedChat, setSelectedChat } =
    useAppContext();

  // 📌 Upload file handler
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!selectedChat?._id) {
      return toast.error("⚠️ Please select or create a chat first.");
    }

    toast.loading("Uploading file...");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      toast.dismiss();

      if (!data.success) {
        console.error(data.error);
        return toast.error("Upload failed");
      }

      // Insert uploaded file URL into chat
      const fileMessage = {
        role: "user",
        content: `📎 Uploaded file: ${data.url}`,
        timestamp: Date.now(),
      };

      setChats((prev) =>
        prev.map((chat) =>
          chat._id === selectedChat._id
            ? { ...chat, messages: [...chat.messages, fileMessage] }
            : chat
        )
      );

      setSelectedChat((prev) => ({
        ...prev,
        messages: [...prev.messages, fileMessage],
      }));

      toast.success("File uploaded!");

    } catch (err) {
      toast.dismiss();
      console.error(err);
      toast.error("Upload error");
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
    const promptCopy = prompt.trim();

    if (!user) return toast.error("Please login to send a message");
    if (isLoading) return toast.error("Wait for the previous response");
    if (!selectedChat || !selectedChat._id) {
      return toast.error("⚠️ Please select or create a chat first");
    }
    if (!promptCopy) return toast.error("Prompt cannot be empty");

    try {
      setIsLoading(true);
      setPrompt("");

      const userPrompt = {
        role: "user",
        content: promptCopy,
        timestamp: Date.now(),
      };

      // Add user message
      setChats((prev) =>
        prev.map((chat) =>
          chat._id === selectedChat._id
            ? { ...chat, messages: [...chat.messages, userPrompt] }
            : chat
        )
      );

      setSelectedChat((prev) => ({
        ...prev,
        messages: [...prev.messages, userPrompt],
      }));

      // Call backend AI
      const { data } = await axios.post("/api/chat/ai", {
        chatId: selectedChat._id,
        prompt: promptCopy,
      });

      if (!data?.success) {
        toast.error(data?.message || "Server error");
        setPrompt(promptCopy);
        return;
      }

      // AI message typing effect
      const text = data.data.content;
      const words = text.split(" ");

      let assistantMessage = {
        role: "assistant",
        content: "",
        timestamp: Date.now(),
      };

      setChats((prev) =>
        prev.map((chat) =>
          chat._id === selectedChat._id
            ? { ...chat, messages: [...chat.messages, assistantMessage] }
            : chat
        )
      );

      setSelectedChat((prev) => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
      }));

      for (let i = 0; i < words.length; i++) {
        setTimeout(() => {
          assistantMessage.content = words.slice(0, i + 1).join(" ");
          setSelectedChat((prev) => {
            const updated = [
              ...prev.messages.slice(0, -1),
              assistantMessage,
            ];
            return { ...prev, messages: updated };
          });
        }, i * 60);
      }
    } catch (error) {
      console.error("❌ Prompt send error:", error);
      toast.error(error.message || "Something went wrong");
      setPrompt(promptCopy);
    } finally {
      setIsLoading(false);
    }
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
        placeholder="Message Dahdouh AI"
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
              prompt ? "bg-primary" : "bg-[#71717a]"
            } rounded-full p-2`}
          >
            <Image
              className="w-3.5"
              src={prompt ? assets.arrow_icon : assets.arrow_icon_dull}
              alt="send"
            />
          </button>
        </div>
      </div>
    </form>
  );
};

export default PromptBox;
