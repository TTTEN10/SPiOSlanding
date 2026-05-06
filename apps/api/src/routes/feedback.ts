import { Router } from "express";
import { prisma } from "../lib/prisma";
import { ipHash } from "../lib/crypto";
import { subscriptionRateLimitMiddleware } from "../lib/ratelimit";
import { safetyMiddleware, safetyResponseInterceptor } from "../middleware/safety";
import { feedbackSubmissionsTotal } from "../lib/metrics";
import { createEmailService } from "../lib/emailService";
import logger from "../lib/logger";

const router = Router();

// Apply rate limiting middleware
router.use(subscriptionRateLimitMiddleware);

// Apply safety middleware (injection filter, moderation, PII redaction)
router.use(
  safetyMiddleware({
    injectionFilter: {
      enabled: true,
      blockOnDetect: true,
      logDetections: true,
    },
    moderation: {
      enabled: true,
      blockOnDetect: false,
      logDetections: true,
    },
    piiRedaction: {
      enabled: true,
      redactInLogs: true,
      redactInResponses: false,
      preserveForAuth: true,
    },
  })
);

router.use(safetyResponseInterceptor);

router.post("/", async (req, res) => {
  const email = (req.body?.email || "").toString().trim().toLowerCase();
  const feedback = (req.body?.feedback || "").toString().trim();

  // Validate email if provided
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: "Please provide a valid email address" });
  }

  if (email.length > 255) {
    return res.status(400).json({ success: false, message: "Email address is too long" });
  }

  // Validate feedback content
  if (!feedback || feedback.length < 10) {
    return res.status(400).json({ success: false, message: "Feedback must be at least 10 characters" });
  }

  if (feedback.length > 5000) {
    return res.status(400).json({ success: false, message: "Feedback must not exceed 5000 characters" });
  }

  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.socket.remoteAddress || "";
  const userAgent = req.headers["user-agent"] || "";

  try {
    if (!process.env.DATABASE_URL) {
      return res.status(503).json({
        success: false,
        message: "Feedback storage is not available in this environment. Ensure DATABASE_URL is set and try again.",
      });
    }

    await prisma.feedback.create({
      data: {
        email: email || null,
        feedback,
        ipHash: ipHash(ip),
        userAgent,
      },
    });

    // Track metrics for Prometheus
    feedbackSubmissionsTotal.inc();

    // Notify SafePsy admin about new feedback (non-blocking)
    const emailService = createEmailService();
    emailService
      .sendAdminNotificationEmail({
        subject: `New user feedback${email ? ` from ${email}` : ""}`,
        textBody: [
          "A new feedback was submitted on SafePsy.",
          "",
          email ? `From: ${email}` : "Anonymous submission",
          "",
          "Feedback:",
          feedback,
          "",
          `Timestamp: ${new Date().toISOString()}`,
          `User Agent: ${userAgent}`,
        ].join("\n"),
        htmlBody: `
          <p><strong>A new feedback was submitted on SafePsy.</strong></p>
          ${email ? `<p><strong>From:</strong> ${email}</p>` : "<p><em>Anonymous submission</em></p>"}
          <p><strong>Feedback:</strong></p>
          <pre style="white-space: pre-wrap; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">${feedback}</pre>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p><strong>User Agent:</strong> ${userAgent}</p>
        `,
      })
      .catch((error) => {
        logger.error("Failed to send admin notification email for feedback:", error);
      });

    res.json({
      success: true,
      message: "Thank you for your feedback! We appreciate your input.",
    });
  } catch (e) {
    logger.error("Feedback submission error:", e);
    const msg = e instanceof Error ? e.message : "";
    if (/DATABASE_URL|Prisma|P1001|ECONNREFUSED|connect/i.test(msg)) {
      return res.status(503).json({
        success: false,
        message: "Feedback storage is not reachable. Ensure Postgres is running and DATABASE_URL is set, then retry.",
      });
    }
    res.status(500).json({ success: false, message: "Something went wrong. Please try again later." });
  }
});

export default router;
