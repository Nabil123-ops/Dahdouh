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
      if (!user) return toast.error("You must log in first.");

      const token = await getToken();

      const res = await axios.post(
        "/api/chat/create",
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        await fetchUsersChats();
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      console.error("Create chat error:", err);
      toast.error("Failed to create chat");
    }
  };

  // 🚀 Fetch chats
  const fetchUsersChats = async () => {
    try {
      if (!user) return;

      const token = await getToken();

      const { data } = await axios.get("/api/chat/get", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        const list = data.data;
        setChats(list);

        // If no chats → create one
        if (list.length === 0) {
          await createNewChat();
          return;
        }

        // Sort chats by updated time
        list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        setSelectedChat(list[0]);
      }
    } catch (err) {
      console.error("Get chats error:", err);
      toast.error("Failed to load chats");
    }
  };

  // 🚀 React to login/logout
  useEffect(() => {
    if (user) {
      fetchUsersChats();
    } else {
      // Offline "owner chat"
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

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};        userId: "owner",
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
