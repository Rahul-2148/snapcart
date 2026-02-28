// src/app/api/admin/newsletter/templates/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { newsletterTemplates } from "@/lib/server/newsletterTemplates";

// Get all available templates
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || !session.user.roles?.includes("admin")) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const templates = Object.entries(newsletterTemplates).map(([key, template]) => ({
      id: key,
      name: template.name,
      subject: template.subject,
    }));

    return NextResponse.json({ success: true, templates });
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch templates" }, { status: 500 });
  }
}
