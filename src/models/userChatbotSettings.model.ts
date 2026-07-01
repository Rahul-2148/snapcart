import mongoose, { Document, Schema } from "mongoose";

export interface IUserChatbotSettings extends Document {
  userId: mongoose.Types.ObjectId;

  // General
  language: string;
  primaryLanguage: string;
  secondaryLanguage: string;
  theme: "light" | "dark" | "system";
  fontSize: "small" | "medium" | "large";
  density: "compact" | "cozy" | "spacious";
  timeFormat: "12h" | "24h";

  // Appearance
  accentColor: "emerald" | "violet" | "rose" | "amber";
  chatWidth: "narrow" | "normal" | "wide";
  bubbleStyle: "rounded" | "sharp" | "modern";
  borderRadius: string;
  animations: boolean;
  blurEffects: boolean;
  compactMode: boolean;

  // Chat
  enterToSend: boolean;
  markdownEnabled: boolean;
  codeHighlighting: boolean;
  streamingEnabled: boolean;
  autoScroll: boolean;
  typingAnimation: boolean;

  // AI
  responseLength: "short" | "medium" | "detailed";
  creativity: number; // 0 to 1
  temperature: number; // 0 to 1
  preferredModel: string;
  systemPrompt: string;
  memoryEnabled: boolean;
  contextLength: number;

  // Voice
  voiceInputEnabled: boolean;
  voiceOutputEnabled: boolean;
  speechSpeed: number;
  voiceLanguage: string;

  // Notifications
  browserNotifications: boolean;
  soundEnabled: boolean;
  messageAlerts: boolean;

  // Privacy & Advanced
  chatHistoryEnabled: boolean;
  personalizationEnabled: boolean;
  developerMode: boolean;
  debugLogs: boolean;
  experimentalFeatures: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const UserChatbotSettingsSchema = new Schema<IUserChatbotSettings>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    language: { type: String, default: "hinglish" },
    primaryLanguage: { type: String, default: "hinglish" },
    secondaryLanguage: { type: String, default: "en" },
    theme: { type: String, enum: ["light", "dark", "system"], default: "system" },
    fontSize: { type: String, enum: ["small", "medium", "large"], default: "medium" },
    density: { type: String, enum: ["compact", "cozy", "spacious"], default: "cozy" },
    timeFormat: { type: String, enum: ["12h", "24h"], default: "12h" },

    accentColor: { type: String, enum: ["emerald", "violet", "rose", "amber"], default: "emerald" },
    chatWidth: { type: String, enum: ["narrow", "normal", "wide"], default: "normal" },
    bubbleStyle: { type: String, enum: ["rounded", "sharp", "modern"], default: "rounded" },
    borderRadius: { type: String, default: "12px" },
    animations: { type: Boolean, default: true },
    blurEffects: { type: Boolean, default: true },
    compactMode: { type: Boolean, default: false },

    enterToSend: { type: Boolean, default: true },
    markdownEnabled: { type: Boolean, default: true },
    codeHighlighting: { type: Boolean, default: true },
    streamingEnabled: { type: Boolean, default: true },
    autoScroll: { type: Boolean, default: true },
    typingAnimation: { type: Boolean, default: true },

    responseLength: { type: String, enum: ["short", "medium", "detailed"], default: "medium" },
    creativity: { type: Number, default: 0.7 },
    temperature: { type: Number, default: 0.7 },
    preferredModel: { type: String, default: "gemini-1.5-flash" },
    systemPrompt: { type: String, default: "" },
    memoryEnabled: { type: Boolean, default: true },
    contextLength: { type: Number, default: 10 },

    voiceInputEnabled: { type: Boolean, default: true },
    voiceOutputEnabled: { type: Boolean, default: true },
    speechSpeed: { type: Number, default: 1.0 },
    voiceLanguage: { type: String, default: "en-US" },

    browserNotifications: { type: Boolean, default: false },
    soundEnabled: { type: Boolean, default: false },
    messageAlerts: { type: Boolean, default: true },

    chatHistoryEnabled: { type: Boolean, default: true },
    personalizationEnabled: { type: Boolean, default: true },
    developerMode: { type: Boolean, default: false },
    debugLogs: { type: Boolean, default: false },
    experimentalFeatures: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const UserChatbotSettings =
  mongoose.models.UserChatbotSettings ||
  mongoose.model<IUserChatbotSettings>("UserChatbotSettings", UserChatbotSettingsSchema);
