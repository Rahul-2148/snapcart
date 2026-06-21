// src/models/jobApplication.model.ts
import mongoose, { Document, Schema } from "mongoose";

export interface IJobApplication extends Document {
  name: string;
  email: string;
  mobile: string;
  position: string;
  currentTitle?: string;
  experience?: string;
  skills?: string;
  education?: string;
  resumeUrl: string;
  linkedinUrl?: string;
  coverLetter?: string;
  status: "Pending" | "Reviewed" | "Shortlisted" | "Rejected";
  createdAt: Date;
  updatedAt: Date;
}

const jobApplicationSchema = new Schema<IJobApplication>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    mobile: {
      type: String,
      required: true,
      trim: true,
    },
    position: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    currentTitle: {
      type: String,
      trim: true,
    },
    experience: {
      type: String,
      trim: true,
    },
    skills: {
      type: String,
      trim: true,
    },
    education: {
      type: String,
      trim: true,
    },
    resumeUrl: {
      type: String,
      required: true,
      trim: true,
    },
    linkedinUrl: {
      type: String,
      trim: true,
    },
    coverLetter: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Reviewed", "Shortlisted", "Rejected"],
      default: "Pending",
      index: true,
    },
  },
  { timestamps: true }
);

export const JobApplication =
  mongoose.models.JobApplication ||
  mongoose.model<IJobApplication>("JobApplication", jobApplicationSchema);
