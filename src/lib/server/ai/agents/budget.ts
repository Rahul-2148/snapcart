import { callAiGateway } from "../gateway";
import { getPromptTemplate } from "../prompts";

export async function runBudgetAgent(params: {
  userId: string;
  message: string;
}): Promise<string> {
  const systemPrompt = await getPromptTemplate("budget_agent");

  const promptText = `
User requested budget help: "${params.message}"
Suggest budget-friendly adjustments, evaluate savings on unit packaging, and match active coupon strategies.
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
