import { callAiGateway } from "../gateway";

export async function runStoreAgent(params: {
  userId: string;
  message: string;
}): Promise<string> {
  const systemPrompt = `You are the Snapcart Store Manager Agent. You analyze local inventory, track out-of-stock items, and recommend replenishment quantities.`;

  const promptText = `
Query: "${params.message}"
Suggest reorder priorities, highlight near-expiry products, and optimize storage slots.
`;

  const gatewayResult = await callAiGateway({
    userId: params.userId,
    role: "storeManager",
    prompt: promptText,
    systemInstruction: systemPrompt,
    taskType: "chat",
  });

  return gatewayResult.reply;
}
