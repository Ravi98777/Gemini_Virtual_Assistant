  
import React, { useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaCheck, FaPlus } from "react-icons/fa";
import axios from "axios";

import ai1 from "../assets/image1.png";
import ai2 from "../assets/image2.jpg";
import ai3 from "../assets/image3.jpg";
import ai4 from "../assets/image4.png";
import ai5 from "../assets/image5.png";
import ai6 from "../assets/image6.jpeg";
import ai7 from "../assets/image7.jpeg";
import ai8 from "../assets/image8.jpg";
import ai9 from "../assets/image9.jpg";
import ai10 from "../assets/image10.jpg";
import ai11 from "../assets/image11.jpg";
import ai12 from "../assets/image12.jpg";
import ai13 from "../assets/image13.jpg";
import ai14 from "../assets/image14.jpg";
import ai15 from "../assets/image15.jpg";
import ai16 from "../assets/image16.jpg";
import ai17 from "../assets/image17.jpg";
import ai18 from "../assets/image18.jpg";
import ai19 from "../assets/image19.jpg";


import { userDataContext } from "../context/UserContext.jsx";

const assistants = [ai1, ai2,ai3, ai4, ai5, ai6, ai7,ai8,ai9,ai10,ai11,ai12,ai13,ai14,ai15,ai16,ai17,ai18,ai19];

const Customize = () => {
  const navigate = useNavigate();
  const inputImage = useRef(null);

  const {
    serverUrl,
    userData,
    setUserData,
    backendImage,
    setBackendImage,
    selectedImage,
    setSelectedImage,
    frontendImage,
    setFrontendImage,
  } = useContext(userDataContext);

  const [assistantName, setAssistantName] = useState("");
  const [assistantVoice, setAssistantVoice] = useState("female");
  const [preferredLanguage, setPreferredLanguage] = useState("en-US");
  const [loading, setLoading] = useState(false);

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setBackendImage(file);
    setFrontendImage(URL.createObjectURL(file));
    setSelectedImage(null);
  };

  const handleDefaultImageSelect = (image) => {
    setSelectedImage(image);
    setBackendImage(null);
    setFrontendImage(null);

    if (inputImage.current) {
      inputImage.current.value = "";
    }
  };

  const handleUpdateAssistant = async () => {
    const trimmedName = assistantName.trim();

    if (!trimmedName) {
      alert("Please enter an assistant name");
      return;
    }

    if (!backendImage && !selectedImage && !userData?.assistantImage) {
      alert("Please select or upload an assistant image");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("assistantName", trimmedName);
      formData.append("assistantVoice", assistantVoice);
      formData.append("preferredLanguage", preferredLanguage);

      if (backendImage) {
        formData.append("assistantImage", backendImage);
      } else {
        formData.append("imageUrl", selectedImage || userData.assistantImage);
      }
      const result = await axios.post(
        `${serverUrl}/api/user/update`,
        formData,
        { withCredentials: true },
      );
      setUserData(result.data);
      navigate("/");
    } catch (error) {
      console.error("Assistant update error:", error);
      alert(error.response?.data?.message || "Unable to update the assistant");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userData?.assistantName) {
      setAssistantName(userData.assistantName);
    }

    if (userData?.assistantVoice) {
      setAssistantVoice(userData.assistantVoice);
    }

    if (userData?.preferredLanguage) {
      setPreferredLanguage(userData.preferredLanguage);
    }
  }, [userData]);

  useEffect(() => {
    return () => {
      if (frontendImage?.startsWith("blob:")) {
        URL.revokeObjectURL(frontendImage);
      }
    };
  }, [frontendImage]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-cyan-700 flex justify-center items-center p-8">
      <div className="w-full max-w-7xl bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl p-10">
        <h1 className="text-4xl font-bold text-center text-white">
          Customize Your AI Assistant
        </h1>

        <p className="text-center text-gray-300 mt-3">
          Select your favorite assistant or upload your own.
        </p>

        <div className="mt-8 grid gap-5 lg:grid-cols-[1.3fr_.7fr_.8fr]">
          <div>
            <label htmlFor="assistant-name" className="text-white text-lg font-semibold">
              Assistant Name
            </label>
            <input
              id="assistant-name"
              type="text"
              value={assistantName}
              onChange={(event) => setAssistantName(event.target.value)}
              placeholder="Example: Nova AI"
              className="mt-3 w-full rounded-xl bg-white/10 border border-cyan-400 px-5 py-3 text-white outline-none focus:ring-2 focus:ring-white placeholder-gray-300"
            />
          </div>

          <div>
            <p className="text-white text-lg font-semibold">Voice Tone</p>
            <div className="mt-3 grid grid-cols-2 overflow-hidden rounded-xl border border-cyan-400 bg-white/10">
              {["female", "male"].map((tone) => (
                <button
                  key={tone}
                  type="button"
                  onClick={() => setAssistantVoice(tone)}
                  className={`px-4 py-3 font-semibold capitalize transition ${
                    assistantVoice === tone
                      ? "bg-cyan-500 text-white"
                      : "text-cyan-100 hover:bg-white/10"
                  }`}
                >
                  {tone}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-white text-lg font-semibold">Language</p>
            <div className="mt-3 grid grid-cols-2 overflow-hidden rounded-xl border border-cyan-400 bg-white/10">
              {[
                ["en-US", "English"],
                ["hi-IN", "Hindi"],
              ].map(([code, label]) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setPreferredLanguage(code)}
                  className={`px-4 py-3 font-semibold transition ${
                    preferredLanguage === code
                      ? "bg-cyan-500 text-white"
                      : "text-cyan-100 hover:bg-white/10"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <h2 className="text-white text-2xl font-semibold mt-10 mb-6">
          Choose Assistant
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          <label
            className={`relative h-80 rounded-2xl border-[3px] border-dashed cursor-pointer flex justify-center items-center overflow-hidden transition-all duration-300 ${
              backendImage
                ? "border-white shadow-[0_0_25px_rgba(255,255,255,.9)]"
                : "border-cyan-300 hover:border-white"
            }`}
          >
            {frontendImage ? (
              <img
                src={frontendImage}
                alt="Uploaded assistant"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center">
                <FaPlus className="text-white text-5xl mb-4" />
                <h2 className="text-white text-lg font-semibold">Upload</h2>
                <p className="text-gray-300 text-sm mt-2">Your AI Avatar</p>
              </div>
            )}

            {backendImage && (
              <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white flex justify-center items-center">
                <FaCheck className="text-cyan-600" />
              </div>
            )}

            <input
              hidden
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              ref={inputImage}
              onChange={handleImageUpload}
            />
          </label>

          {assistants.map((image, index) => (
            <button
              key={image}
              type="button"
              onClick={() => handleDefaultImageSelect(image)}
              className={`relative cursor-pointer rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105 ${
                selectedImage === image
                  ? "border-[5px] border-white shadow-[0_0_30px_rgba(255,255,255,0.9)] scale-105"
                  : "border border-white/20 hover:border-cyan-400"
              }`}
              aria-label={`Select assistant ${index + 1}`}
            >
              <img
                src={image}
                alt={`Assistant ${index + 1}`}
                className="w-full h-80 object-cover"
              />

              {selectedImage === image && (
                <span className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white flex items-center justify-center">
                  <FaCheck className="text-cyan-600 text-sm" />
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <button
            type="button"
            onClick={handleUpdateAssistant}
            disabled={loading}
            className="px-12 py-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300 text-white font-semibold text-lg shadow-lg hover:shadow-cyan-500/50"
          >
            {loading ? "Saving..." : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Customize;
