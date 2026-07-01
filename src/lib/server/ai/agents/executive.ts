import { callAiGateway } from "../gateway";

export async function runExecutiveAgent(params: {
  userId: string;
  message: string;
}): Promise<string> {
  const systemPrompt = `You are the Snapcart Executive Operations Agent. You compile sales statistics, evaluate regional store margins, and generate executive summaries.`;

  const promptText = `
Query: "${params.message}"
Provide high-level insights, break down GMV metrics, and suggest category promotions.
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
