import { callAiGateway } from "../gateway";
import { getPromptTemplate } from "../prompts";

export async function runShoppingAgent(params: {
  userId: string;
  message: string;
}): Promise<string> {
  const systemPrompt = await getPromptTemplate("shopping_agent");

  const promptText = `
User requested shopping help: "${params.message}"
Provide grocery alternatives, compare items, list substitutions, or suggest premium/budget brands. Maintain a helpful and descriptive shopping assistant tone.
`;

  const gatewayResult = await callAiGateway({
    userId: params.userId,
    role: "user",
    prompt: promptText,
    systemInstruction: systemPrompt,
    taskType: "chat",
  });

  return gatewayResult.reply;
}
