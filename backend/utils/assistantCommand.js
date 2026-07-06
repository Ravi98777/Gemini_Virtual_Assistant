import moment from "moment";

export const SUPPORTED_LANGUAGES = new Set(["en-US", "hi-IN"]);

const appCommands = [
  {
    type: "calculator_open",
    input: "calculator",
    aliases: ["calculator", "calc", "कैलकुलेटर", "गणक"],
  },
  {
    type: "instagram_open",
    input: "instagram",
    aliases: ["instagram", "insta", "इंस्टाग्राम"],
  },
  {
    type: "facebook_open",
    input: "facebook",
    aliases: ["facebook", "fb", "फेसबुक"],
  },
  {
    type: "youtube_open",
    input: "youtube",
    aliases: ["youtube", "you tube", "यूट्यूब"],
  },
  {
    type: "google_open",
    input: "google",
    aliases: ["google", "गूगल"],
  },
  {
    type: "gmail_open",
    input: "gmail",
    aliases: ["gmail", "email", "mail", "जीमेल", "ईमेल"],
  },
  {
    type: "maps_open",
    input: "maps",
    aliases: ["maps", "google maps", "map", "मैप", "नक्शा"],
  },
  {
    type: "whatsapp_open",
    input: "whatsapp",
    aliases: ["whatsapp", "what's app", "वाट्सऐप", "व्हाट्सएप"],
  },
  {
    type: "spotify_open",
    input: "spotify",
    aliases: ["spotify", "स्पॉटिफाई"],
  },
];

const hasHindi = (value = "") => /[\u0900-\u097F]/.test(value);

export const normalizeLanguage = (language, command = "") => {
  if (SUPPORTED_LANGUAGES.has(language)) return language;
  return hasHindi(command) ? "hi-IN" : "en-US";
};

export const normalizeType = (type = "general") =>
  String(type).trim().toLowerCase().replaceAll("-", "_");

