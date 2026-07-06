import { NextRequest } from "next/server";

import { auth } from "@/auth";
import { runOrchestrator } from "@/lib/server/ai/agents/orchestrator";
import { ChatMessage, ChatProductContext, SnapcartRole } from "@/lib/server/chatbot/types";
import connectDb from "@/lib/server/db";
import { ChatSession } from "@/models/chatSession.model";
import { User } from "@/models/user.model";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 seconds timeout for Vercel Serverless Function to allow Render cold start

function parseProductContext(value: unknown): ChatProductContext | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const obj = value as Record<string, unknown>;
  const productId = typeof obj.productId === "string" ? obj.productId.trim() : "";
  const name = typeof obj.name === "string" ? obj.name.trim() : "";

  if (!productId || !name) {
    return undefined;
  }

  return {
    productId,
    name,
    brand: typeof obj.brand === "string" ? obj.brand : undefined,
    categoryName: typeof obj.categoryName === "string" ? obj.categoryName : undefined,
    description: typeof obj.description === "string" ? obj.description : undefined,
    variantLabel: typeof obj.variantLabel === "string" ? obj.variantLabel : undefined,
    sellingPrice: typeof obj.sellingPrice === "number" ? obj.sellingPrice : undefined,
    mrpPrice: typeof obj.mrpPrice === "number" ? obj.mrpPrice : undefined,
    stock: typeof obj.stock === "number" ? obj.stock : undefined,
  };
}

function getRoleFromSession(session: { user?: { currentRole?: string } } | null): SnapcartRole {
  const currentRole = session?.user?.currentRole;
  if (currentRole === "admin" || currentRole === "deliveryBoy" || currentRole === "user") {
    return currentRole;
  }
  return "guest";
}

function normalizeRoleHint(value: unknown): SnapcartRole | null {
  if (value === "admin" || value === "deliveryBoy" || value === "user") {
    return value;
  }
  return null;
}

async function resolveRole(params: {
  session: { user?: { id?: string; currentRole?: string; roles?: string[] } } | null;
  roleHint: unknown;
}): Promise<SnapcartRole> {
  const { session, roleHint } = params;
  const fallbackRole = getRoleFromSession(session);

  if (!session?.user?.id) {
    return fallbackRole;
  }

  const requestedRole = normalizeRoleHint(roleHint);
  if (!requestedRole) {
    return fallbackRole;
  }

  const sessionRoles = Array.isArray(session.user.roles) ? session.user.roles : [];
  if (sessionRoles.includes(requestedRole)) {
    return requestedRole;
  }

  const dbUser = await User.findById(session.user.id).select("roles currentRole").lean<{
    roles?: string[];
    currentRole?: string;
  }>();

  const dbRoles = Array.isArray(dbUser?.roles) ? dbUser.roles : [];
  if (dbRoles.includes(requestedRole)) {
    return requestedRole;
  }

  if (dbUser?.currentRole === "admin" || dbUser?.currentRole === "deliveryBoy" || dbUser?.currentRole === "user") {
    return dbUser.currentRole;
  }

  return fallbackRole;
}

function splitReplyForStream(text: string) {
  const words = text.split(" ");
  const chunks: string[] = [];
  const chunkSize = 3;

  for (let index = 0; index < words.length; index += chunkSize) {
    const chunk = words.slice(index, index + chunkSize).join(" ");
    if (chunk) {
      chunks.push(`${chunk} `);
    }
  }

  return chunks;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  let body: any;
  let message = "";
  let history: ChatMessage[] = [];
  let sessionId = "";
  let productContext: ChatProductContext | undefined;
  let mode = "agent";
  let preferredModel = "";
  let session: any = null;
  let role: SnapcartRole = "guest";
  let userId: string | undefined;
  let userName: string | undefined;

  try {
    body = await req.json();
    message = (body?.message || "").toString().trim();
    history = (Array.isArray(body?.history) ? body.history : []) as ChatMessage[];
    sessionId = (body?.sessionId || "").toString().trim();
    productContext = parseProductContext(body?.productContext);
    mode = (body?.mode || "agent").toString().trim();
    preferredModel = (body?.preferredModel || "").toString().trim();

    session = await auth();
    await connectDb();

    if (session?.user) {
      userId = session.user.id;
      userName = session.user.name;
      role = await resolveRole({
        session,
        roleHint: body?.role,
      });
    }
  } catch (err: any) {
    console.error("Failed to parse request in chatbot stream route:", err);
    return new Response(
      encoder.encode(
        JSON.stringify({
          type: "error",
          message: err instanceof Error ? err.message : "Invalid request parameters",
        }) + "\n"
      ),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
      };

      try {
        if (!message) {
          send({ type: "error", message: "Message is required" });
          controller.close();
          return;
        }

        if (message.length > 1500) {
          send({ type: "error", message: "Message is too long" });
          controller.close();
          return;
        }

        const agentResult = await runOrchestrator({
          userId: userId || "000000000000000000000000",
          sessionId,
          role,
          message,
          historyText: history.slice(0, -1).map((m: any) => {
            const content = (m.activeLang && m.activeLang !== "original" && m.translatedContent?.[m.activeLang])
              ? m.translatedContent[m.activeLang]
              : m.content;
            return `${m.role.toUpperCase()}: ${content}`;
          }).join("\n"),
          mode: mode as any,
          onProgress: (event) => {
            send({ type: "progress", status: event.status });
          },
          preferredModel: preferredModel || undefined,
          primaryLanguage: body?.settings?.primaryLanguage,
        });

        const reply = agentResult.reply || "Abhi response generate nahi ho pa raha. Thoda der baad try karein.";
        const suggestions = [
          "Optimize my grocery budget",
          "Show high protein options",
          "Check diabetic items"
        ];

        let persistedSessionId: string | null = null;

        if (userId && role !== "guest") {
          const nextMessages = [
            ...history.slice(0, -1).slice(-10),
            { role: "user", content: message },
            { role: "assistant", content: reply },
          ];

          let chatSession = null;

          if (sessionId) {
            chatSession = await ChatSession.findOneAndUpdate(
              {
                _id: sessionId,
                userId,
                mode: mode === "agent" ? { $in: ["agent", null, undefined] } : mode,
              },
              {
                $set: {
                  userId,
                  role,
                  messages: nextMessages,
                  mode,
                },
              },
              { new: true },
            );

            if (chatSession && (!chatSession.title || chatSession.title.trim().toLowerCase() === "untitled chat")) {
              chatSession.title = message.slice(0, 80);
              await chatSession.save();
            }
          }

          if (!chatSession) {
            chatSession = await ChatSession.create({
              userId,
              role,
              title: message.slice(0, 80),
              messages: nextMessages,
              mode,
            });
          }

          if (chatSession?._id) {
            persistedSessionId = chatSession._id.toString();
          }
        }

        const chunks = splitReplyForStream(reply);
        for (const chunk of chunks) {
          send({ type: "chunk", content: chunk });
          await sleep(20);
        }

        send({
          type: "done",
          role,
          suggestions,
          sessionId: persistedSessionId,
          products: agentResult.products,
          guestCart: agentResult.guestCart,
          guestCoupon: agentResult.guestCoupon,
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to process chat";
        send({ type: "error", message: errorMessage });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
