import { callAiGateway } from "../gateway";

export async function runSupportAgent(params: {
  userId: string;
  message: string;
}): Promise<string> {
  const systemPrompt = `You are the Snapcart Support Agent. You resolve returns, refunds, order tracking delays, and delivery partner complaints. Speak politely and solve issues step-by-step.`;

  const promptText = `
User Query: "${params.message}"
Assist with returns processing, checking order status, or triggering customer support escalations.
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