const cleanQuery = (value = "") =>
  value
    .replace(
      /\b(please|kindly|can you|could you|would you|hey|hi|hello|jarvis|assistant)\b/gi,
      " ",
    )
    .replace(/\b(on|in|from|for|the|a|an|to|now|please)\b/gi, " ")
    .replace(
      /\b(search|find|google|youtube|play|open|show|tell|me|about|song|songs|video|videos)\b/gi,
      " ",
    )
    .replace(
      /(कृपया|प्लीज|खोजो|सर्च|ढूंढो|गूगल|यूट्यूब|चलाओ|बजाओ|खोलो|दिखाओ|बताओ|मुझे|के बारे में|पर|में|अभी|गाना|गाने|वीडियो)/g,
      " ",
    )
    .replace(/[.,!?;:।]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const responseText = (language, english, hindi) =>
  language === "hi-IN" ? hindi : english;

export const formatTimedResponse = (type, language) => {
  switch (type) {
    case "get_time":
      return responseText(
        language,
        `Current time is ${moment().format("hh:mm A")}.`,
        `अभी समय ${moment().format("hh:mm A")} है।`,
      );
    case "get_date":
      return responseText(
        language,
        `Today's date is ${moment().format("YYYY-MM-DD")}.`,
        `आज की तारीख ${moment().format("YYYY-MM-DD")} है।`,
      );
    case "get_day":
      return responseText(
        language,
        `Today is ${moment().format("dddd")}.`,
        `आज ${moment().format("dddd")} है।`,
      );
    case "get_month":
      return responseText(
        language,
        `Current month is ${moment().format("MMMM")}.`,
        `अभी ${moment().format("MMMM")} महीना है।`,
      );
    default:
      return "";
  }
};

export const resolveLocalCommand = (rawCommand = "", language = "en-US") => {
  const command = String(rawCommand).trim();
  const lower = command.toLowerCase();
  const activeLanguage = normalizeLanguage(language, command);

  if (!command) return null;

  if (
    /\b(time|current time|what time)\b/i.test(lower) ||
    /(समय|टाइम|वक्त)/.test(command)
  ) {
    return {
      type: "get_time",
      userInput: command,
      response: formatTimedResponse("get_time", activeLanguage),
    };
  }

  if (
    /\b(date|today'?s date|current date)\b/i.test(lower) ||
    /(तारीख|डेट)/.test(command)
  ) {
    return {
      type: "get_date",
      userInput: command,
      response: formatTimedResponse("get_date", activeLanguage),
    };
  }

  if (
    /\b(day|what day|today day)\b/i.test(lower) ||
    /(दिन|वार)/.test(command)
  ) {
    return {
      type: "get_day",
      userInput: command,
      response: formatTimedResponse("get_day", activeLanguage),
    };
  }

  if (/\b(month|current month)\b/i.test(lower) || /(महीना|माह)/.test(command)) {
    return {
      type: "get_month",
      userInput: command,
      response: formatTimedResponse("get_month", activeLanguage),
    };
  }

  if (/\bweather\b/i.test(lower) || /(मौसम|वेदर)/.test(command)) {
    const query = cleanQuery(command) || command;
    return {
      type: "weather_show",
      userInput: query,
      response: responseText(
        activeLanguage,
        "Showing weather.",
        "मौसम दिखा रहा हूं।",
      ),
    };
  }

  const isYoutube = /\b(youtube|you tube)\b/i.test(lower) || /यूट्यूब/.test(command);
  const isPlay =
    /\b(play|start|listen)\b/i.test(lower) || /(चलाओ|बजाओ|सुनाओ|प्ले)/.test(command);

  if (isYoutube && isPlay) {
    const query = cleanQuery(command) || "music";
    return {
      type: "youtube_play",
      userInput: query,
      response: responseText(
        activeLanguage,
        "Playing on YouTube.",
        "यूट्यूब पर चला रहा हूं।",
      ),
    };
  }

  if (isPlay && /\b(song|songs|music|video|track)\b/i.test(lower)) {
    const query = cleanQuery(command) || "music";
    return {
      type: "youtube_play",
      userInput: query,
      response: responseText(
        activeLanguage,
        "Playing on YouTube.",
        "यूट्यूब पर चला रहा हूं।",
      ),
    };
  }

  if (isPlay && /(गाना|गाने|संगीत|वीडियो)/.test(command)) {
    const query = cleanQuery(command) || "music";
    return {
      type: "youtube_play",
      userInput: query,
      response: responseText(
        activeLanguage,
        "Playing on YouTube.",
        "यूट्यूब पर चला रहा हूं।",
      ),
    };
  }

  if (isYoutube && (/\b(search|find)\b/i.test(lower) || /(खोजो|सर्च|ढूंढो)/.test(command))) {
    const query = cleanQuery(command) || "youtube";
    return {
      type: "youtube_search",
      userInput: query,
      response: responseText(
        activeLanguage,
        "Searching YouTube.",
        "यूट्यूब पर खोज रहा हूं।",
      ),
    };
  }

  if (/\bgoogle\b/i.test(lower) && /\b(search|find)\b/i.test(lower)) {
    const query = cleanQuery(command) || command;
    return {
      type: "google_search",
      userInput: query,
      response: responseText(
        activeLanguage,
        "Searching Google.",
        "गूगल पर खोज रहा हूं।",
      ),
    };
  }

  if (/(गूगल|खोजो|सर्च|ढूंढो)/.test(command) && !isYoutube) {
    const query = cleanQuery(command) || command;
    return {
      type: "google_search",
      userInput: query,
      response: responseText(
        activeLanguage,
        "Searching Google.",
        "गूगल पर खोज रहा हूं।",
      ),
    };
  }

  if (/\b(search|find)\b/i.test(lower)) {
    const query = cleanQuery(command) || command;
    return {
      type: "google_search",
      userInput: query,
      response: responseText(
        activeLanguage,
        "Searching Google.",
        "गूगल पर खोज रहा हूं।",
      ),
    };
  }

  if (/\bopen\b/i.test(lower) || /(खोलो|ओपन)/.test(command)) {
    const app = appCommands.find((item) =>
      item.aliases.some((alias) => lower.includes(alias.toLowerCase()) || command.includes(alias)),
    );

    if (app) {
      return {
        type: app.type,
        userInput: app.input,
        response: responseText(
          activeLanguage,
          `Opening ${app.input}.`,
          `${app.input} खोल रहा हूं।`,
        ),
      };
    }
  }

  return null;
};

export const createHistoryItem = ({
  command,
  heardText,
  language,
  result,
}) => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  command,
  heardText: heardText || command,
  language,
  type: result.type || "general",
  userInput: result.userInput || command,
  response: result.response || "",
  createdAt: new Date(),
});
