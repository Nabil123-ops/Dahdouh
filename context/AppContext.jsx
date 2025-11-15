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
  const [selectedChat, setSelectedChat] = useState(null); // Default null

  // 🚀 Create a New Chat
  const createNewChat = async () => {
    try {
      if (!user) return toast.error("You must log in first.");

      const token = await getToken();

      const response = await axios.post(
        "/api/chat/create",
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        await fetchUsersChats();
      } else {
        toast.error(response.data.message);
      }
    } catch (err) {
      toast.error("Failed to create chat");
      console.error("Create chat error:", err.message);
    }
  };

  // 🚀 Load all chats from backend
  const fetchUsersChats = async () => {
    try {
      if (!user) return;

      const token = await getToken();

      const { data } = await axios.get("/api/chat/get", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        const loadedChats = data.data;
        setChats(loadedChats);

        // If no chats → create one
        if (loadedChats.length === 0) {
          await createNewChat();
          return;
        }

        // Sort by latest
        loadedChats.sort(
          (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
        );

        // Auto-select the first (latest) chat
        setSelectedChat(loadedChats[0]);
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error("Failed to load chats");
      console.error("Get chats error:", err.message);
    }
  };

  // 🚀 Handle login/logout
  useEffect(() => {
    if (user) {
      fetchUsersChats();
    } else {
      // Offline Mode (Owner Chat)
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
    fetchUsersChats,
    createNewChat,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};  }, [user]);

  const value = {
    user,
    chats,
    setChats,
    selectedChat,
    setSelectedChat,
    fetchUsersChats,
    createNewChat,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
