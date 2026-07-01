// src/auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { User } from "./models/user.model";
import { Session } from "./models/session.model";
import connectDb from "./lib/server/db";
import bcrypt from "bcryptjs";
import Google from "next-auth/providers/google";
import { sendWelcomeEmail } from "./lib/server/email";
import crypto from "crypto";

// Helper to parse device metadata from user agent string
function parseUserAgent(ua: string) {
  let browser = "Unknown Browser";
  let os = "Unknown OS";
  let deviceType: "mobile" | "tablet" | "desktop" | "unknown" = "desktop";

  // OS detection
  if (/windows/i.test(ua)) {
    os = "Windows";
  } else if (/macintosh|mac os x/i.test(ua) && !/like mac/i.test(ua)) {
    os = "macOS";
  } else if (/android/i.test(ua)) {
    os = "Android";
    deviceType = "mobile";
  } else if (/iphone|ipad|ipod/i.test(ua)) {
    os = /ipad/i.test(ua) ? "iPadOS" : "iOS";
    deviceType = /ipad/i.test(ua) ? "tablet" : "mobile";
  } else if (/linux/i.test(ua)) {
    os = "Linux";
  }

  // Browser detection
  if (/chrome|crios/i.test(ua) && !/opr|opios|edge|edg/i.test(ua)) {
    browser = "Chrome";
  } else if (/safari/i.test(ua) && !/chrome|crios|opr|opios|edge|edg/i.test(ua)) {
    browser = "Safari";
  } else if (/firefox|fxios/i.test(ua)) {
    browser = "Firefox";
  } else if (/edge|edg/i.test(ua)) {
    browser = "Edge";
  } else if (/opera|opr/i.test(ua)) {
    browser = "Opera";
  }

  // Device type refinement
  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    deviceType = "tablet";
  } else if (/mobile|phone|android|iphone/i.test(ua) && deviceType !== "tablet") {
    deviceType = "mobile";
  }

  return { browser, os, deviceType };
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        await connectDb();
        const { email, password } = credentials as {
          email: string;
          password: string;
        };

        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await User.findOne({ email });
        if (!user) {
          throw new Error("No user found with the given email");
        }
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
          throw new Error("Incorrect password");
        }
        
        console.log("🔐 Credentials Login - User from DB:", {
          id: user._id,
          roles: user.roles,
          currentRole: user.currentRole,
          hasImage: !!user.image?.url
        });
        
        const currentRole = user.currentRole || user.roles?.[0] || "user";
        
        const userData = {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          image: user.image?.url || undefined, // Add image from database
          mobileNumber: user.mobileNumber,
          roles: user.roles || ["user"],
          currentRole: currentRole,
        };
        
        console.log("✅ Returning user data:", userData);
        
        return userData;
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl, token }: { url: string; baseUrl: string; token?: any }) {
      if (token && token.profileCompleted === false) {
        const target = new URL(url, baseUrl);
        if (!target.pathname.startsWith("/complete-profile")) {
          return `${baseUrl}/complete-profile`;
        }
      }
      if (url.startsWith(baseUrl)) return url;
      return baseUrl;
    },
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          await connectDb();
          let existingUser = await User.findOne({ email: user.email });

          if (!existingUser) {
            existingUser = await User.create({
              name: user.name,
              email: user.email,
              password: "", // Google sign-in doesn't need passwords
              image: user.image ? {
                url: user.image,
                publicId: "",
              } : undefined,
              roles: ["user"],
              currentRole: "user",
              isLoginedWithGoogle: true,
              profileCompleted: false,
            });

            // Send welcome email to new Google user
            try {
              await sendWelcomeEmail(existingUser.email, existingUser.name);
            } catch (emailError) {
              console.error(
                "Error sending welcome email to Google user:",
                emailError,
              );
            }
          }

          if (
            existingUser.isLoginedWithGoogle &&
            (existingUser.profileCompleted === undefined || existingUser.profileCompleted === null)
          ) {
            const looksIncomplete =
              (!existingUser.roles ||
                (existingUser.roles.length === 1 && existingUser.roles[0] === "user")) &&
              (!existingUser.currentRole || existingUser.currentRole === "user") &&
              !existingUser.mobileNumber;

            existingUser.profileCompleted = looksIncomplete ? false : true;
            await existingUser.save();
          }

          const currentRole =
            existingUser.currentRole || existingUser.roles?.[0] || "user";
          (user as any).id = existingUser._id.toString();
          (user as any).image = existingUser.image?.url || user.image;
          (user as any).mobileNumber = existingUser.mobileNumber;
          (user as any).roles = existingUser.roles || ["user"];
          (user as any).currentRole = currentRole;
          (user as any).profileCompleted = existingUser.profileCompleted ?? true;
        } catch (error) {
          console.error("Google sign-in error:", error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user?.id;
        token.name = user?.name;
        token.email = user?.email;
        token.image = user?.image;
        token.mobileNumber = (user as any)?.mobileNumber;
        token.roles = JSON.stringify((user as any)?.roles || ["user"]);
        token.currentRole =
          (user as any)?.currentRole || (user as any)?.roles?.[0] || "user";
        token.profileCompleted = (user as any)?.profileCompleted ?? true;
        
        // Use a custom sessionId to avoid NextAuth JTI overwriting
        if (!token.sessionId) {
          token.sessionId = crypto.randomUUID();
        }

        // Register the active device session in DB
        if (token.id && token.sessionId) {
          try {
            await connectDb();
            
            // Read headers with fallbacks
            let ua = "";
            let ip = "127.0.0.1";
            try {
              const { headers } = await import("next/headers");
              const headersList = await headers();
              ua = headersList.get("user-agent") || "";
              ip = headersList.get("x-forwarded-for")?.split(",")[0] || headersList.get("x-real-ip") || "127.0.0.1";
            } catch (headerErr) {
              console.error("Failed to read headers in JWT:", headerErr);
            }
            
            const { browser, os, deviceType } = parseUserAgent(ua);
            
            await Session.findOneAndUpdate(
              { jti: token.sessionId },
              {
                userId: token.id,
                jti: token.sessionId,
                deviceType,
                browser,
                os,
                ipAddress: ip,
                userAgent: ua,
                lastActiveAt: new Date()
              },
              { upsert: true, new: true }
            );
          } catch (sessionErr) {
            console.error("Failed to register session in DB:", sessionErr);
          }
        }
      }
      if (trigger === "update") {
        try {
          if (token.email) {
            await connectDb();
            const dbUser = await User.findOne({ email: token.email });
            if (dbUser) {
              token.roles = JSON.stringify(dbUser.roles || ["user"]);
              token.currentRole =
                dbUser.currentRole || dbUser.roles?.[0] || "user";
              token.mobileNumber = dbUser.mobileNumber;
              token.profileCompleted = dbUser.profileCompleted ?? true;
              token.image = dbUser.image?.url || (token.image as string);
            }
          }
        } catch (error) {
          console.error("Error refreshing JWT on update:", error);
        }
        if (session?.currentRole) {
          token.currentRole = session.currentRole;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        session.user.image = token.image as string;
        session.user.mobileNumber = token.mobileNumber as string;
        session.user.roles = JSON.parse((token.roles as string) || '["user"]');
        session.user.currentRole = token.currentRole as string;
        session.user.profileCompleted = token.profileCompleted as boolean ?? true;
        // Expose the custom sessionId to the UI
        (session.user as any).sessionId = token.sessionId as string;
      }

      // Stateful database session check: verify that this custom sessionId hasn't been revoked
      if (token.sessionId) {
        try {
          await connectDb();
          const activeSession = await Session.findOne({ jti: token.sessionId });
          if (!activeSession) {
            console.warn(`🚫 Revoked session detected! Logging out sessionId: ${token.sessionId}`);
            if (session) {
              session.user = undefined as any;
            }
            return null as any; // Invalidates session in client
          }

          // Asynchronously update activity timestamp without blocking
          Session.updateOne({ jti: token.sessionId }, { $set: { lastActiveAt: new Date() } }).catch(err => {
            console.error("Failed to update session activity:", err);
          });
        } catch (dbErr) {
          console.error("Error checking session in DB:", dbErr);
        }
      }

      return session;
    },
  },
  events: {
    async signOut(message) {
      if ("token" in message && message.token?.sessionId) {
        const token = message.token;
        try {
          await connectDb();
          await Session.deleteOne({ jti: token.sessionId });
        } catch (err) {
          console.error("Error in signOut event delete:", err);
        }
      }
    }
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
});
