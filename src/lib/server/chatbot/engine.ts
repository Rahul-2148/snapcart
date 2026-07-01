import { SuggestionFeedback } from "@/models/suggestionFeedback.model";

import { buildRoleAwareContext } from "./context";
import { getInScopeDetailsForRole, getQuickActionsForRole, getSystemPolicyForRole } from "./knowledge";
import { ChatMessage, ChatProductContext, SnapcartRole } from "./types";

const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const GEMINI_MODELS = (process.env.GEMINI_MODELS || "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

const DEFAULT_GEMINI_MODELS = [
  "gemini-2.0-flash",
  "gemini-1.5-flash-latest",
  "gemini-1.5-pro-latest",
  "gemini-2.5-flash",
  "gemini-2.5-pro",
];

const GROQ_MODELS = [
  "llama-3.1-70b-versatile",
  "llama-3.1-8b-instant",
  "mixtral-8x7b-32768",
  "gemma2-9b-it",
];

type LlmProvider = "openai" | "gemini" | "groq";

function safeJson(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return "{}";
  }
}

function getRoleAnswerFormat(role: SnapcartRole) {
  if (role === "admin") {
    return [
      "Admin Answer Format:",
      "1) Ops Snapshot: 3-6 key live metrics in short bullets.",
      "2) If query is about banners, include Banner Snapshot (active mix, freshness, CTA hygiene).",
      "2) Risk Alerts: top 2-3 operational risks with why.",
      "3) Action Plan: prioritized actions (Now, Next, Later).",
      "4) If trend data exists, mention whether improving or worsening.",
      "5) Keep response practical and dashboard-ready.",
    ].join("\n");
  }

  if (role === "deliveryBoy") {
    return [
      "Delivery Answer Format:",
      "1) Shift Snapshot: active load + delivered today + high-priority items.",
      "2) Risk Alerts: OTP pending, overdue tasks, cancellation risk.",
      "3) Next Actions: priority-wise actionable steps.",
      "4) Mention quick customer communication line if delays are likely.",
    ].join("\n");
  }

  return [
    "User Answer Format:",
    "1) Direct answer first.",
    "2) If user asks capability/scope, list role in-scope areas in short bullets.",
    "2) Short steps inside app.",
    "3) Optional quick tip for faster resolution.",
  ].join("\n");
}

function isGreetingOrSmallTalk(input: string) {
  const text = normalizeText(input);
  if (!text) return false;

  const greetings = [
    "hi",
    "hii",
    "hello",
    "hey",
    "hlw",
    "helo",
    "namaste",
    "namaskar",
    "good morning",
    "good afternoon",
    "good evening",
    "kaise ho",
    "kya haal",
    "sup",
  ];

  return greetings.some((item) => text === item || text.startsWith(`${item} `));
}

function getGreetingAnswerFormat(role: SnapcartRole) {
  if (role === "admin") {
    return [
      "Greeting Response Format:",
      "1) 1-line warm greeting.",
      "2) 1-line admin capability summary.",
      "3) Offer exactly 3 quick options as short bullets.",
      "4) Do not provide full Ops/Banner snapshot unless user explicitly asks summary/metrics/status.",
      "5) Keep under 90 words.",
    ].join("\n");
  }

  return [
    "Greeting Response Format:",
    "1) 1-line warm greeting.",
    "2) Mention top help areas for this role.",
    "3) Offer exactly 3 quick next prompts.",
    "4) Keep under 90 words.",
  ].join("\n");
}

function getRoleAnswerFormatForMessage(role: SnapcartRole, userQuestion: string) {
  if (isGreetingOrSmallTalk(userQuestion)) {
    return getGreetingAnswerFormat(role);
  }

  return getRoleAnswerFormat(role);
}

