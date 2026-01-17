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
        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  callbacks: {
    // token ke andar user ka data dalta h
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        await connectDb();
        let existingUser = await User.findOne({ email: user.email });
        let isNewUser = false;

        if (!existingUser) {
          isNewUser = true;
          existingUser = await User.create({
            name: user.name,
            email: user.email,
            password: "", // Google se login hone par password ki zarurat nahi hoti
            image: {
              url: user.image, // Google image URL
              publicId: "", // Cloudinary nahi hai
            },
            role: "user",
            isLoginedWithGoogle: true,
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
        user.id = existingUser._id.toString();
        user.role = existingUser.role;
      }
      return true;
    },
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user?.id;
        token.name = user?.name;
        token.email = user?.email;
        token.role = user?.role;
      }
      if (trigger === "update") {
        token.role = session?.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        session.user.role = token.role as string;
      }
      // console.log(session);
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
