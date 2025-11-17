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

  // Load messages when chat changes
  useEffect(() => {
    if (selectedChat?.messages) setMessages(selectedChat.messages);
    else setMessages([]);
  }, [selectedChat]);

  // Auto scroll
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isLoading]);

  return (
    <div className="flex h-screen">
      <Sidebar expand={expand} setExpand={setExpand} />

      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8 bg-[#292a2d] text-white relative">
        
        {/* Mobile */}
        <div className="md:hidden absolute px-4 top-6 flex items-center justify-between w-full">
          <Image
            onClick={() => setExpand(!expand)}
            className="rotate-180 cursor-pointer"
            src={assets.menu_icon}
            alt="menu icon"
          />
          <Image className="opacity-70" src={assets.chat_icon} alt="chat icon" />
        </div>

        {/* Welcome screen */}
        {messages.length === 0 ? (
          <>
            <div className="flex items-center gap-3">
              <Image
                src={assets.logo_icon}
                alt="logo icon"
                className="h-16 w-16 object-contain"
              />
              <p className="text-2xl font-medium">Hi, I'm Dahdouh AI</p>
            </div>
            <p className="text-sm mt-2 opacity-70">
              How can I help you today?
            </p>
          </>
        ) : (
          <div
            ref={containerRef}
            className="relative flex flex-col items-center justify-start w-full mt-20 max-h-screen overflow-y-auto"
          >
            {selectedChat && (
              <p className="fixed top-8 border border-transparent hover:border-gray-500/50 py-1 px-2 rounded-lg font-semibold mb-6">
                {selectedChat.name}
              </p>
            )}

            {messages.map((msg, index) => (
              <Message key={index} role={msg.role} content={msg.content} />
            ))}

            {isLoading && (
              <div className="flex gap-4 max-w-3xl w-full py-3">
                <Image
                  className="h-9 w-9 p-1 border border-white/15 rounded-full"
                  src={assets.logo_icon}
                  alt="Logo"
                />
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-150"></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-300"></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Input */}
        <PromptBox isLoading={isLoading} setIsLoading={setIsLoading} />

        <p className="text-xs absolute bottom-1 text-gray-500">
          AI-generated. For reference only.
        </p>
      </div>
    </div>
  );
}