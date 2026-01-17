"use client";
import React from "react";
import SideNav from "./SideNav";
import useGetMe from "@/hooks/useGetMe";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useGetMe();
  return (
    <div className="container mx-auto py-8">
      <div className="flex min-h-[calc(100vh-8rem)]">
        <SideNav />
        <div className="flex-grow pl-8">{children}</div>
      </div>
    </div>
  );
}
