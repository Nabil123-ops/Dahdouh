"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import axios from "axios";
import { createContext, useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";

export const AppContext = createContext();

export const useAppContext = () => useContext(AppContext);

export const AppContextProvider = ({ children }) => {
  const { user } = useUser();
  const { getToken } = useAuth();

  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);

  // 🚀 Create a new chat
  const createNewChat = async () => {
    try {
      if (!user) return;

      const token = await getToken();

      const res = await axios.post(
        "/api/chat/create",
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.data.success) {
        await fetchUsersChats();
      }
    } catch (err) {
      console.error("Create chat error:", err);
      toast.error("Failed to create chat");
    }
  };

  // 🚀 Fetch user's chats
  const fetchUsersChats = async () => {
    try {
      if (!user) return;

      const token = await getToken();

      const res = await axios.get("/api/chat/get", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        const userChats = res.data.data;

        setChats(userChats);

        if (userChats.length === 0) {
          await createNewChat();
          return;
        }

        // sort by recent
        userChats.sort(
          (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
        );

        setSelectedChat(userChats[0]);
      }
    } catch (err) {
      console.error("Fetch chats error:", err);
      toast.error("Failed to load chats");
    }
  };

  // 🚀 When user logs in/out
  useEffect(() => {
    if (user) {
      fetchUsersChats();
    } else {
      // offline owner chat
      const ownerChat = {
        _id: "owner-chat",
        name: "Owner Chat",
        userId: "owner",
        messages: [],
      };

      setChats([ownerChat]);
      setSelectedChat(ownerChat);
    }
  }, [user]);

  const value = {
    user,
    chats,
    setChats,
    selectedChat,
    setSelectedChat,
    createNewChat,
    fetchUsersChats,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};
