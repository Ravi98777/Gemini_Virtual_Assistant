import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBars,
  FaGlobe,
  FaHistory,
  FaMagic,
  FaMicrophone,
  FaMicrophoneSlash,
  FaRobot,
  FaSignOutAlt,
  FaTerminal,
  FaTimes,
  FaTrash,
  FaVolumeUp,
} from "react-icons/fa";
import axios from "axios";
import aiImage from "../assets/ai.gif";
import userImage from "../assets/user.gif";

import { userDataContext } from "../context/UserContext.jsx";

const DUPLICATE_COMMAND_WINDOW_MS = 4000;
const COMMAND_MODE_TIMEOUT_MS = 10000;
const RECOGNITION_RESTART_DELAY_MS = 500;
const RECOGNITION_ABORT_BACKOFF_MS = 2500;
const MAX_FAST_ABORT_RESTARTS = 3;

const languageOptions = [
  { code: "en-US", label: "English", shortLabel: "EN" },
  { code: "hi-IN", label: "Hindi", shortLabel: "HI" },
];

const normalizeSpeech = (value = "") =>
  value
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:।]+/g, " ")
    .replace(/\s+/g, " ");

const formatHistoryTime = (value) => {
  if (!value) return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const normalizeHistory = (history = []) =>
  history
    .map((item, index) => {
      if (typeof item === "string") {
        return {
          id: `legacy-${index}`,
          command: item,
          heardText: item,
          response: "",
          type: "legacy",
          language: "en-US",
          time: "",
        };
      }

      return {
        id: item.id || `${item.createdAt || Date.now()}-${index}`,
        command: item.command || item.userInput || "",
        heardText: item.heardText || item.command || "",
        response: item.response || "",
        type: item.type || "general",
        language: item.language || "en-US",
        time: formatHistoryTime(item.createdAt),
      };
    })
    .filter((item) => item.command || item.response)
    .slice(0, 50);

const openInNewTab = (url, addActivity) => {
  const opened = window.open(url, "_blank", "noopener,noreferrer");

  if (opened) {
    addActivity?.(`Opened: ${url}`);
    return;
  }

  addActivity?.("Popup was blocked, opening in this tab.");
  window.location.assign(url);
};

const performAssistantAction = (data, addActivity) => {
  if (!data) return;

  const { type, userInput = "" } = data;
  const encodedInput = encodeURIComponent(userInput || "");

  switch (type) {
    case "google_search":
      openInNewTab(`https://www.google.com/search?q=${encodedInput}`, addActivity);
      break;

    case "youtube_search":
    case "youtube_play":
      openInNewTab(
        `https://www.youtube.com/results?search_query=${encodedInput}`,
        addActivity,
      );
      break;

    case "youtube_open":
      openInNewTab("https://www.youtube.com", addActivity);
      break;

    case "google_open":
      openInNewTab("https://www.google.com", addActivity);
      break;

    case "gmail_open":
      openInNewTab("https://mail.google.com", addActivity);
      break;

    case "maps_open":
      openInNewTab("https://www.google.com/maps", addActivity);
      break;

    case "whatsapp_open":
      openInNewTab("https://web.whatsapp.com", addActivity);
      break;

    case "spotify_open":
      openInNewTab("https://open.spotify.com", addActivity);
      break;

    case "calculator_open":
      addActivity?.("Requesting OS calculator.");
      window.location.href = "calculator://";
      break;

    case "instagram_open":
      openInNewTab("https://www.instagram.com", addActivity);
      break;

    case "facebook_open":
      openInNewTab("https://www.facebook.com", addActivity);
      break;

    case "weather_show":
      openInNewTab(
        `https://www.google.com/search?q=${encodeURIComponent(`${userInput} weather`)}`,
        addActivity,
      );
      break;

    case "general":
    case "get_time":
    case "get_date":
    case "get_day":
    case "get_month":
      break;

    default:
      console.warn("[Assistant] Unknown command type:", type);
      addActivity?.(`Unknown action type: ${type}`);
  }
};

const looksLikeDirectCommand = (transcript) =>
  /\b(open|play|search|find|weather|time|date|day|month|youtube|google|calculator|instagram|facebook|gmail|maps|whatsapp|spotify)\b/i.test(
    transcript,
  ) || /(खोलो|चलाओ|बजाओ|खोजो|सर्च|मौसम|समय|तारीख|दिन|महीना|यूट्यूब|गूगल|कैलकुलेटर|इंस्टाग्राम|फेसबुक|जीमेल|मैप|वाट्सऐप)/.test(transcript);

const pickVoice = (language, tone) => {
  if (!("speechSynthesis" in window)) return null;

  const voices = window.speechSynthesis.getVoices();
  const languagePrefix = language.split("-")[0].toLowerCase();
  const languageVoices = voices.filter((voice) =>
    voice.lang.toLowerCase().startsWith(languagePrefix),
  );
  const candidates = languageVoices.length ? languageVoices : voices;
  const maleHints = ["male", "david", "mark", "ravi", "hemant", "amit", "alex", "daniel"];
  const femaleHints = ["female", "zira", "susan", "heera", "kalpana", "samantha", "karen"];
  const hints = tone === "male" ? maleHints : femaleHints;

  return (
    candidates.find((voice) =>
      hints.some((hint) => voice.name.toLowerCase().includes(hint)),
    ) ||
    languageVoices[0] ||
    voices[0] ||
    null
  );
};

const Home = () => {
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [assistantStatus, setAssistantStatus] = useState("starting");
  const [heardText, setHeardText] = useState("");
  const [userText, setUserText] = useState("");
  const [aiText, setAiText] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [recentHistory, setRecentHistory] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [activeLanguage, setActiveLanguage] = useState(
    localStorage.getItem("assistant-language") || "en-US",
  );

  const {
    serverUrl,
    userData,
    setUserData,
    selectedImage,
    frontendImage,
    getGeminiResponse,
    clearAssistantHistory,
  } = useContext(userDataContext);

  const assistantImage =
    userData?.assistantImage || frontendImage || selectedImage || aiImage;
  const assistantName = userData?.assistantName?.trim() || "Assistant";
  const assistantVoiceTone = userData?.assistantVoice || "female";
  const languageLabel = useMemo(
    () => languageOptions.find((item) => item.code === activeLanguage)?.label || "English",
    [activeLanguage],
  );

  const recognitionRef = useRef(null);
  const startListeningRef = useRef(null);
  const shouldListenRef = useRef(true);
  const recognitionRestartRef = useRef(null);
  const commandTimeoutRef = useRef(null);
  const modeRef = useRef("wake");
  const processingRef = useRef(false);
  const speakingRef = useRef(false);
  const speechIdRef = useRef(0);
  const logoutInFlightRef = useRef(false);
  const lastCommandRef = useRef({ text: "", time: 0 });
  const assistantNameRef = useRef(assistantName);
  const getGeminiResponseRef = useRef(getGeminiResponse);
  const activeLanguageRef = useRef(activeLanguage);
  const assistantVoiceToneRef = useRef(assistantVoiceTone);
  const lastRecognitionErrorRef = useRef("");
  const recognitionStartedAtRef = useRef(0);
  const fastAbortRestartCountRef = useRef(0);

  assistantNameRef.current = assistantName;
  getGeminiResponseRef.current = getGeminiResponse;
  activeLanguageRef.current = activeLanguage;
  assistantVoiceToneRef.current = assistantVoiceTone;

  const addActivity = useCallback((message) => {
    const entry = {
      id: `${Date.now()}-${Math.random()}`,
      message,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    };

    console.log(`[Assistant] ${message}`);
    setActivityLog((currentLog) => [entry, ...currentLog].slice(0, 30));
  }, []);

  const speak = useCallback((text) => {
    const message = String(text || "").trim();
    if (!message || !("speechSynthesis" in window)) return;

    const speechId = speechIdRef.current + 1;
    speechIdRef.current = speechId;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = activeLanguageRef.current;
    utterance.rate = activeLanguageRef.current === "hi-IN" ? 0.95 : 1;
    utterance.pitch = assistantVoiceToneRef.current === "male" ? 0.9 : 1.08;
    utterance.voice = pickVoice(activeLanguageRef.current, assistantVoiceToneRef.current);

    const markSpeechFinished = () => {
      if (speechIdRef.current === speechId) {
        speakingRef.current = false;
        addActivity("Finished speaking.");
      }
    };

    utterance.onstart = () => addActivity(`Speaking as ${assistantVoiceToneRef.current}.`);
    utterance.onend = markSpeechFinished;
    utterance.onerror = markSpeechFinished;
    speakingRef.current = true;
    window.speechSynthesis.speak(utterance);
  }, [addActivity]);

  const handleLanguageChange = (language) => {
    setActiveLanguage(language);
    localStorage.setItem("assistant-language", language);
    addActivity(`Language set to ${language === "hi-IN" ? "Hindi" : "English"}.`);
  };

  const handleLogout = async () => {
    if (logoutInFlightRef.current) return;

    logoutInFlightRef.current = true;
    setLoggingOut(true);

    try {
      await axios.post(
        `${serverUrl}/api/auth/logout`,
        {},
        { withCredentials: true },
      );

      setUserData(null);
      navigate("/signin", { replace: true });
    } catch (error) {
      console.error("Logout error:", error);
      alert(error.response?.data?.message || "Unable to log out");
    } finally {
      logoutInFlightRef.current = false;
      setLoggingOut(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      await clearAssistantHistory();
      setRecentHistory([]);
      addActivity("History cleared.");
    } catch (error) {
      console.error("Clear history error:", error);
      addActivity("Could not clear history.");
    }
  };

  const resumeListening = () => {
    startListeningRef.current?.();
  };

  useEffect(() => {
    if (userData?.preferredLanguage && userData.preferredLanguage !== activeLanguage) {
      setActiveLanguage(userData.preferredLanguage);
      localStorage.setItem("assistant-language", userData.preferredLanguage);
    }
  }, [userData?.preferredLanguage]);

  useEffect(() => {
    setRecentHistory(normalizeHistory(userData?.history || []));
  }, [userData?.history]);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return undefined;

    const loadVoices = () => window.speechSynthesis.getVoices();
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setAssistantStatus("unsupported");
      addActivity("Speech recognition is not supported by this browser.");
      return undefined;
    }

    let active = true;
    let restartAllowed = true;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = activeLanguage;

    const clearCommandTimeout = () => {
      if (commandTimeoutRef.current) {
        window.clearTimeout(commandTimeoutRef.current);
        commandTimeoutRef.current = null;
      }
    };

    const returnToWakeMode = () => {
      clearCommandTimeout();
      modeRef.current = "wake";
    };

    const beginCommandMode = () => {
      clearCommandTimeout();
      modeRef.current = "command";
      setAssistantStatus("waiting-command");
      addActivity("Wake word detected, waiting for command.");
      commandTimeoutRef.current = window.setTimeout(
        returnToWakeMode,
        COMMAND_MODE_TIMEOUT_MS,
      );
    };

    const processCommand = async (rawCommand, rawHeard = rawCommand) => {
      const command = normalizeSpeech(rawCommand);
      if (processingRef.current || command.length < 2) return;

      const now = Date.now();
      const isDuplicate =
        lastCommandRef.current.text === command &&
        now - lastCommandRef.current.time < DUPLICATE_COMMAND_WINDOW_MS;

      if (isDuplicate) {
        addActivity("Duplicate command ignored.");
        returnToWakeMode();
        return;
      }

      const requestGemini = getGeminiResponseRef.current;
      if (typeof requestGemini !== "function") {
        addActivity("Assistant API is unavailable.");
        returnToWakeMode();
        return;
      }

      processingRef.current = true;
      setAssistantStatus("sending");
      setUserText(rawHeard);
      setAiText("");
      lastCommandRef.current = { text: command, time: now };
      clearCommandTimeout();
      addActivity(`Sending command: ${command}`);

      try {
        const data = await requestGemini(command, {
          language: activeLanguageRef.current,
          heardText: rawHeard,
        });
        addActivity(`Response type: ${data?.type || "general"}`);

        if (!shouldListenRef.current) return;

        setAiText(data?.response || "");

        if (data?.history) {
          setRecentHistory(normalizeHistory(data.history));
        } else if (data?.historyItem) {
          setRecentHistory((currentHistory) =>
            normalizeHistory([data.historyItem, ...currentHistory]).slice(0, 50),
          );
        }

        performAssistantAction(data, addActivity);

        if (data?.response) speak(data.response);
      } catch (error) {
        console.error("Assistant request failed:", error);
        addActivity("Assistant request failed.");
        if (shouldListenRef.current) {
          speak(
            activeLanguageRef.current === "hi-IN"
              ? "माफ कीजिए, कुछ गलत हो गया।"
              : "Sorry, something went wrong.",
          );
        }
      } finally {
        processingRef.current = false;
        returnToWakeMode();
        if (active) {
          setAssistantStatus(
            shouldListenRef.current ? "listening" : "sleeping",
          );
        }
      }
    };

    const stopListening = () => {
      shouldListenRef.current = false;
      restartAllowed = false;
      returnToWakeMode();
      setIsListening(false);
      setAssistantStatus("sleeping");
      addActivity("Listening stopped.");

      try {
        recognition.abort();
      } catch (error) {
        console.debug("Speech recognition was already stopped:", error);
      }

      speak(
        activeLanguageRef.current === "hi-IN"
          ? "मैं सो रहा हूं। जरूरत हो तो माइक्रोफोन बटन दबाएं।"
          : "Going to sleep. Press the microphone button when you need me.",
      );
    };

    startListeningRef.current = () => {
      if (!active || shouldListenRef.current) return;

      shouldListenRef.current = true;
      restartAllowed = true;
      modeRef.current = "wake";

      try {
        recognition.start();
      } catch (error) {
        console.warn("Could not resume speech recognition:", error);
      }
    };

    recognition.onstart = () => {
      if (!active) return;
      recognitionStartedAtRef.current = Date.now();
      lastRecognitionErrorRef.current = "";
      setIsListening(true);
      setAssistantStatus("listening");
      addActivity(`Listening in ${activeLanguageRef.current}.`);
    };

    recognition.onresult = (event) => {
      if (!active) return;

      let interimTranscript = "";
      let finalTranscript = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = String(result[0]?.transcript || "").trim();

        if (!transcript) continue;

        if (result.isFinal) {
          finalTranscript = `${finalTranscript} ${transcript}`.trim();
        } else {
          interimTranscript = `${interimTranscript} ${transcript}`.trim();
        }
      }

      if (interimTranscript) {
        setHeardText(interimTranscript);
        setAssistantStatus("hearing");
      }

      if (!finalTranscript) return;

      fastAbortRestartCountRef.current = 0;
      lastRecognitionErrorRef.current = "";
      setHeardText(finalTranscript);
      setUserText(finalTranscript);

      const transcript = normalizeSpeech(finalTranscript);
      const wakeWord = normalizeSpeech(assistantNameRef.current);
      const sleepPhrases = ["sleep", "go to sleep", "stop listening", "सो जाओ", "बंद हो जाओ", "रुक जाओ"];
      const askedToSleep =
        wakeWord &&
        transcript.includes(wakeWord) &&
        sleepPhrases.some((phrase) => transcript.includes(normalizeSpeech(phrase)));

      addActivity(`Heard: ${finalTranscript}`);
      addActivity(`Mode: ${modeRef.current}`);

      if (askedToSleep) {
        stopListening();
        return;
      }

      if (processingRef.current || speakingRef.current) {
        addActivity("Speech ignored while assistant is busy.");
        return;
      }

      if (modeRef.current === "command") {
        void processCommand(finalTranscript, finalTranscript);
        return;
      }

      if (wakeWord) {
        const wakeWordIndex = transcript.indexOf(wakeWord);

        if (wakeWordIndex !== -1) {
          const commandAfterWakeWord = finalTranscript
            .slice(wakeWordIndex + assistantNameRef.current.length)
            .trim();

          if (normalizeSpeech(commandAfterWakeWord).length >= 2) {
            void processCommand(commandAfterWakeWord, finalTranscript);
          } else {
            beginCommandMode();
            speak(activeLanguageRef.current === "hi-IN" ? "जी" : "Yes");
          }

          return;
        }
      }

      if (looksLikeDirectCommand(transcript)) {
        void processCommand(finalTranscript, finalTranscript);
        return;
      }

      if (transcript.length >= 2) {
        void processCommand(finalTranscript, finalTranscript);
      }
    };

    recognition.onerror = (event) => {
      if (!active) return;

      lastRecognitionErrorRef.current = event.error;

      if (event.error === "aborted") {
        restartAllowed = false;
        shouldListenRef.current = false;
        setIsListening(false);
        setAssistantStatus("sleeping");
        addActivity("Microphone was aborted by the browser. Auto-restart stopped. Press Start to try again.");
        return;
      }

      console.warn("Speech recognition error:", event.error);
      addActivity(`Speech recognition error: ${event.error}`);

      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        restartAllowed = false;
        setAssistantStatus("permission-denied");
      }
    };

    recognition.onend = () => {
      if (!active) return;

      setIsListening(false);
      addActivity("Speech recognition ended.");
      if (!restartAllowed || !shouldListenRef.current) return;

      const endedAfterMs = Date.now() - recognitionStartedAtRef.current;
      const endedFromAbort = lastRecognitionErrorRef.current === "aborted";

      if (endedFromAbort) {
        restartAllowed = false;
        shouldListenRef.current = false;
        setAssistantStatus("sleeping");
        addActivity("Recognition ended after abort. Waiting for manual Start.");
        return;
      }

      if (endedFromAbort && endedAfterMs < 1500) {
        fastAbortRestartCountRef.current += 1;
      } else if (!endedFromAbort) {
        fastAbortRestartCountRef.current = 0;
      }

      if (fastAbortRestartCountRef.current > MAX_FAST_ABORT_RESTARTS) {
        restartAllowed = false;
        shouldListenRef.current = false;
        setAssistantStatus("sleeping");
        addActivity(
          "Browser keeps aborting the microphone. Check mic permission/focus, then press Start.",
        );
        return;
      }

      setAssistantStatus("restarting");
      const restartDelay = endedFromAbort
        ? RECOGNITION_ABORT_BACKOFF_MS * fastAbortRestartCountRef.current
        : RECOGNITION_RESTART_DELAY_MS;

      recognitionRestartRef.current = window.setTimeout(() => {
        if (!active || !restartAllowed) return;

        try {
          recognition.start();
        } catch (error) {
          console.warn("Could not restart speech recognition:", error);
        }
      }, restartDelay);
    };

    try {
      shouldListenRef.current = true;
      recognition.start();
    } catch (error) {
      console.error("Could not start speech recognition:", error);
      addActivity("Could not start speech recognition.");
    }

    return () => {
      active = false;
      restartAllowed = false;
      shouldListenRef.current = false;
      clearCommandTimeout();

      if (recognitionRestartRef.current) {
        window.clearTimeout(recognitionRestartRef.current);
        recognitionRestartRef.current = null;
      }

      recognition.onresult = null;
      recognition.onstart = null;
      recognition.onerror = null;
      recognition.onend = null;
      startListeningRef.current = null;

      try {
        recognition.abort();
      } catch (error) {
        console.debug("Speech recognition was already stopped:", error);
      }

      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }

      speechIdRef.current += 1;
      speakingRef.current = false;
      window.speechSynthesis?.cancel();
    };
  }, [activeLanguage, addActivity, speak]);

  const statusText = {
    sending: "Sending request...",
    hearing: "Hearing speech...",
    listening: "Listening...",
    sleeping: "Sleeping",
    restarting: "Restarting microphone...",
    starting: "Starting microphone...",
    "waiting-command": "Waiting for command...",
    "permission-denied": "Microphone permission denied",
    unsupported: "Speech recognition unsupported",
  }[assistantStatus] || "Starting microphone...";

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-950 via-slate-900 to-cyan-950 px-4 py-6 text-white md:px-6">
      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-7xl flex-col rounded-2xl border border-white/15 bg-white/10 p-4 shadow-2xl backdrop-blur-xl md:p-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500 shadow-lg shadow-cyan-500/30">
              <FaRobot className="text-2xl" />
            </span>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-200">
                Personal AI
              </p>
              <h1 className="text-xl font-bold md:text-2xl">{assistantName}</h1>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-2" aria-label="Assistant controls">
            <div className="flex overflow-hidden rounded-xl border border-cyan-300/30 bg-cyan-500/10">
              {languageOptions.map((language) => (
                <button
                  key={language.code}
                  type="button"
                  onClick={() => handleLanguageChange(language.code)}
                  className={`flex h-11 items-center gap-2 px-3 text-sm font-semibold transition ${
                    activeLanguage === language.code
                      ? "bg-cyan-500 text-white"
                      : "text-cyan-100 hover:bg-white/10"
                  }`}
                  title={`Use ${language.label}`}
                >
                  <FaGlobe />
                  <span>{language.shortLabel}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="flex h-11 items-center gap-2 rounded-xl border border-cyan-300/30 bg-cyan-500/10 px-3 transition hover:border-cyan-300 hover:bg-cyan-500/20"
              title="Show history"
            >
              <FaHistory className="text-cyan-300" />
              <span className="hidden font-semibold md:inline">History</span>
            </button>

            <button
              type="button"
              onClick={resumeListening}
              disabled={isListening}
              className="flex h-11 items-center gap-2 rounded-xl border border-emerald-300/30 bg-emerald-500/10 px-3 transition hover:border-emerald-300 hover:bg-emerald-500/20 disabled:cursor-default disabled:opacity-70"
              title={isListening ? "Microphone is listening" : "Resume listening"}
            >
              {isListening ? (
                <FaMicrophone className="text-emerald-300" />
              ) : (
                <FaMicrophoneSlash className="text-red-300" />
              )}
              <span className="hidden font-semibold md:inline">
                {isListening ? "Listening" : "Start"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/customize")}
              className="flex h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 transition hover:border-cyan-300 hover:bg-white/20"
              title="Customize assistant"
            >
              <FaMagic className="text-cyan-300" />
              <span className="hidden font-semibold md:inline">Customize</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex h-11 items-center gap-2 rounded-xl border border-red-300/30 bg-red-500/10 px-3 transition hover:border-red-300 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              title="Log out"
            >
              <FaSignOutAlt className="text-red-200" />
              <span className="hidden font-semibold md:inline">
                {loggingOut ? "Logging out..." : "Logout"}
              </span>
            </button>
          </nav>
        </header>

        <section className="grid flex-1 gap-6 py-6 lg:grid-cols-[minmax(280px,380px)_1fr]">
          <div className="flex flex-col items-center justify-center">
            <div
              className="mb-5 flex items-center gap-2 rounded-full border border-white/20 bg-gray-950/40 px-4 py-2 text-sm font-semibold"
              role="status"
              aria-live="polite"
            >
              <span
                className={`h-3 w-3 rounded-full ${
                  assistantStatus === "sending"
                    ? "animate-pulse bg-amber-400"
                    : assistantStatus === "listening" ||
                        assistantStatus === "hearing" ||
                        assistantStatus === "waiting-command"
                      ? "animate-pulse bg-emerald-400"
                      : assistantStatus === "restarting" ||
                          assistantStatus === "starting"
                        ? "animate-pulse bg-cyan-400"
                        : "bg-red-400"
                }`}
              />
              <span>{statusText}</span>
            </div>

            <div className="relative">
              <div className="absolute inset-0 scale-105 rounded-[2rem] bg-cyan-400/25 blur-2xl" />
              <div className="relative h-[390px] w-[270px] overflow-hidden rounded-2xl border-4 border-white/80 bg-white/10 shadow-[0_0_45px_rgba(34,211,238,0.35)] sm:h-[480px] sm:w-[330px]">
                <img
                  src={assistantImage}
                  alt={assistantName}
                  className="h-full w-full object-cover"
                />

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-gray-950/95 via-gray-950/60 to-transparent px-5 pb-6 pt-24">
                  <h2 className="text-2xl font-bold">{assistantName}</h2>
                  <p className="mt-1 flex items-center gap-2 text-sm text-cyan-100">
                    <FaVolumeUp />
                    {assistantVoiceTone} voice · {languageLabel}
                  </p>
                </div>
              </div>

              <span className="absolute bottom-5 right-4 h-5 w-5 rounded-full border-4 border-gray-900 bg-emerald-400 shadow-lg shadow-emerald-400/60" />
            </div>

            {isListening && (
              <div className="relative mt-7 h-24 w-24">
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/40" />
                <img
                  src={userImage}
                  alt="Listening"
                  className="relative h-full w-full rounded-full border-2 border-emerald-400 object-cover shadow-lg shadow-emerald-400/50"
                />
              </div>
            )}
          </div>

          <div className="grid content-center gap-4">
            <div className="rounded-2xl border border-white/10 bg-gray-950/35 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">
                Heard by assistant
              </p>
              <p className="mt-3 min-h-10 break-words text-lg leading-7 text-white">
                {heardText || "Say the assistant name, then your command."}
              </p>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-2xl border border-cyan-300/15 bg-cyan-500/10 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">
                  Your command
                </p>
                <p className="mt-3 min-h-14 break-words text-base leading-7 text-gray-100">
                  {userText || "No command processed yet."}
                </p>
              </div>

              <div className="rounded-2xl border border-blue-300/15 bg-blue-500/10 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-300">
                  Assistant response
                </p>
                <p className="mt-3 min-h-14 break-words text-base leading-7 text-gray-100">
                  {aiText || "Response will appear here."}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-gray-950/40 p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FaTerminal className="text-cyan-300" />
                  <h2 className="font-bold">Activity Console</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setActivityLog([])}
                  className="rounded-lg border border-white/10 px-3 py-1 text-sm text-gray-200 transition hover:border-cyan-300 hover:text-white"
                >
                  Clear
                </button>
              </div>

              <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                {activityLog.length === 0 ? (
                  <p className="text-sm text-gray-400">
                    Live listening, request, action, and response events will show here.
                  </p>
                ) : (
                  activityLog.map((item) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-[72px_1fr] gap-3 rounded-lg bg-white/5 px-3 py-2 text-sm"
                    >
                      <span className="text-cyan-300">{item.time}</span>
                      <span className="break-words text-gray-100">{item.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      {historyOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-gray-950/70 backdrop-blur-sm"
            onClick={() => setHistoryOpen(false)}
            aria-label="Close history"
          />

          <aside
            className="fixed inset-y-0 right-0 z-50 flex w-[90vw] max-w-md flex-col border-l border-cyan-300/20 bg-gradient-to-b from-gray-900 via-slate-950 to-cyan-950 p-5 text-white shadow-2xl shadow-cyan-950/60 md:w-[430px] md:p-6"
            aria-label="Recent assistant history"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-5">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300">
                  <FaHistory />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                    Assistant
                  </p>
                  <h2 className="text-xl font-bold">Recent History</h2>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 transition hover:border-red-300/50 hover:bg-red-500/10"
                  aria-label="Clear history"
                  title="Clear history"
                >
                  <FaTrash />
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 transition hover:border-red-300/50 hover:bg-red-500/10"
                  aria-label="Close history"
                >
                  <FaTimes />
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 border-b border-white/10 pb-5 md:hidden">
              <button
                type="button"
                onClick={() => {
                  resumeListening();
                  setHistoryOpen(false);
                }}
                disabled={isListening}
                className="flex w-full items-center gap-3 rounded-xl border border-emerald-300/20 bg-emerald-500/10 px-4 py-3 text-left transition hover:border-emerald-300 hover:bg-emerald-500/20 disabled:cursor-default disabled:opacity-70"
              >
                {isListening ? (
                  <FaMicrophone className="text-emerald-300" />
                ) : (
                  <FaMicrophoneSlash className="text-red-300" />
                )}
                <span className="font-semibold">
                  {isListening ? "Listening" : "Start listening"}
                </span>
              </button>
            </div>

            <div className="mt-5 flex-1 space-y-4 overflow-y-auto pr-1">
              {recentHistory.length === 0 ? (
                <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-cyan-300/20 bg-white/5 px-6 text-center">
                  <FaBars className="mb-4 text-4xl text-cyan-300/60" />
                  <p className="font-semibold">No recent history</p>
                  <p className="mt-2 text-sm leading-6 text-gray-400">
                    Commands and responses are saved here after each request.
                  </p>
                </div>
              ) : (
                recentHistory.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 shadow-lg shadow-gray-950/20"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3 text-xs text-gray-400">
                      <span className="rounded-full bg-cyan-500/10 px-2.5 py-1 font-semibold text-cyan-300">
                        {item.type.replaceAll("_", " ")}
                      </span>
                      <time>{item.time}</time>
                    </div>

                    <div className="rounded-xl bg-cyan-500/10 p-3">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-cyan-300">
                        Heard
                      </p>
                      <p className="break-words text-sm leading-6 text-gray-100">
                        {item.heardText || item.command}
                      </p>
                    </div>

                    <div className="mt-3 rounded-xl bg-blue-500/10 p-3">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-blue-300">
                        {assistantName}
                      </p>
                      <p className="break-words text-sm leading-6 text-gray-200">
                        {item.response || "No response saved for this older item."}
                      </p>
                    </div>
                  </article>
                ))
              )}
            </div>

            <p className="mt-4 border-t border-white/10 pt-4 text-center text-xs text-gray-400">
              Showing up to 50 saved requests
            </p>
          </aside>
        </>
      )}
    </main>
  );
};

export default Home;
