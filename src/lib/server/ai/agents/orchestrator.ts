import { callAiGateway } from "../gateway";
import { aiTools } from "../tools";
import { getPromptTemplate } from "../prompts";
import { searchGroceries } from "../rag";
import { Grocery } from "@/models/grocery.model";
import { User } from "@/models/user.model";
import { UserAiProfile } from "@/models/userAiProfile.model";
import { Order } from "@/models/order.model";
import { Coupon } from "@/models/coupon.model";
import { UserChatbotSettings } from "@/models/userChatbotSettings.model";
import mongoose from "mongoose";

const ML_ENGINE_URL = (process.env.ML_ENGINE_URL || "http://localhost:8000").replace(/\/$/, "");

export interface AgentAction {
  tool: string;
  arguments: any;
}

export interface AgentResponse {
  reply: string;
  actions: AgentAction[];
  products?: any[];
}

async function runLocalIntelligenceFallback(params: {
  userId: string;
  message: string;
  historyText?: string;
  primaryLanguage?: string;
}): Promise<AgentResponse> {
  const query = params.message.toLowerCase().trim();
  let intent = "product_search";

  // 1. Detect Intent via FastAPI /predict/intent (timeout 1.5s)
  try {
    const response = await fetch(`${ML_ENGINE_URL}/predict/intent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(1500),
      body: JSON.stringify({ text: params.message }),
    });
    if (response.ok) {
      const data = await response.json();
      intent = data.intent;
    }
  } catch (err) {
    console.warn("[Local Fallback] ML Engine intent detection failed or offline. Running regex intent matcher.");
    // Node-side regex intent matcher fallback
    if (/\b(help|can you do|capabilities|features|who are you|what is this|what are you|how to use|how does this work)\b/i.test(query)) {
      intent = "help";
    } else if (/\b(track|where is my|status of my|delivery boy|agent|rider)\b/i.test(query)) {
      intent = "tracking";
    } else if (/\b(refund|return|cancel|policy|policies|exchange)\b/i.test(query)) {
      intent = "policies";
    } else if (/\b(coupon|promo|offer|discount|deal|codes|savings)\b/i.test(query)) {
      intent = "offers";
    } else if (/\b(recommend|suggest|popular|best seller|similar|favourite)\b/i.test(query)) {
      intent = "recommendation";
    } else if (/\b(how to|faq|support|chat|question|work)\b/i.test(query)) {
      intent = "faq";
    } else if (/\b(order|bill|receipt|invoice|payment|history|cart)\b/i.test(query)) {
      intent = "order_help";
    } else if (/\b(hi|hello|hey|namaste|greetings)\b/i.test(query)) {
      intent = "greeting";
    }
  }

  // Intercept capability/help patterns even if python server is online and returns faq/greeting
  if (/\b(help|can you do|capabilities|features|who are you|what is this|what are you|how to use|how does this work)\b/i.test(query)) {
    intent = "help";
  }

  const collectedProducts: any[] = [];
  let reply = "";

  // 2. Handle intent
  if (intent === "tracking" || intent === "order_help") {
    if (params.userId && params.userId !== "000000000000000000000000") {
      try {
        const lastOrder = await Order.findOne({ user: params.userId })
          .sort({ createdAt: -1 })
          .lean();
        if (lastOrder) {
          const dateStr = new Date(lastOrder.createdAt).toLocaleDateString();
          reply = `Aapka sabse naya order (ID: #${lastOrder._id.toString().slice(-6)}) ${dateStr} ko place hua tha.\nStatus: **${lastOrder.status.toUpperCase()}**.\nTotal Value: ₹${lastOrder.price?.grandTotal || lastOrder.total || "N/A"}.\nETA: 10 minutes quick delivery dynamically tracked!`;
        } else {
          reply = "Mujhe aapke account me koi purana order nahi mila. Aap profile me jaakar active orders check kar sakte hain.";
        }
      } catch (err) {
        reply = "Aapke order status ko check karte waqt thodi dikqat aayi. Please order page par dekhein!";
      }
    } else {
      reply = "Order track karne ke liye please login karein.";
    }
  } else if (intent === "policies") {
    reply = `**Snapcart Return & Refund Policy**:\n1. Non-perishable products ko aap delivery ke **7 days** ke andar return kar sakte hain.\n2. Milk, eggs, fruits, aur fresh vegetables jaise items perishable hain. Inhe delivery ke time hi check karke, agar kharab ho, toh rider ko wapas dena hoga.\n3. Orders ko store se pack/dispatch hone se pehle cancel kiya ja sakta hai. Dispatch ke baad cancellation allowed nahi hai.`;
  } else if (intent === "offers") {
    try {
      const coupons = await Coupon.find({ isActive: true }).limit(5).lean();
      if (coupons && coupons.length > 0) {
        reply = `**Snapcart Active Promo Codes**:\n\n` + coupons.map(c => `- **${c.code}**: Get ${c.discountType === "percentage" ? `${c.discountValue}%` : `₹${c.discountValue}`} discount. (Min spend: ₹${c.minCartValue || 0})`).join("\n");
      } else {
        reply = "Filhaal store me koi active coupon code nahi hai. Jaldi hi naye offers aayenge!";
      }
    } catch {
      reply = "Offers page check karein! Active coupons: WELCOME10, FRESH20.";
    }
  } else if (intent === "recommendation") {
    try {
      const topProducts = await Grocery.find({ isActive: true })
        .populate("variants")
        .limit(6)
        .lean();
      collectedProducts.push(...topProducts);
      reply = "Snapcart store me aapke liye ye popular recommendations hain. Aap inhein seedhe check out kar sakte hain:";
    } catch {
      reply = "Hum recommendations load nahi kar paye. Aap search bar se items direct search kar sakte hain!";
    }
  } else if (intent === "faq") {
    try {
      const response = await fetch(`${ML_ENGINE_URL}/predict/faq`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(1500),
        body: JSON.stringify({ text: params.message }),
      });
      if (response.ok) {
        const data = await response.json();
        reply = data.answer;
      } else {
        reply = "Snapcart 24/7 deliver karta hai. Return window 7 days hai non-perishables ke liye.";
      }
    } catch {
      reply = "Snapcart 24/7 deliver karta hai. Delivery time average 10 mins hai. Cancellation dispatch se pehle valid hai.";
    }
  } else if (intent === "greeting") {
    reply = "Hello! Snapcart AI Helper me aapka swagat hai. Main locally coordinate kar raha hoon. Aap store products search kar sakte hain, active discounts dekh sakte hain, aur orders status track kar sakte hain. Aap kya order karna chahenge?";
  } else if (intent === "help") {
    reply = `Main Snapcart ka intelligent assistant hoon. Main aapki help kar sakta hoon:

- **Products Search**: Aap grocery item search kar sakte hain (e.g., 'milk', 'bread', 'maggi').
- **Active Discounts & Offers**: Coupon codes check kar sakte hain.
- **Order History & Tracking**: Aapke orders ka status aur delivery partner details.
- **Refund & Returns**: Return policies aur refunds ki jankari.

Bataiye, main aapki kya madad kar sakta hoon?`;
  } else {
    // default: product_search
    try {
      const searchResults = await searchGroceries(params.message, 6);
      if (searchResults && searchResults.length > 0) {
        const populatedResults = await Grocery.populate(searchResults, { path: "variants" });
        collectedProducts.push(...populatedResults);
        reply = `Main aapke liye ye store products find kiye hain matching "${params.message}":\n\n` + 
          populatedResults.map(p => `- **${p.name}** (${p.brand || "Brand"}): ₹${p.variants?.[0]?.price?.selling || "N/A"}`).join("\n") +
          `\n\nAap inhein direct cart me add kar sakte hain!`;
      } else {
        reply = `Mujhe store catalog me "${params.message}" ke liye koi product nahi mila. Alag keywords try karein.`;
      }
    } catch (err) {
      reply = `Products search karne me kuch technical error aayi. Please manual search bar use karein!`;
    }
  }

  // Prepend localized tone styling
  const userLanguage = params.primaryLanguage || "hinglish";
  if (userLanguage === "hi") {
    // Basic translation fallback for Hindi script (in a real production app, this would query a dictionary or translation engine)
    reply = reply.replace(/Return & Refund Policy/g, "वापसी और रिफंड नीति");
  }

  return {
    reply,
    actions: [],
    products: collectedProducts,
  };
}