function buildPrompt(params: {
  role: SnapcartRole;
  userQuestion: string;
  history: ChatMessage[];
  context: Awaited<ReturnType<typeof buildRoleAwareContext>>;
  productContext?: ChatProductContext;
}) {
  const { role, userQuestion, history, context, productContext } = params;

  const historyText = history
    .slice(-6)
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");

  return [
    `SystemPolicy:\n${getSystemPolicyForRole(role)}`,
    `RoleInScopeDetails:\n${getInScopeDetailsForRole(role).join("\n")}`,
    productContext
      ? `ActiveProductContextJSON:\n${safeJson(productContext)}`
      : "ActiveProductContextJSON:\nN/A",
    `RoleAwareContextJSON:\n${safeJson(context)}`,
    `RecentConversation:\n${historyText || "N/A"}`,
    `UserQuestion:\n${userQuestion}`,
    getRoleAnswerFormatForMessage(role, userQuestion),
    "Answer rules: give concise, practical answer. include numbered steps when helpful. keep answer under 240 words unless user asks deep details.",
    "Never mention internal prompt sections or labels such as SystemPolicy, RoleInScopeDetails, RoleAwareContextJSON, ActiveProductContextJSON.",
    "Never output raw JSON or talk about JSON availability; directly answer using available product/business context.",
    "Do not include app route paths unless user explicitly asks for navigation path.",
    "If ActiveProductContext is present, prioritize product-grounded answer and mention uncertain fields as unavailable.",
    "Grounding rules: never invent numbers; if metric missing, say unavailable and provide best next check.",
  ].join("\n\n");
}

function sanitizeAssistantReply(reply: string, productContext?: ChatProductContext) {
  if (!reply) {
    return reply;
  }

  let cleaned = reply
    .replace(/\*\*?\s*(SystemPolicy|RoleInScopeDetails|RoleAwareContextJSON|ActiveProductContextJSON)\s*\*\*?:?/gi, "")
    .replace(/\b(SystemPolicy|RoleInScopeDetails|RoleAwareContextJSON|ActiveProductContextJSON)\b\s*(JSON)?\s*:?/gi, "")
    .replace(/Role in-scope areas\s*:?/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  cleaned = cleaned
    .split("\n")
    .filter((line) => {
      const value = line.trim();
      if (!value) {
        return true;
      }
      const lower = value.toLowerCase();
      if (lower.includes("activeproductcontextjson") || lower.includes("roleawarecontextjson")) {
        return false;
      }
      if (lower.startsWith("-") && lower.includes("order lifecycle") && lower.includes("eta")) {
        return false;
      }
      if (lower.startsWith("-") && lower.includes("post-order support")) {
        return false;
      }
      if (lower.startsWith("-") && lower.includes("user workspace flows")) {
        return false;
      }
      return true;
    })
    .join("\n")
    .trim();

  if (productContext && /json|activeproductcontext|role in-scope|available|unavailable/i.test(cleaned)) {
    cleaned = [
      `${productContext.name} ke liye quick recommendation: agar aapki monthly usage high hai (large family/business), to 2 × 10 kg variant practical rahega; low usage par smaller packs better fresh rehte hain.`,
      "Aap monthly consumption (kg) aur family size bata do, mai exact best variant suggest kar dunga.",
    ].join("\n\n");
  }

  return cleaned;
}

async function callOpenAICompat(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: "You are Snapcart advanced AI assistant.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`LLM request failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content?.trim() || null;
}

async function callGemini(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const models = GEMINI_MODELS.length > 0 ? GEMINI_MODELS : DEFAULT_GEMINI_MODELS;

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: prompt }],
              },
            ],
          }),
        },
      );

      if (!response.ok) {
        continue;
      }

      const json = await response.json();
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (text) {
        return text;
      }
    } catch {
      continue;
    }
  }

  return null;
}

async function callGroq(prompt: string) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return null;
  }

  for (const model of GROQ_MODELS) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.3,
          max_tokens: 800,
          messages: [
            {
              role: "system",
              content: "You are Snapcart advanced AI assistant.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        continue;
      }

      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content?.trim();
      if (text) {
        return text;
      }
    } catch {
      continue;
    }
  }

  return null;
}

