// src/auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { User } from "./models/user.model";
import connectDb from "./lib/server/db";
import bcrypt from "bcryptjs";
import Google from "next-auth/providers/google";
import { sendWelcomeEmail } from "./lib/server/email";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
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
    // token ke andar user ka data dalta h
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          await connectDb();
          let existingUser = await User.findOne({ email: user.email });

          if (!existingUser) {
            existingUser = await User.create({
              name: user.name,
              email: user.email,
              password: "", // Google se login hone par password ki zarurat nahi hoti
              image: user.image ? {
                url: user.image, // Google image URL
                publicId: "", // Cloudinary nahi hai
              } : undefined,
              roles: ["user"],
              currentRole: "user",
              isLoginedWithGoogle: true,
              profileCompleted: false, // New Google user needs to complete profile
            });

            // Send welcome email to new Google user
            try {
              await sendWelcomeEmail(existingUser.email, existingUser.name);
            } catch (emailError) {
              console.error(
                "Error sending welcome email to Google user:",
                emailError,
              );
              // Don't block login if email fails
            }
          }

          // Force old Google users to complete profile if flag missing
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

          // Assign values to user object for JWT callback
          const currentRole =
            existingUser.currentRole || existingUser.roles?.[0] || "user";
          (user as any).id = existingUser._id.toString();
          // Use database image if available, fallback to Google image
          (user as any).image = existingUser.image?.url || user.image;
          (user as any).mobileNumber = existingUser.mobileNumber;
          (user as any).roles = existingUser.roles || ["user"];
          (user as any).currentRole = currentRole;
          (user as any).profileCompleted = existingUser.profileCompleted ?? true;
        } catch (error) {
          console.error("Google sign-in error:", error);
          return false; // Block login if there's an error
        }
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user?.id;
        token.name = user?.name;
        token.email = user?.email;
        token.image = user?.image; // Add image to token
        token.mobileNumber = (user as any)?.mobileNumber;
        // Serialize roles array to JSON string for JWT
        token.roles = JSON.stringify((user as any)?.roles || ["user"]);
        token.currentRole =
          (user as any)?.currentRole || (user as any)?.roles?.[0] || "user";
        token.profileCompleted = (user as any)?.profileCompleted ?? true;
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
              console.log("🔄 Session updated with new data:", {
                roles: dbUser.roles,
                currentRole: dbUser.currentRole,
                profileCompleted: dbUser.profileCompleted,
              });
            }
          }
        } catch (error) {
          console.error("Error refreshing JWT on update:", error);
        }
        // Also handle manual role/data updates from session parameter
        if (session?.currentRole) {
          token.currentRole = session.currentRole;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        session.user.image = token.image as string; // Add image to session
        session.user.mobileNumber = token.mobileNumber as string;
        // Parse roles JSON string back to array
        session.user.roles = JSON.parse((token.roles as string) || '["user"]');
        session.user.currentRole = token.currentRole as string;
        session.user.profileCompleted = token.profileCompleted as boolean ?? true;
      }
      return session;
    },
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
