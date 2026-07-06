import React, { createContext, useEffect, useState } from "react";
import axios from "axios";

export const userDataContext = createContext();

const UserContext = ({ children }) => {
  const serverUrl = https://virtual-assistant-backend-myx0.onrender.com
  const [userData, setUserData] = useState(null);
  const [frontendImage, setFrontendImage] = useState(null);
  const [backendImage, setBackendImage] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  const handleCurrentUser = async () => {
    try {
      const result = await axios.get(`${serverUrl}/api/user/current`, {
        withCredentials: true,
        timeout: 10000,
      });
      setUserData(result.data);
      console.log("[Assistant] Current user loaded:", result.data);
    } catch (error) {
      console.log("[Assistant] Current user error:", error);
    }
  };

  const getGeminiResponse = async (command, options = {}) => {
    try {
      const result = await axios.post(
        `${serverUrl}/api/user/asktoassistant`,
        {
          command,
          language: options.language,
          heardText: options.heardText,
        },
        {
          withCredentials: true,
          timeout: 22000,
        },
      );

      if (result.data?.history) {
        setUserData((currentUser) =>
          currentUser ? { ...currentUser, history: result.data.history } : currentUser,
        );
      }

      return result.data;
    } catch (error) {
      console.log("[Assistant] Request error:", error);
      return {
        type: "general",
        userInput: command,
        response:
          options.language === "hi-IN"
            ? "माफ कीजिए, जवाब आने में समस्या हुई।"
            : "Sorry, I had trouble getting a response.",
      };
    }
  };

  const clearAssistantHistory = async () => {
    const result = await axios.delete(`${serverUrl}/api/user/history`, {
      withCredentials: true,
      timeout: 10000,
    });
    setUserData(result.data);
    return result.data;
  };

  useEffect(() => {
    handleCurrentUser();
  }, []);

  const value = {
    serverUrl,
    userData,
    setUserData,
    backendImage,
    setBackendImage,
    getGeminiResponse,
    clearAssistantHistory,
    selectedImage,
    setSelectedImage,
    frontendImage,
    setFrontendImage,
  };

  return (
    <userDataContext.Provider value={value}>
      {children}
    </userDataContext.Provider>
  );
};

export default UserContext;
