import { assets } from "@/assets/assets";
import { useAppContext } from "@/context/AppContext";
import axios from "axios";
import Image from "next/image";
import React, { useState } from "react";
import toast from "react-hot-toast";

const PromptBox = ({ isLoading, setIsLoading }) => {
  const [prompt, setPrompt] = useState("");
  const { user, chats, setChats, selectedChat, setSelectedChat } = useAppContext();

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendPrompt(e);
    }
  };

  const sendPrompt = async (e) => {
    e.preventDefault();
    const promptCopy = prompt.trim();

    // ✅ 1. Safety checks before sending
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

      // ✅ 2. Safely update chats (no crash if messages is undefined)
      setChats((prevChats) =>
        prevChats.map((chat) =>
          chat._id === selectedChat._id
            ? {
                ...chat,
                messages: [...(chat.messages || []), userPrompt],
              }
            : chat
        )
      );

      // ✅ 3. Update selected chat safely
      setSelectedChat((prev) => ({
        ...prev,
        messages: [...(prev?.messages || []), userPrompt],
      }));

      // ✅ 4. Send the prompt to backend
      const { data } = await axios.post("/api/chat/ai", {
        chatId: selectedChat._id,
        prompt: promptCopy,
      });

      if (!data?.success) {
        toast.error(data?.message || "Server error");
        setPrompt(promptCopy);
        return;
      }

      // ✅ 5. Add assistant message safely
      const message = data.data.content;
      const messageTokens = message.split(" ");
      let assistantMessage = {
        role: "assistant",
        content: "",
        timestamp: Date.now(),
      };

      setChats((prevChats) =>
        prevChats.map((chat) =>
          chat._id === selectedChat._id
            ? { ...chat, messages: [...(chat.messages || []), assistantMessage] }
            : chat
        )
      );

      setSelectedChat((prev) => ({
        ...prev,
        messages: [...(prev?.messages || []), assistantMessage],
      }));

      // ✅ 6. Typewriter effect for AI message
      for (let i = 0; i < messageTokens.length; i++) {
        setTimeout(() => {
          assistantMessage.content = messageTokens.slice(0, i + 1).join(" ");
          setSelectedChat((prev) => {
            const updatedMessages = [
              ...prev.messages.slice(0, -1),
              assistantMessage,
            ];
            return { ...prev, messages: updatedMessages };
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
        className="outline-none w-full resize-none overflow-hidden break-words bg-transparent"
        rows={2}
        placeholder="Message Dahdouh AI"
        required
        onChange={(e) => setPrompt(e.target.value)}
        value={prompt}
      />

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <p className="flex items-center gap-2 text-xs border border-gray-300/40 px-2 py-1 rounded-full cursor-pointer hover:bg-gray-500/20 transition">
            <Image className="h-5" src={assets.deepthink_icon} alt="deepthink icon" />
            DeepThink (R1)
          </p>
          <p className="flex items-center gap-2 text-xs border border-gray-300/40 px-2 py-1 rounded-full cursor-pointer hover:bg-gray-500/20 transition">
            <Image className="h-5" src={assets.search_icon} alt="search icon" />
            Search
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Image className="w-4 cursor-pointer" src={assets.pin_icon} alt="pin icon" />
          <button
            type="submit"
            className={`${
              prompt ? "bg-primary" : "bg-[#71717a]"
            } rounded-full p-2 cursor-pointer`}
          >
            <Image
              className="w-3.5 aspect-square"
              src={prompt ? assets.arrow_icon : assets.arrow_icon_dull}
              alt={prompt ? "arrow icon" : "arrow icon dull"}
            />
          </button>
        </div>
      </div>
    </form>
  );
};

export default PromptBox;
