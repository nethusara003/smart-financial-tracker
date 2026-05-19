import mongoose from "mongoose";
import User from "../models/User.js";
import dns from "dns";

// Force Node.js to use Google DNS (bypasses Windows/Hotspot DNS bugs with SRV records)
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (err) {
  console.warn("Could not set custom DNS servers:", err.message);
}

const DEFAULT_MONGO_URI = "mongodb://127.0.0.1:27017/smart_financial_tracker";

function resolveMongoUri() {
  const configuredUri = (process.env.MONGO_URI || process.env.MONGODB_URI || "").trim();

  if (!configuredUri) {
    return {
      mongoUri: DEFAULT_MONGO_URI,
      usedFallback: true,
      reason: "Missing MONGO_URI/MONGODB_URI",
    };
  }

  const isPlaceholderSrv = configuredUri.toLowerCase() === "mongodb+srv://...";
  if (isPlaceholderSrv) {
    return {
      mongoUri: DEFAULT_MONGO_URI,
      usedFallback: true,
      reason: "MONGO_URI is still a placeholder (mongodb+srv://...)",
    };
  }

  return {
    mongoUri: configuredUri,
    usedFallback: false,
    reason: "",
  };
}

const connectDB = async () => {
  const { mongoUri, usedFallback, reason } = resolveMongoUri();

  if (usedFallback) {
    console.warn(`⚠️  ${reason}. Falling back to local MongoDB: ${DEFAULT_MONGO_URI}`);
  }

  try {
    // 1. Setup listeners BEFORE connecting to handle sudden drops
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected! Attempting to reconnect...');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected successfully.');
    });

    // 2. Connect with better resilience settings
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 30000, // Increased to 30 seconds for slow wake-ups
      socketTimeoutMS: 45000,          // Close sockets after 45 seconds of inactivity
      family: 4                        // Force IPv4 (fixes some DNS issues)
    });

    console.log("✅ MongoDB connected");

    /* 
    // 🔒 Production hardening check (AFTER connection)
    // Commented out temporarily to prevent startup hangs during index creation
    const superAdminCount = await User.countDocuments({
      role: "super_admin",
    });

    if (superAdminCount !== 1) {
      console.warn("⚠️  SECURITY WARNING ⚠️");
      console.warn(
        `Expected exactly 1 super_admin, found ${superAdminCount}. Fix immediately.`
      );
    }
    */

    return true;
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);

    const shouldExit = process.env.NODE_ENV === "production" || process.env.CI === "true";
    if (shouldExit) {
      process.exit(1);
    }

    console.warn(
      "⚠️  Continuing in development mode without database connection. Update MONGO_URI or start local MongoDB."
    );
    return false;
  }
};

export default connectDB;