async function generateWithAvailableProviders(prompt: string) {
  const providers: Array<{ name: LlmProvider; run: () => Promise<string | null> }> = [
    { name: "openai", run: () => callOpenAICompat(prompt) },
    { name: "gemini", run: () => callGemini(prompt) },
    { name: "groq", run: () => callGroq(prompt) },
  ];

  for (const provider of providers) {
    try {
      const text = await provider.run();
      if (text) {
        return { text, provider: provider.name };
      }
    } catch (error) {
      console.error(`Chatbot ${provider.name} provider error:`, error);
    }
  }

  return null;
}

function buildFallbackAnswer(params: {
  role: SnapcartRole;
  context: Awaited<ReturnType<typeof buildRoleAwareContext>>;
}) {
  const { role, context } = params;

  const roleSpecific = Object.entries(context.roleStats)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join("\n");

  return [
    `Main Snapcart Assistant online hai (${role}).`,
    "Abhi AI provider response available nahi mila, isliye mai live Snapcart context summary de raha hoon:",
    `- totalOrders: ${context.global.totalOrders}`,
    `- openOrders: ${context.global.openOrders}`,
    `- pendingReturns: ${context.global.pendingReturns}`,
    roleSpecific || "- role-specific stats: unavailable",
    "Detailed AI response ke liye OPENAI_API_KEY ya GEMINI_API_KEY ya GROQ_API_KEY me se kam se kam ek configure karein.",
  ].join("\n");
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getTopKeywords(input: string) {
  const stopWords = new Set([
    "mera",
    "meri",
    "mere",
    "please",
    "kya",
    "kaise",
    "hai",
    "help",
    "with",
    "about",
    "for",
    "the",
    "and",
    "order",
    "status",
    "return",
    "refund",
    "payment",
    "delivery",
    "snapcart",
  ]);

  return normalizeText(input)
    .split(" ")
    .filter((token) => token.length >= 4 && !stopWords.has(token))
    .slice(0, 3);
}

function detectIntents(input: string) {
  const text = normalizeText(input);
  const intents: string[] = [];

  if (/(order|track|where|late|eta|timeline|shipment|arrive)/.test(text)) intents.push("order_tracking");
  if (/(cancel|return|refund|replace|damaged|broken|defect)/.test(text)) intents.push("returns");
  if (/(payment|coupon|discount|offer|upi|card|wallet|failed)/.test(text)) intents.push("payments");
  if (/(address|slot|reschedule|timeslot|time slot)/.test(text)) intents.push("address_slot");
  if (/(find|search|best|compare|brand|product|grocery|item)/.test(text)) intents.push("product_discovery");
  if (/(assignment|otp|route|drop|partner)/.test(text)) intents.push("delivery_ops");
  if (/(analytics|ops|bottleneck|requests|fleet|admin|dashboard)/.test(text)) intents.push("admin_ops");
  if (/(banner|banners|hero|slider|carousel|cta|campaign banner)/.test(text)) intents.push("banner_ops");

  if (intents.length === 0) intents.push("general");
  return intents;
}

function getIntentSuggestionBank(role: SnapcartRole) {
  const common = {
    order_tracking: [
      "Expected delivery ETA minute-level me batao",
      "Agar order late ho to compensation options kya hain?",
      "Order timeline me next status ka estimate do",
      "Delivery partner contact kab show hota hai?",
    ],
    returns: [
      "Return pickup schedule ka fastest option kya hai?",
      "Refund kitne working days me aayega exact batao",
      "Replacement vs refund me best choice suggest karo",
      "Return approval delay ho to kya karu?",
    ],
    payments: [
      "Failed payment retry ka safest flow batao",
      "Mere cart ke liye best coupon stack suggest karo",
      "UPI vs card cashback me better option kya hai?",
      "Partial payment fail case me next step kya hoga?",
    ],
    address_slot: [
      "Delivery slot immediately change karne ke steps do",
      "Address change cut-off time kya hota hai?",
      "Weekend slot availability kaise check karu?",
    ],
    product_discovery: [
      "Budget-friendly alternatives suggest karo",
      "Top rated options quick compare me dikhao",
      "Same category ke best value packs batao",
      "Freshness aur rating ke basis pe best pick do",
    ],
    general: [
      "Mujhe abhi sabse useful next step kya lena chahiye?",
      "Is query ko faster resolve karne ka shortcut batao",
      "Aap is situation ke 2 best options suggest karo",
    ],
  };

  if (role === "deliveryBoy") {
    return {
      ...common,
      order_tracking: [
        "Aaj ke assigned orders ka execution sequence suggest karo",
        "Late-risk deliveries ko priority order me list karo",
        "On-the-way orders ke ETA delays reduce ka plan do",
      ],
      returns: [
        "Return pickup assignments ko fast close kaise karu?",
        "Return handoff me common mistakes aur unka fix batao",
        "Replacement-return delivery steps ka checklist do",
      ],
      payments: [
        "COD/payment confusion cases me customer ko kya explain karu?",
        "Payment-related delivery disputes handle karne ka script do",
        "Failed payment order handoff pe kya protocol follow karu?",
      ],
      address_slot: [
        "Address mismatch case me quickest escalation flow batao",
        "Slot mismatch par customer communication template do",
        "Reschedule request aane par next best action kya hai?",
      ],
      general: [
        "Aaj ke deliveries ka priority execution plan do",
        "Pending OTP aur overdue tasks ka quick closure flow batao",
        "Shift performance improve karne ke 3 practical actions do",
      ],
      delivery_ops: [
        "Aaj ke drops ka most efficient route suggest karo",
        "Pending OTP deliveries ko priority order me list karo",
        "Late risk orders identify karke action plan do",
        "Delivery proof upload best-practice quick checklist do",
      ],
    };
  }

  if (role === "admin") {
    return {
      ...common,
      order_tracking: [
        "Order pipeline health snapshot do with top bottlenecks",
        "Stuck orders reduce karne ke immediate admin levers batao",
        "Open orders aging analysis do aur priority buckets batao",
      ],
      returns: [
        "Return backlog ka root-cause split do",
        "High-impact return SLA recovery plan do",
        "Return approvals accelerate karne ke 3 admin actions do",
      ],
      payments: [
        "Failed payments trend aur impact analysis do",
        "Payment success rate improve karne ke quick wins do",
        "Checkout payment drop-off ko reduce karne ka action plan do",
      ],
      address_slot: [
        "Slot capacity stress points identify karo",
        "Reschedule spikes handle karne ke ops levers batao",
        "Address/slot failures reduce karne ke preventive checks do",
      ],
      product_discovery: [
        "Category demand signal ke basis par merchandising suggestions do",
        "Low-conversion categories ke liye visibility strategy do",
        "Search-discovery funnel improve karne ke top actions do",
      ],
      general: [
        "Today operations summary do",
        "Top 3 admin risks with impact batao",
        "Next 24 hours ke quick-win actions suggest karo",
      ],
      admin_ops: [
        "Ops bottleneck ka root-cause breakdown do",
        "Pending returns reduce karne ke 3 quick levers do",
        "Role requests triage priority strategy do",
        "Delivery fleet utilization improve karne ke actions do",
      ],
      banner_ops: [
        "Banner health snapshot do: active/inactive mix + latest update",
        "Top banner CTA links ka quality check batao",
        "Banner ordering optimize karne ke quick rules do",
        "Low-performing banner refresh plan do",
      ],
    };
  }

  return {
    ...common,
    delivery_ops: ["Delivery assignment flow ko user perspective se explain karo"],
    admin_ops: ["Admin dashboard me pehle kaunse metrics dekhne chahiye?"],
    banner_ops: ["Banners ka admin workflow explain karo"],
  };
}

function takeRotated(items: string[], seed: string, count: number) {
  if (items.length === 0) return [];
  const start = hashString(seed) % items.length;
  const rotated = [...items.slice(start), ...items.slice(0, start)];
  return rotated.slice(0, count);
}

function buildDynamicSuggestions(params: {
  role: SnapcartRole;
  message: string;
  reply: string;
  history: ChatMessage[];
  blockedSuggestions: Set<string>;
  context: Awaited<ReturnType<typeof buildRoleAwareContext>>;
  productContext?: ChatProductContext;
}) {
  const { role, message, reply, context, history, blockedSuggestions, productContext } = params;
  const baseline = getQuickActionsForRole(role);

  if (productContext) {
    const productName = productContext.name;
    const variantLabel = productContext.variantLabel;
    const productSuggestions = [
      `${productName} ke ingredients aur usage batao`,
      `${productName} ko similar products se compare karo`,
      variantLabel
        ? `${variantLabel} variant mere use-case ke liye sahi hai kya?`
        : `${productName} ka best variant suggest karo`,
    ];

    const filtered = productSuggestions.filter((item) => !blockedSuggestions.has(normalizeText(item)));
    if (filtered.length > 0) {
      return filtered.slice(0, 3);
    }
  }

  if (isGreetingOrSmallTalk(message)) {
    return takeRotated(baseline, `${message}-${role}-greeting`, 3);
  }

  const text = `${message} ${reply}`;
  const intents = detectIntents(text);
  const suggestionBank = getIntentSuggestionBank(role);
  const keywords = getTopKeywords(message);
  const recentUserQuestions = history
    .filter((item) => item.role === "user")
    .slice(-5)
    .map((item) => normalizeText(item.content));

  const suggestions: string[] = [];

  const pushSuggestion = (value: string) => {
    const normalized = value.trim();
    if (!normalized) {
      return;
    }
    const suggestionKey = normalizeText(normalized);
    if (blockedSuggestions.has(suggestionKey)) {
      return;
    }
    const canonical = normalizeText(normalized);
    const alreadyAskedRecently = recentUserQuestions.some((question) => question.includes(canonical));
    if (alreadyAskedRecently) {
      return;
    }
    if (!suggestions.includes(normalized)) {
      suggestions.push(normalized);
    }
  };

  for (const intent of intents) {
    const list = suggestionBank[intent as keyof typeof suggestionBank] || [];
    for (const item of takeRotated(list, `${message}-${intent}-${history.length}`, 2)) {
      pushSuggestion(item);
      if (suggestions.length >= 3) {
        break;
      }
    }
    if (suggestions.length >= 3) {
      break;
    }
  }

  if (suggestions.length < 3 && keywords.length > 0) {
    pushSuggestion(`"${keywords[0]}" ke best alternatives suggest karo`);
  }

  if (role === "user") {
    const recentOrders = Array.isArray(context.roleStats.recentOrders)
      ? context.roleStats.recentOrders
      : [];
    if (recentOrders.length > 0) {
      pushSuggestion("Mera latest order ka detailed timeline dikhao");
    }

    const activeReturns =
      typeof context.roleStats.activeReturns === "number" ? context.roleStats.activeReturns : 0;
    if (activeReturns > 0) {
      pushSuggestion("Mere pending returns me next update kab milega?");
    }
  }

  if (role === "deliveryBoy") {
    pushSuggestion("Aaj ke high-priority drops ka smart route batao");
    const highPriorityActive =
      typeof context.roleStats.highPriorityActive === "number" ? context.roleStats.highPriorityActive : 0;
    const overdueAssignments =
      typeof context.roleStats.overdueAssignments === "number" ? context.roleStats.overdueAssignments : 0;
    const cancelledToday =
      typeof context.roleStats.cancelledToday === "number" ? context.roleStats.cancelledToday : 0;

    if (highPriorityActive > 0) {
      pushSuggestion("High-priority orders ko delay se bachane ka exact action plan do");
    }

    if (overdueAssignments > 0) {
      pushSuggestion("Overdue assignments ko next 30 min me kaise close karu?");
    }

    if (typeof context.roleStats.pendingOtp === "number" && context.roleStats.pendingOtp > 0) {
      pushSuggestion("Pending OTP deliveries ko fast close kaise karu?");
    }

    if (cancelledToday > 0) {
      pushSuggestion("Aaj cancellations kam karne ke liye preventive steps batao");
    }

    if (typeof context.roleStats.deliveredToday === "number" && context.roleStats.deliveredToday > 0) {
      pushSuggestion("Aaj ke performance ko improve karne ke 2 quick optimizations do");
    }
  }

  if (role === "admin") {
    pushSuggestion("Ops Snapshot me top bottleneck identify karo");
    pushSuggestion("Pending returns reduce karne ke 3 quick actions do");
    pushSuggestion("Banner health snapshot do");

    const activeBanners = typeof context.roleStats.activeBanners === "number" ? context.roleStats.activeBanners : 0;
    const inactiveBanners = typeof context.roleStats.inactiveBanners === "number" ? context.roleStats.inactiveBanners : 0;

    if (activeBanners === 0) {
      pushSuggestion("No active banners issue ko immediately kaise fix karein?");
    }

    if (inactiveBanners > 0) {
      pushSuggestion("Inactive banners me se kaunse revive karne chahiye suggest karo");
    }

    if (
      typeof context.roleStats.pendingRoleRequests === "number" &&
      context.roleStats.pendingRoleRequests > 0
    ) {
      pushSuggestion("Pending role requests ka approval priority suggest karo");
    }
  }

  if (suggestions.length < 3) {
    for (const item of takeRotated(baseline, `${message}-${history.length}-baseline`, baseline.length)) {
      pushSuggestion(item);
      if (suggestions.length >= 3) {
        break;
      }
    }
  }

  if (suggestions.length === 0) {
    return takeRotated(baseline, `${message}-${history.length}-fallback`, 3);
  }

  return suggestions.slice(0, 3);
}

async function getBlockedSuggestions(userId?: string) {
  if (!userId) {
    return new Set<string>();
  }

  const feedback = await SuggestionFeedback.find({ userId })
    .sort({ updatedAt: -1 })
    .limit(120)
    .select("suggestionKey sentiment")
    .lean<Array<{ suggestionKey?: string; sentiment?: "up" | "down" }>>();

  const latestSentimentByKey = new Map<string, "up" | "down">();
  for (const item of feedback) {
    const key = (item.suggestionKey || "").trim();
    if (!key || latestSentimentByKey.has(key)) {
      continue;
    }
    if (item.sentiment === "up" || item.sentiment === "down") {
      latestSentimentByKey.set(key, item.sentiment);
    }
  }

  const blocked = new Set<string>();
  for (const [key, sentiment] of latestSentimentByKey.entries()) {
    if (sentiment === "down") {
      blocked.add(key);
    }
  }

  return blocked;
}

export async function generateSnapcartReply(params: {
  role: SnapcartRole;
  userId?: string;
  userName?: string;
  message: string;
  history: ChatMessage[];
  productContext?: ChatProductContext;
}) {
  const context = await buildRoleAwareContext({
    role: params.role,
    userId: params.userId,
    userName: params.userName,
  });

  const prompt = buildPrompt({
    role: params.role,
    userQuestion: params.message,
    history: params.history,
    context,
    productContext: params.productContext,
  });

  let reply = "";
  const providerResult = await generateWithAvailableProviders(prompt);
  reply = providerResult?.text || "";

  if (!reply) {
    reply = buildFallbackAnswer({ role: params.role, context });
  }

  reply = sanitizeAssistantReply(reply, params.productContext);

  const blockedSuggestions = await getBlockedSuggestions(params.userId);

  const suggestions = buildDynamicSuggestions({
    role: context.role,
    message: params.message,
    reply,
    history: params.history,
    blockedSuggestions,
    context,
    productContext: params.productContext,
  });

  return {
    reply,
    role: context.role,
    suggestions,
  };
}
