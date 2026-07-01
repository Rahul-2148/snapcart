import { callAiGateway } from "../gateway";

export async function runMarketingAgent(params: {
  userId: string;
  message: string;
}): Promise<string> {
  const systemPrompt = `You are the Snapcart Marketing Agent. You generate engaging copy, write professional campaigns, and draft user-personalized grocery newsletter templates.`;

  const promptText = `
User / Admin Prompt: "${params.message}"
Generate highly engaging product promotions, coupon newsletters, or custom discounts.
`;

  const gatewayResult = await callAiGateway({
    userId: params.userId,
    role: "admin",
    prompt: promptText,
    systemInstruction: systemPrompt,
    taskType: "summary",
  });

  return gatewayResult.reply;
}
