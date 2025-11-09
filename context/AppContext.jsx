"use client";
import { useAuth, useUser } from "@clerk/nextjs";
import axios from "axios";
import { createContext, useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";

export const AppContext = createContext();

export const useAppContext = () => {
  return useContext(AppContext);
};

export const AppContextProvider = ({ children }) => {
  const { user } = useUser();
  const { getToken } = useAuth();

  const [chats, setChats] = useState([]);
  // ✅ Default chat so app never shows "Please select a chat first"
  const [selectedChat, setSelectedChat] = useState({
    _id: "owner-chat",
    name: "Owner Chat",
    userId: "owner",
    messages: [],
  });

  // ✅ Create a new chat in database (for logged-in users)
  const createNewChat = async () => {
    try {
      if (!user) return null;
      const token = await getToken();

      await axios.post(
        "/api/chat/create",
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      fetchUsersChats();
    } catch (error) {
      toast.error(error.message);
    }
  };

  // ✅ Fetch user's chats from MongoDB if logged in
  const fetchUsersChats = async () => {
    try {
      const token = await getToken();

      const { data } = await axios.get("/api/chat/get", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        setChats(data.data);

        if (data.data.length === 0) {
          // If no chats, create one then refetch
          await createNewChat();
          return fetchUsersChats();
        } else {
          // Sort by latest updated and select first one
          data.data.sort(
            (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
          );
          setSelectedChat(data.data[0]);
        }
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // ✅ When user changes (login/logout)
  useEffect(() => {
    if (user) {
      fetchUsersChats();
    } else {
      // 👇 Default offline "Owner Chat" (no Clerk)
      setChats([
        {
          _id: "owner-chat",
          name: "Owner Chat",
          userId: "owner",
          messages: [],
        },
      ]);
      setSelectedChat({
        _id: "owner-chat",
        name: "Owner Chat",
        userId: "owner",
        messages: [],
      });
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
};
