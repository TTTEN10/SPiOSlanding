import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

console.log("Testing imports...");

try {
  console.log("1. Importing express...");
  const express = await import("express");
  console.log("✅ Express imported");
  
  console.log("2. Importing logger...");
  const logger = await import("./src/lib/logger");
  console.log("✅ Logger imported");
  
  console.log("3. Importing prisma...");
  const { prisma } = await import("./src/lib/prisma");
  console.log("✅ Prisma imported");
  
  console.log("4. Importing routes...");
  const subscribe = await import("./src/routes/subscribe");
  console.log("✅ Subscribe route imported");
  
  const contact = await import("./src/routes/contact");
  console.log("✅ Contact route imported");
  
  const testing = await import("./src/routes/testing");
  console.log("✅ Testing route imported");
  
  const chat = await import("./src/routes/chat");
  console.log("✅ Chat route imported");
  
  const did = await import("./src/routes/did");
  console.log("✅ DID route imported");
  
  const auth = await import("./src/routes/auth");
  console.log("✅ Auth route imported");
  
  const payment = await import("./src/routes/payment");
  console.log("✅ Payment route imported");
  
  const rag = await import("./src/routes/rag");
  console.log("✅ RAG route imported");
  
  console.log("✅ All imports successful!");
  process.exit(0);
} catch (error: any) {
  console.error("❌ Import failed:", error.message);
  console.error("Stack:", error.stack);
  process.exit(1);
}
