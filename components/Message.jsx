import { assets } from "@/assets/assets";
import Image from "next/image";
import React, { useEffect } from "react";
import Markdown from "react-markdown";
import Prism from "prismjs";
import toast from "react-hot-toast";

const isImageUrl = (url) =>
  /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(url);

const extractUploadedUrl = (content) => {
  if (!content.startsWith("📎 Uploaded file:")) return null;
  return content.replace("📎 Uploaded file:", "").trim();
};

const Message = ({ role, content }) => {
  const copyMessage = () => {
    navigator.clipboard.writeText(content);
    toast.success("Message copied");
  };

  useEffect(() => {
    Prism.highlightAll();
  }, [content]);

  const uploadedUrl = extractUploadedUrl(content);
  const isImage = uploadedUrl && isImageUrl(uploadedUrl);

  return (
    <div className="flex flex-col items-center w-full max-w-3xl text-sm">
      <div
        className={`flex flex-col w-full mb-8 ${
          role === "user" && "items-end"
        }`}
      >
        <div
          className={`group relative flex max-w-2xl py-3 rounded-xl ${
            role === "user" ? "bg-[#414158] px-5" : "gap-3"
          }`}
        >
          {/* Tools */}
          <div
            className={`opacity-0 group-hover:opacity-100 absolute ${
              role === "user" ? "-left-16 top-2.5" : "left-9 -bottom-6"
            } transition-all`}
          >
            <div className="flex items-center gap-2 opacity-70">
              <Image
                onClick={copyMessage}
                src={assets.copy_icon}
                alt="copy icon"
                className="w-4 cursor-pointer"
              />

              {role === "assistant" && (
                <>
                  <Image src={assets.regenerate_icon} className="w-4 cursor-pointer" alt="" />
                  <Image src={assets.like_icon}        className="w-4 cursor-pointer" alt="" />
                  <Image src={assets.dislike_icon}     className="w-4 cursor-pointer" alt="" />
                </>
              )}
            </div>
          </div>

          {/* USER */}
          {role === "user" ? (
            <>
              {isImage ? (
                <Image
                  src={uploadedUrl}
                  width={300}
                  height={300}
                  alt="Upload"
                  className="rounded-lg border border-white/20"
                />
              ) : uploadedUrl ? (
                <a href={uploadedUrl} target="_blank" className="text-blue-300 underline">
                  📎 {uploadedUrl}
                </a>
              ) : (
                <span className="text-white/90">{content}</span>
              )}
            </>
          ) : (
            /* ASSISTANT */
            <>
              <Image
                src={assets.logo_icon}
                alt="logo"
                className="w-9 h-9 p-1 border border-white/15 rounded-full"
              />
              <div className="space-y-4 w-full overflow-hidden">
                <Markdown>{content}</Markdown>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Message;