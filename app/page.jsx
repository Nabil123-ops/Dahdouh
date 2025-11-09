"use client";
import { assets } from "@/assets/assets";
import Message from "@/components/Message";
import PromptBox from "@/components/PromptBox";
import Sidebar from "@/components/Sidebar";
import { useAppContext } from "@/context/AppContext";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [expand, setExpand] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { selectedChat } = useAppContext();
  const containerRef = useRef(null);

  // ✅ Handle selectedChat safely
  useEffect(() => {
    if (selectedChat && Array.isArray(selectedChat.messages)) {
      setMessages(selectedChat.messages);
    } else {
      setMessages([]); // prevent null errors
    }
  }, [selectedChat]);

  // ✅ Auto scroll when new messages appear
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <Sidebar expand={expand} setExpand={setExpand} />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8 bg-[#292a2d] text-white relative">
        {/* Mobile header (menu + logo) */}
        <div className="md:hidden absolute px-4 top-6 flex items-center justify-between w-full">
          <Image
            onClick={() => setExpand(!expand)}
            className="rotate-180 cursor-pointer"
            src={assets.menu_icon}
            alt="menu icon"
          />
          <Image
            className="opacity-70"
            src={assets.chat_icon}
            alt="chat icon"
          />
        </div>

        {/* ✅ Show welcome screen if no messages */}
        {messages && messages.length === 0 ? (
          <>
            <div className="flex items-center gap-3">
              {/* ✅ Logo appears here */}
              <Image
                src={assets.logo_icon}
                alt="logo icon"
                className="h-16 w-16 object-contain"
              />
              <p className="text-2xl font-medium">Hi, I'm Dahdouh AI</p>
            </div>
            <p className="text-sm mt-2">How can I help you today?</p>
          </>
        ) : (
          <div
            ref={containerRef}
            className="relative flex flex-col items-center justify-start w-full mt-20 max-h-screen overflow-y-auto"
          >
            {/* ✅ Chat title — safe check */}
            {selectedChat && (
              <p className="fixed top-8 border border-transparent hover:border-gray-500/50 py-1 px-2 rounded-lg font-semibold mb-6">
                {selectedChat.name}
              </p>
            )}

            {/* ✅ Messages rendering safely */}
            {messages && messages.length > 0 ? (
              messages.map((msg, index) => (
                <Message key={index} role={msg.role} content={msg.content} />
              ))
            ) : (
              <p className="text-gray-400 text-sm">No messages yet</p>
            )}

            {/* ✅ Loading animation */}
            {isLoading && (
              <div className="flex gap-4 max-w-3xl w-full py-3">
                <Image
                  className="h-9 w-9 p-1 border border-white/15 rounded-full"
                  src={assets.logo_icon}
                  alt="Logo"
                />
                <div className="loader flex justify-center items-center gap-1">
                  <div className="w-1 h-1 rounded-full bg-white animate-bounce"></div>
                  <div className="w-1 h-1 rounded-full bg-white animate-bounce delay-150"></div>
                  <div className="w-1 h-1 rounded-full bg-white animate-bounce delay-300"></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ✅ Message input box */}
        <PromptBox isLoading={isLoading} setIsLoading={setIsLoading} />

        {/* ✅ Footer */}
        <p className="text-xs absolute bottom-1 text-gray-500">
          AI-generated, for reference only
        </p>
      </div>
    </div>
  );
}
