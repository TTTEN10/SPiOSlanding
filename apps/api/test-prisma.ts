import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

console.log("Testing Prisma...");
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "Set" : "Not set");

try {
  const { prisma } = await import("./src/lib/prisma");
  console.log("✅ Prisma imported");
  
  // Try to connect
  console.log("Attempting to connect...");
  await prisma.$connect();
  console.log("✅ Prisma connected");
  
  await prisma.$disconnect();
  console.log("✅ Prisma disconnected");
  process.exit(0);
} catch (error: any) {
  console.error("❌ Prisma error:", error.message);
  console.error("Stack:", error.stack);
  process.exit(1);
}
