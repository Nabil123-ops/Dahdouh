"use client";

import { assets } from "@/assets/assets";
import { useAppContext } from "@/context/AppContext";
import axios from "axios";
import Image from "next/image";
import React, { useState } from "react";
import toast from "react-hot-toast";

const PromptBox = ({ isLoading, setIsLoading }) => {
  const [prompt, setPrompt] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  const { user, chats, setChats, selectedChat, setSelectedChat } =
    useAppContext();

  // 📌 Store uploaded file (DO NOT SEND TO /api/upload)
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);

    // Add image bubble preview
    const fileMessage = {
      role: "user",
      content: URL.createObjectURL(file),
      isImage: true,
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

    toast.success("Image added!");
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

    if (!promptCopy && !selectedFile)
      return toast.error("Enter a message or upload an image");

    if (!user) return toast.error("Please login first");
    if (isLoading) return toast.error("Wait for previous message");
    if (!selectedChat) return toast.error("Select or create a chat first");

    try {
      setIsLoading(true);
      setPrompt("");

      // Add user text message
      if (promptCopy) {
        const userPrompt = {
          role: "user",
          content: promptCopy,
          timestamp: Date.now(),
        };

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
      }

      // 📌 CREATE multipart/form-data
      const formData = new FormData();
      formData.append("chatId", selectedChat._id);
      formData.append("prompt", promptCopy);
      if (selectedFile) formData.append("file", selectedFile);

      // 📌 SEND FILE + PROMPT TO BACKEND
      const res = await fetch("/api/chat/ai", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setSelectedFile(null);

      if (!data.success) {
        toast.error(data.message || "Server error");
        return;
      }

      // AI response (typing effect)
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
      console.error(error);
      toast.error("AI error");
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
            className={`${prompt || selectedFile ? "bg-primary" : "bg-[#71717a]"} rounded-full p-2`}
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
