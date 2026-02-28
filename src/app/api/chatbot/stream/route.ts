import { NextRequest } from "next/server";

import { auth } from "@/auth";
import { generateSnapcartReply } from "@/lib/server/chatbot/engine";
import { ChatMessage, ChatProductContext, SnapcartRole } from "@/lib/server/chatbot/types";
import connectDb from "@/lib/server/db";
import { ChatSession } from "@/models/chatSession.model";
import { User } from "@/models/user.model";

export const dynamic = "force-dynamic";

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

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
      };

      try {
        const body = await req.json();
        const message = (body?.message || "").toString().trim();
        const history = (Array.isArray(body?.history) ? body.history : []) as ChatMessage[];
        const sessionId = (body?.sessionId || "").toString().trim();
        const productContext = parseProductContext(body?.productContext);

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

        const session = await auth();

        let role: SnapcartRole = "guest";
        let userId: string | undefined;
        let userName: string | undefined;

        if (session?.user) {
          userId = session.user.id;
          userName = session.user.name;
          await connectDb();
          role = await resolveRole({
            session,
            roleHint: body?.role,
          });
        }

        const result = await generateSnapcartReply({
          role,
          userId,
          userName,
          message,
          history,
          productContext,
        });

        let persistedSessionId: string | null = null;

        if (userId && role !== "guest") {
          const nextMessages = [
            ...history.slice(-10),
            { role: "user", content: message },
            { role: "assistant", content: result.reply },
          ];

          let chatSession = null;

          if (sessionId) {
            chatSession = await ChatSession.findOneAndUpdate(
              { _id: sessionId, userId },
              {
                $set: {
                  userId,
                  role,
                  messages: nextMessages,
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
            });
          }

          if (chatSession?._id) {
            persistedSessionId = chatSession._id.toString();
          }
        }

        const chunks = splitReplyForStream(result.reply);
        for (const chunk of chunks) {
          send({ type: "chunk", content: chunk });
          await sleep(20);
        }

        send({
          type: "done",
          role: result.role,
          suggestions: result.suggestions,
          sessionId: persistedSessionId,
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to process chat";
        send({ type: "error", message });
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