export async function runOrchestrator(params: {
  userId: string;
  sessionId?: string;
  role: string;
  message: string;
  historyText?: string;
  mode?: "agent" | "normal" | "expert";
  onProgress?: (event: { status: string }) => void;
  preferredModel?: string;
  primaryLanguage?: string;
}): Promise<AgentResponse> {
  const mode = params.mode || "agent";
  let supervisorPrompt = "";
  let promptText = "";
  const collectedProducts: any[] = [];

  // Fetch user information and AI Profile if logged in
  let userMetaText = "";
  if (params.userId && params.userId !== "000000000000000000000000") {
    try {
      const [userDoc, aiProfileDoc] = await Promise.all([
        User.findById(params.userId).select("name email role").lean<{ name?: string; email?: string; role?: string }>(),
        UserAiProfile.findOne({ userId: params.userId }).lean<any>(),
      ]);

      if (userDoc) {
        userMetaText += `\n[User Profile Info]:\n`;
        userMetaText += `- Name: ${userDoc.name || "N/A"}\n`;
        userMetaText += `- Email: ${userDoc.email || "N/A"}\n`;
        userMetaText += `- System Role: ${params.role} (original: ${userDoc.role || "user"})\n`;
      }

      if (aiProfileDoc) {
        userMetaText += `[User AI Profile (Diet & Allergies)]:\n`;
        if (aiProfileDoc.dietaryPreferences?.length) {
          userMetaText += `- Dietary Preferences: ${aiProfileDoc.dietaryPreferences.join(", ")}\n`;
        }
        if (aiProfileDoc.allergies?.length) {
          userMetaText += `- Allergies: ${aiProfileDoc.allergies.join(", ")}\n`;
        }
        if (aiProfileDoc.familySize) {
          userMetaText += `- Family Size: ${aiProfileDoc.familySize}\n`;
        }
        if (aiProfileDoc.spendBracket) {
          userMetaText += `- Spend Bracket: ${aiProfileDoc.spendBracket}\n`;
        }
      }
    } catch (err) {
      console.warn("Failed to fetch user meta for orchestrator:", err);
    }
  } else {
    userMetaText = `\n[User Profile Info]:\n- Name: Guest\n- System Role: Guest / Anonymous User\n`;
  }

  // Load user language preference
  let userLanguage = params.primaryLanguage || "hinglish";
  if (!params.primaryLanguage) {
    try {
      const settings = await UserChatbotSettings.findOne({ userId: params.userId });
      if (settings?.primaryLanguage) {
        userLanguage = settings.primaryLanguage;
      }
    } catch (err) {
      console.error("Failed to load user language preference for orchestrator:", err);
    }
  }

  const languageInstructions: Record<string, string> = {
    en: "CRITICAL: You must write your entire response strictly in English.",
    hi: "CRITICAL: You must write your entire response strictly in Hindi (हिन्दी) using Hindi script.",
    hinglish: "CRITICAL: You must write your entire response strictly in Hinglish (Hindi written using English/Latin alphabet, like 'kya chal raha hai').",
    bn: "CRITICAL: You must write your entire response strictly in Bengali (বাংলা).",
    mr: "CRITICAL: You must write your entire response strictly in Marathi (मराठी).",
    ta: "CRITICAL: You must write your entire response strictly in Tamil (தமிழ்).",
    te: "CRITICAL: You must write your entire response strictly in Telugu (తెలుగు).",
    kn: "CRITICAL: You must write your entire response strictly in Kannada (ಕನ್ನಡ).",
    ml: "CRITICAL: You must write your entire response strictly in Malayalam (മലയാളം).",
    gu: "CRITICAL: You must write your entire response strictly in Gujarati (ગુજરાતી).",
    pa: "CRITICAL: You must write your entire response strictly in Punjabi (ਪੰਜਾਬੀ).",
    ur: "CRITICAL: You must write your entire response strictly in Urdu (اردو).",
    or: "CRITICAL: You must write your entire response strictly in Odia (ଓଡ଼ିଆ).",
    as: "CRITICAL: You must write your entire response strictly in Assamese (অસમীয়া)."
  };

  const currentLangInstruction = languageInstructions[userLanguage] || languageInstructions["hinglish"];

  const adjustPromptLanguage = (promptText: string): string => {
    if (userLanguage === "hinglish") {
      return `${promptText}\n\n${currentLangInstruction}`;
    }

    const langNames: Record<string, string> = {
      en: "English",
      hi: "Hindi (हिन्दी) in Devanagari script",
      bn: "Bengali (বাংলা)",
      mr: "Marathi (मराठी)",
      ta: "Tamil (தமிழ்)",
      te: "Telugu (తెలుగు)",
      kn: "Kannada (ಕನ್ನಡ)",
      ml: "Malayalam (മലയാളം)",
      gu: "Gujarati (ગુજરાતી)",
      pa: "Punjabi (ਪੰਜਾਬੀ)",
      ur: "Urdu (اردو)",
      or: "Odia (ଓଡ଼ିଆ)",
      as: "Assamese (অસમীয়া)",
    };

    const targetLang = langNames[userLanguage] || "English";
    let adjusted = promptText;
    adjusted = adjusted.replace(/Hinglish tone/gi, `${targetLang} tone`);
    adjusted = adjusted.replace(/Hinglish/gi, targetLang);
    adjusted = adjusted.replace(/mix of Hindi and English/gi, targetLang);
    adjusted = adjusted.replace(/For example:\s*["'][^"']*["']/gi, "");
    return `${adjusted}\n\n${currentLangInstruction}`;
  };

  if (mode === "normal") {
    supervisorPrompt = await getPromptTemplate("normal_qa_agent");
    supervisorPrompt = adjustPromptLanguage(supervisorPrompt);
    
    // Check if query is likely seeking product details or availability (exclude simple greetings)
    const isGreeting = /^(hi|hello|hey|namaste|hlw|howdy|hola|greetings|good\s+morning|good\s+evening|good\s+afternoon|help)$/i.test(params.message.trim());
    let productContextText = "";
    if (!isGreeting) {
      try {
        const searchResults = await searchGroceries(params.message, 5);
        if (searchResults && searchResults.length > 0) {
          const populatedResults = await Grocery.populate(searchResults, { path: "variants" });
          collectedProducts.push(...populatedResults);
          productContextText = `\nRelevant Products in Store Catalog:\n${populatedResults.map((r: any) => `- Name: ${r.name}, Brand: ${r.brand || "N/A"}, Description: ${r.description || "N/A"}${r.variants && r.variants.length > 0 ? `, Variants: ${r.variants.map((v: any) => `${v.label} (MRP: ₹${v.price?.mrp}, Selling: ₹${v.price?.selling})`).join(", ")}` : ""}`).join("\n")}\n`;
        }
      } catch (err) {
        console.warn("Failed to retrieve product context for Q&A:", err);
      }
    }

    promptText = `
User Query: "${params.message}"
History:
${params.historyText || "No previous history."}
${productContextText}
${userMetaText}

Provide a direct, helpful, and friendly response to the user. Do not call any tools or output JSON action blocks.
`;

    if (productContextText) {
      supervisorPrompt = `You are a summarization assistant. Your task is to ONLY summarize and present the retrieved search results provided in the prompt. Do NOT make up any products or recommend things not in the retrieved list. Answer in the requested language/tone.\n\n${supervisorPrompt}`;
    }

    const gatewayResult = await callAiGateway({
      userId: params.userId,
      sessionId: params.sessionId,
      role: params.role,
      prompt: promptText,
      systemInstruction: supervisorPrompt,
      taskType: "agent_orchestration",
      preferredModel: params.preferredModel,
    });

    if (!gatewayResult.success) {
      console.warn("[Orchestrator] Q&A Gateway failed, triggering local fallback.");
      return runLocalIntelligenceFallback({
        userId: params.userId,
        message: params.message,
        historyText: params.historyText,
        primaryLanguage: userLanguage,
      });
    }

    return {
      reply: gatewayResult.reply,
      actions: [],
      products: collectedProducts,
    };
  }

  // Multi-turn agent loop (ReAct loop)
  let currentMessage = params.message;
  let currentHistoryText = params.historyText || "No previous history.";
  const executedActions: AgentAction[] = [];
  const executionLogs: string[] = [];
  let turn = 0;
  const maxTurns = 3;
  let finalReply = "";

  if (params.onProgress) {
    params.onProgress({ status: "🤖 Analyzing request..." });
  }

  while (turn < maxTurns) {
    turn++;
    if (params.onProgress) {
      params.onProgress({ status: `🤖 Thinking (Step ${turn}/${maxTurns})...` });
    }
    let supervisorPrompt = "";
    let promptText = "";

    if (mode === "expert") {
      supervisorPrompt = await getPromptTemplate("expert_shopping_agent");
      supervisorPrompt = adjustPromptLanguage(supervisorPrompt);
      promptText = `
User Query: "${currentMessage}"
History:
${currentHistoryText}
${userMetaText}

Analyze the user query. If you need to search products or manage items in their cart, you can output a JSON command block containing actions. Do NOT perform any administrative tasks like customer segmentation, forecasting, or dynamic repricing.

JSON Format:
\`\`\`json
{
  "actions": [
    { "tool": "searchProducts", "arguments": { "query": "low sugar biscuits", "limit": 5 } }
  ]
}
\`\`\`

Available Tools:
- searchProducts(query: string, limit?: number) -> Returns relevant grocery items.
- addToCart(items: Array<{variantId: string, quantity: number}>) -> Adds variants to cart.
- emptyCart() -> Clears active cart.

Explain your planning logic to the user and return any actions.
`;
    } else {
      // Default: agent mode
      supervisorPrompt = await getPromptTemplate("supervisor_orchestrator");
      supervisorPrompt = adjustPromptLanguage(supervisorPrompt);
      promptText = `
User Query: "${currentMessage}"
History:
${currentHistoryText}
${userMetaText}

Analyze this user query. If you need to perform actions (e.g., search products, reorder, apply coupons, perform forecasting, customer segmentation, dynamic pricing, or update profile), you can output a structured JSON command block containing one or more actions inside your response.
Multiple actions can be scheduled in a single output and will be executed sequentially by the system.

JSON Format:
\`\`\`json
{
  "actions": [
    { "tool": "reorderLastOrder", "arguments": {} },
    { "tool": "applyBestCoupon", "arguments": {} }
  ]
}
\`\`\`

Available Tools:
- searchProducts(query: string, limit?: number) -> Returns relevant grocery items.
- addToCart(items: Array<{variantId: string, quantity: number}>) -> Adds variants to cart.
- emptyCart() -> Clears active cart.
- applyCoupon(code: string) -> Applies specific coupon to cart.
- applyBestCoupon() -> Automatically computes and applies the best available coupon for the cart value.
- reorderLastOrder() -> Reorders items from user's last delivered order.
- getSpendAnalysis() -> Retrieves average order value, return rate, total spend, and inactive days.
- getUserAiProfile() -> Retrieves dietary details, allergies, and CLV category.
- updateUserAiProfile(dietaryPreferences?: string[], allergies?: string[], familySize?: number, spendBracket?: string) -> Updates profile details.
- runDynamicPricing(variantId: string, demandSurge?: number, weatherMultiplier?: number, competitorPrice?: number) -> Optimizes price and updates the variant selling price in the database.
- runDemandForecast(dayOfWeek: number, isHoliday: boolean, lag7Sales: number, temperature: number, discountRate: number) -> Predicts inventory demand.
- runCustomerSegmentation(targetUserId?: string) -> Runs ML clustering/predictions to update the user segment and returns churn risk.

Explain your planning logic to the user in a friendly, conversational tone, and return the actions.
`;
    }

    const gatewayResult = await callAiGateway({
      userId: params.userId,
      sessionId: params.sessionId,
      role: params.role,
      prompt: promptText,
      systemInstruction: supervisorPrompt,
      taskType: "agent_orchestration",
      preferredModel: params.preferredModel,
    });

    if (!gatewayResult.success) {
      if (finalReply) {
        return {
          reply: finalReply,
          actions: executedActions,
        };
      }
      console.warn("[Orchestrator] ReAct loop Gateway failed, triggering local fallback.");
      return runLocalIntelligenceFallback({
        userId: params.userId,
        message: params.message,
        historyText: params.historyText,
        primaryLanguage: userLanguage,
      });
    }

    const reply = gatewayResult.reply;

    // Extract actions from markdown code blocks
    const actions: AgentAction[] = [];
    const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
    const match = jsonRegex.exec(reply);
    const cleanReply = reply.replace(jsonRegex, "").trim();

    if (match && match[1]) {
      try {
        const parsed = JSON.parse(match[1]);
        if (Array.isArray(parsed.actions)) {
          for (const act of parsed.actions) {
            // Restrict tools based on mode
            if (mode === "expert" && !["searchProducts", "addToCart", "emptyCart"].includes(act.tool)) {
              continue;
            }
            if (aiTools[act.tool]) {
              actions.push({
                tool: act.tool,
                arguments: act.arguments || {},
              });
            }
          }
        }
      } catch (err) {
        console.error("Failed to parse agent actions JSON block:", err);
      }
    }

    // Keep accumulating reply text from the LLM across turns, separated by spacing
    if (finalReply) {
      finalReply += `\n\n${cleanReply}`;
    } else {
      finalReply = cleanReply;
    }

    if (actions.length === 0) {
      // The LLM has produced its final reply and planned no further actions, exit loop!
      break;
    }

    // Execute actions sequentially and collect their results
    const resultsSummary: string[] = [];
    for (const action of actions) {
      try {
        if (params.onProgress) {
          let prettyStatus = `Executing ${action.tool}...`;
          if (action.tool === "searchProducts") {
            prettyStatus = `🔍 Searching for "${action.arguments?.query || "products"}"...`;
          } else if (action.tool === "getUserAiProfile") {
            prettyStatus = `👤 Checking your dietary preferences...`;
          } else if (action.tool === "addToCart") {
            const itemCount = Array.isArray(action.arguments?.items) ? action.arguments.items.length : 1;
            prettyStatus = `🛒 Adding ${itemCount} item(s) to your cart...`;
          } else if (action.tool === "applyBestCoupon") {
            prettyStatus = `🏷️ Finding the best available coupon for maximum savings...`;
          } else if (action.tool === "reorderLastOrder") {
            prettyStatus = `📦 Reordering your last delivered items...`;
          } else if (action.tool === "getSpendAnalysis") {
            prettyStatus = `📊 Analyzing your historical spending data...`;
          } else if (action.tool === "runDynamicPricing") {
            prettyStatus = `📈 Running AI pricing optimizer...`;
          } else if (action.tool === "runDemandForecast") {
            prettyStatus = `🔮 Forecasting upcoming product demand...`;
          } else if (action.tool === "runCustomerSegmentation") {
            prettyStatus = `👥 Segmenting customer cohort category...`;
          }
          params.onProgress({ status: prettyStatus });
        }
        const toolDef = aiTools[action.tool];
        const result = await toolDef.execute(params.userId, action.arguments);
        executedActions.push(action);
        executionLogs.push(`${action.tool} (Success)`);
        resultsSummary.push(`Tool "${action.tool}" returned: ${JSON.stringify(result)}`);
        
        if (action.tool === "searchProducts" && result?.success && Array.isArray(result.results)) {
          collectedProducts.push(...result.results);
        }

        if (params.onProgress) {
          params.onProgress({ status: `✅ Completed ${action.tool} successfully.` });
        }
      } catch (err: any) {
        executionLogs.push(`${action.tool} (Failed)`);
        resultsSummary.push(`Tool "${action.tool}" failed with error: ${err?.message || "Execution error"}`);
        if (params.onProgress) {
          params.onProgress({ status: `❌ Failed to execute ${action.tool}.` });
        }
      }
    }

    // Update message and history for the next loop turn
    currentMessage = `Here are the results of your planned actions:\n${resultsSummary.join("\n")}\n\nBased on these results, please proceed with your next actions or provide the final response to the user.`;
    currentHistoryText = `${currentHistoryText}\nUSER: ${params.message}\nASSISTANT: ${cleanReply}\nSYSTEM (Action Execution Results): ${resultsSummary.join("\n")}`;

    // Sleep briefly to avoid triggering API rate limits
    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  if (executionLogs.length > 0) {
    finalReply += `\n\n*(System Executed Actions: ${executionLogs.join(", ")})*`;
  }

  // Deduplicate products
  const uniqueProductsMap = new Map();
  for (const prod of collectedProducts) {
    if (prod && prod._id) {
      uniqueProductsMap.set(prod._id.toString(), prod);
    }
  }
  const uniqueProducts = Array.from(uniqueProductsMap.values());

  return {
    reply: finalReply,
    actions: executedActions,
    products: uniqueProducts,
  };
}
