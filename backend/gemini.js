import axios from "axios";

const fallbackResponse = (command, language, response) =>
  JSON.stringify({
    type: "general",
    userInput: command,
    response,
  });

const geminiResponse = async (
  command,
  assistantName,
  userName,
  language = "en-US",
) => {
  const answerLanguage =
    language === "hi-IN" ? "Hindi using Devanagari script" : "English";

  try {
    const prompt = `
You are ${assistantName}, a voice assistant created by ${userName}.
Reply only with one compact valid JSON object. No markdown. No extra text.

JSON shape:
{"type":"general","userInput":"${command}","response":"short spoken answer"}

Allowed type values:
general, google_search, youtube_search, youtube_play, get_time, get_date,
get_day, get_month, calculator_open, instagram_open, facebook_open,
weather_show, youtube_open, google_open, gmail_open, maps_open,
whatsapp_open, spotify_open

Rules:
- Speak in ${answerLanguage}.
- Keep response under 35 words.
- If the user asks who created you, say ${userName}.
- For search/play/open intents, set userInput to the search text or app name only.
- For ordinary questions, use type "general" and answer directly.

User command: ${command}
`;

    const result = await axios.post(
      process.env.GEMINI_URL,
      {
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 180,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
        timeout: 15000,
      },
    );

    return result.data.candidates[0].content.parts[0].text;
  } catch (error) {
    if (error.response?.status === 429) {
      return fallbackResponse(
        command,
        language,
        language === "hi-IN"
          ? "अभी बहुत ज्यादा अनुरोध आ रहे हैं। कृपया थोड़ी देर बाद फिर कोशिश करें।"
          : "I am receiving too many requests right now. Please try again in a minute.",
      );
    }

    if (error.code === "ECONNABORTED") {
      return fallbackResponse(
        command,
        language,
        language === "hi-IN"
          ? "जवाब आने में ज्यादा समय लग रहा है। कृपया फिर कोशिश करें।"
          : "The response is taking too long. Please try again.",
      );
    }

    console.error(error.response?.data || error.message);

    return fallbackResponse(
      command,
      language,
      language === "hi-IN"
        ? "Gemini से संपर्क करते समय समस्या हुई।"
        : "Something went wrong while contacting Gemini.",
    );
  }
};

export default geminiResponse;
