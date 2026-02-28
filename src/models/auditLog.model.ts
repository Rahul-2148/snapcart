import mongoose, { Document, Model, Schema } from "mongoose";

type AuditMetadata = {
  changes?: string[];
  source?: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  diff?: Record<string, { from: unknown; to: unknown }>;
};

export interface IAuditLog extends Document {
  userId: mongoose.Types.ObjectId;
  action: string;
  metadata?: AuditMetadata;
  ipAddress?: string;
  userAgent?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    metadata: {
      changes: [String],
      source: String,
      before: Schema.Types.Mixed,
      after: Schema.Types.Mixed,
      diff: Schema.Types.Mixed,
    },
    ipAddress: String,
    userAgent: String,
  },
  { timestamps: true }
);

const AuditLog: Model<IAuditLog> =
  (mongoose.models.AuditLog as Model<IAuditLog>) ||
  mongoose.model<IAuditLog>("AuditLog", auditLogSchema);

export default AuditLog;
