// src/next-auth.d.ts
import NextAuth from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      image?: string;
      mobileNumber?: string;
      roles?: string[];
      currentRole?: string;
      profileCompleted?: boolean;
    };
  }
  interface User {
    id: string;
    name: string;
    email: string;
    image?: string;
    mobileNumber?: string;
    roles?: string[];
    currentRole?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    image?: string;
    mobileNumber?: string;
    roles?: string; // JSON string of roles array
    currentRole?: string;
    profileCompleted?: boolean;
  }
}

export {};
