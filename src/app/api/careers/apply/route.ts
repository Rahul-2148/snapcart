// src/app/api/careers/apply/route.ts
import { NextResponse } from "next/server";
import dbConnect from "@/lib/server/db";
import { JobApplication } from "@/models/jobApplication.model";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      name, 
      email, 
      mobile, 
      position, 
      currentTitle, 
      experience, 
      skills, 
      education, 
      resumeUrl, 
      linkedinUrl, 
      coverLetter 
    } = body;

    if (!name || !email || !mobile || !position || !resumeUrl) {
      return NextResponse.json(
        { success: false, message: "Name, email, mobile, position, and resume are required." },
        { status: 400 }
      );
    }

    // Basic email format check
    const isValidEmail = /[^@\s]+@[^@\s]+\.[^@\s]+/.test(email);
    if (!isValidEmail) {
      return NextResponse.json(
        { success: false, message: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    // Basic URL format check for resume
    const isValidUrl = /^https?:\/\/[^\s$.?#].[^\s]*$/i.test(resumeUrl);
    if (!isValidUrl) {
      return NextResponse.json(
        { success: false, message: "Please provide a valid URL for your resume (e.g. Google Drive/Dropbox link)." },
        { status: 400 }
      );
    }

    await dbConnect();

    // Check if they have already applied for this specific position in the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const alreadyApplied = await JobApplication.findOne({
      email: email.toLowerCase(),
      position,
      createdAt: { $gte: sevenDaysAgo },
    });

    if (alreadyApplied) {
      return NextResponse.json(
        {
          success: false,
          message: "You have already submitted an application for this position in the last 7 days. Please wait for our team to review.",
        },
        { status: 400 }
      );
    }

    const application = await JobApplication.create({
      name,
      email: email.toLowerCase(),
      mobile,
      position,
      currentTitle,
      experience,
      skills,
      education,
      resumeUrl,
      linkedinUrl,
      coverLetter,
    });

    return NextResponse.json({
      success: true,
      message: "Application submitted successfully! Our talent acquisition team will review and contact you.",
      applicationId: application._id,
    });
  } catch (error) {
    console.error("Job application error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error. Please try again." },
      { status: 500 }
    );
  }
}
