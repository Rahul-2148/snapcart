import { callAiGateway } from "../gateway";

export async function runDeliveryAgent(params: {
  userId: string;
  message: string;
}): Promise<string> {
  const systemPrompt = `You are the Snapcart Delivery Operations Agent. You assess active routing status, predict drop-off ETAs, and evaluate dispatch metrics.`;

  const promptText = `
Query: "${params.message}"
Verify routing coordinates or explain estimated traffic delays based on coordinates.
`;

  const gatewayResult = await callAiGateway({
    userId: params.userId,
    role: "deliveryBoy",
    prompt: promptText,
    systemInstruction: systemPrompt,
    taskType: "chat",
  });

  return gatewayResult.reply;
}
