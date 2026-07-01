import { callAiGateway } from "../gateway";
import { getPromptTemplate } from "../prompts";

export async function runNutritionAgent(params: {
  userId: string;
  message: string;
}): Promise<string> {
  const systemPrompt = await getPromptTemplate("nutrition_agent");

  const promptText = `
User requested nutrition/diet guidance: "${params.message}"
Suggest high-protein, low-sugar, organic, or diabetic-friendly grocery lists. Perform nutritional tags matching if necessary.
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
