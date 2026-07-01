import mongoose, { Document, Schema } from "mongoose";

export interface IAiPromptTemplate extends Document {
  name: string;             // e.g., 'shopping_agent_system', 'supervisor_orchestration'
  template: string;
  variables: string[];      // ['userProfile', 'budgetLimit']
  version: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AiPromptTemplateSchema = new Schema<IAiPromptTemplate>(
  {
    name: { type: String, required: true, unique: true, index: true },
    template: { type: String, required: true },
    variables: [{ type: String }],
    version: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export const AiPromptTemplate =
  mongoose.models.AiPromptTemplate ||
  mongoose.model<IAiPromptTemplate>("AiPromptTemplate", AiPromptTemplateSchema);
