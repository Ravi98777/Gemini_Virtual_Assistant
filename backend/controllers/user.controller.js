import User from "../modals/user.models.js";
import uploadOnCloudinary from "../config/cloudinary.js";
import geminiResponse from "../gemini.js";
import {
  createHistoryItem,
  formatTimedResponse,
  normalizeLanguage,
  normalizeType,
  resolveLocalCommand,
} from "../utils/assistantCommand.js";

const sanitizeHistory = (history = []) =>
  history
    .map((item, index) => {
      if (typeof item === "string") {
        return {
          id: `legacy-${index}`,
          command: item,
          heardText: item,
          response: "",
          type: "legacy",
          userInput: item,
          language: "en-US",
          createdAt: null,
          order: index,
        };
      }

      return {
        ...item,
        order: index,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;

      if (aTime || bTime) return bTime - aTime;
      return b.order - a.order;
    })
    .slice(0, 50)
    .map(({ order, ...item }) => item);

const sendAssistantResult = async ({
  res,
  user,
  command,
  heardText,
  language,
  result,
}) => {
  const type = normalizeType(result.type);
  const response = ["get_time", "get_date", "get_day", "get_month"].includes(type)
    ? formatTimedResponse(type, language)
    : result.response;

  const payload = {
    type,
    userInput: result.userInput || command,
    response: response || "Done.",
    language,
  };

  const historyItem = createHistoryItem({
    command,
    heardText,
    language,
    result: payload,
  });

  user.history = [historyItem, ...sanitizeHistory(user.history)].slice(0, 50);
  await user.save();

  return res.json({
    ...payload,
    historyItem,
    history: sanitizeHistory(user.history),
  });
};

export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userObject = user.toObject();
    userObject.history = sanitizeHistory(userObject.history);

    return res.status(200).json(userObject);
  } catch (error) {
    console.error("Get current user error:", error);

    return res.status(500).json({
      message: "Unable to get the current user",
    });
  }
};

export const updateAssistant = async (req, res) => {
  try {
    const assistantName = req.body.assistantName?.trim();
    const imageUrl = req.body.imageUrl?.trim();
    const assistantVoice = ["male", "female"].includes(req.body.assistantVoice)
      ? req.body.assistantVoice
      : "female";
    const preferredLanguage = normalizeLanguage(req.body.preferredLanguage);

    if (!assistantName) {
      return res.status(400).json({
        message: "Assistant name is required",
      });
    }

    if (!req.file && !imageUrl) {
      return res.status(400).json({
        message: "Assistant image is required",
      });
    }

    let assistantImage = imageUrl;

    if (req.file) {
      const uploadResult = await uploadOnCloudinary(req.file.path);

      assistantImage =
        uploadResult?.secure_url || uploadResult?.url || uploadResult;

      if (!assistantImage || typeof assistantImage !== "string") {
        throw new Error("Cloudinary did not return an image URL");
      }
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { assistantName, assistantImage, assistantVoice, preferredLanguage },
      { new: true, runValidators: true },
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userObject = user.toObject();
    userObject.history = sanitizeHistory(userObject.history);

    return res.status(200).json(userObject);
  } catch (error) {
    console.error("Update assistant error:", error);

    return res.status(500).json({
      message: error.message || "Unable to update the assistant",
    });
  }
};

export const askToAssistant = async (req, res) => {
  try {
    const command = String(req.body.command || "").trim();
    const heardText = String(req.body.heardText || command).trim();

    if (!command) {
      return res.status(400).json({ response: "Please say a command first." });
    }

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ response: "User not found." });
    }

    const language = normalizeLanguage(
      req.body.language || user.preferredLanguage,
      command,
    );

    console.log("[Assistant] Command received:", {
      command,
      heardText,
      language,
    });

    const localResult = resolveLocalCommand(command, language);

    if (localResult) {
      console.log("[Assistant] Fast local intent:", localResult.type);
      return sendAssistantResult({
        res,
        user,
        command,
        heardText,
        language,
        result: localResult,
      });
    }

    const rawGeminiResult = await geminiResponse(
      command,
      user.assistantName,
      user.name,
      language,
    );
    console.log("[Assistant] Gemini raw response:", rawGeminiResult);

    const jsonMatch = rawGeminiResult.match(/{[\s\S]*}/);

    if (!jsonMatch) {
      return sendAssistantResult({
        res,
        user,
        command,
        heardText,
        language,
        result: {
          type: "general",
          userInput: command,
          response:
            language === "hi-IN"
              ? "माफ कीजिए, मैं इसे समझ नहीं पाया।"
              : "Sorry, I could not understand that.",
        },
      });
    }

    const gemResult = JSON.parse(jsonMatch[0]);

    return sendAssistantResult({
      res,
      user,
      command,
      heardText,
      language,
      result: {
        type: normalizeType(gemResult.type),
        userInput: gemResult.userInput || command,
        response: gemResult.response,
      },
    });
  } catch (error) {
    console.error("Ask assistant error:", error);
    return res.status(500).json({ response: "Ask assistant error." });
  }
};

export const clearAssistantHistory = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.userId,
      { history: [] },
      { new: true },
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userObject = user.toObject();
    userObject.history = [];

    return res.status(200).json(userObject);
  } catch (error) {
    console.error("Clear history error:", error);

    return res.status(500).json({
      message: "Unable to clear assistant history",
    });
  }
};
