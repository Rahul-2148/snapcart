import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env.local") });

// Define User interface
interface IUser {
  name: string;
  email: string;
  password: string;
  mobileNumber?: string;
  roles: ("user" | "deliveryBoy" | "admin")[];
  currentRole: "user" | "deliveryBoy" | "admin";
  isBlocked?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Define User Schema inline for seeding
const userSchema = new mongoose.Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    mobileNumber: {
      type: String,
      unique: true,
      sparse: true,
    },
    roles: {
      type: [String],
      enum: ["user", "deliveryBoy", "admin"],
      default: ["user"],
    },
    currentRole: {
      type: String,
      enum: ["user", "deliveryBoy", "admin"],
      default: "user",
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const User = mongoose.model<IUser>("User", userSchema);

async function seedAdmin() {
  try {
    console.log("🌱 Starting admin seeding...");

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI not found in environment variables");
    }

    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    // Get admin credentials from env
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminName = process.env.ADMIN_NAME;
    const adminMobile = process.env.ADMIN_MOBILE;

    if (!adminEmail || !adminPassword || !adminName) {
      throw new Error(
        "Admin credentials not found in .env.local (ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME required)"
      );
    }

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log("⚠️  Admin user already exists:", adminEmail);
      console.log("Skipping creation...");
      await mongoose.disconnect();
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    // Create admin user
    const adminUser = new User({
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      mobileNumber: adminMobile,
      roles: ["admin"],
      currentRole: "admin",
      isBlocked: false,
    });

    await adminUser.save();

    console.log("✅ Admin user created successfully!");
    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Admin Account Created:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Email:   ${adminEmail}
Name:    ${adminName}
Mobile:  ${adminMobile || "Not provided"}
Role:    Admin
Password: ${adminPassword}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔐 You can now login with these credentials!
    `);

    await mongoose.disconnect();
    console.log("✅ Database disconnected");
  } catch (error) {
    console.error("❌ Error seeding admin:", error);
    process.exit(1);
  }
}

// Run the seed function
seedAdmin();
