import { Router } from "express";
import { subscriptionRateLimitMiddleware } from "../lib/ratelimit";
import { safetyMiddleware, safetyResponseInterceptor } from "../middleware/safety";
import { createEmailService } from "../lib/emailService";
import { createGoogleSheetsService } from "../lib/googleSheets";
import { emailSubscriptionsTotal } from "../lib/metrics";
import { prisma } from "../lib/prisma";
import { ipHash } from "../lib/crypto";

const router = Router();

async function persistWaitlistToDatabase(
  email: string,
  consentGiven: boolean,
  consentTimestamp: Date,
  clientIp: string | undefined
): Promise<"created" | "exists"> {
  const existing = await prisma.emailSubscription.findUnique({ where: { email } });
  if (existing) return "exists";

  const hash = clientIp ? ipHash(clientIp) : undefined;
  await prisma.emailSubscription.create({
    data: {
      email,
      consentGiven,
      consentTimestamp,
      ipHash: hash,
    },
  });
  return "created";
}

router.use(subscriptionRateLimitMiddleware);

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
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ success: false, message: "Invalid email" });

  if (email.length > 255)
    return res.status(400).json({ success: false, message: "Email address is too long" });

  const consentGiven = req.body?.consentGiven === true;
  if (!consentGiven) {
    return res.status(400).json({ success: false, message: "Consent is required" });
  }
  const consentTimestamp = new Date();
  const clientIp =
    (typeof req.headers["x-forwarded-for"] === "string"
      ? req.headers["x-forwarded-for"].split(",")[0]?.trim()
      : undefined) || req.socket.remoteAddress;

  try {
    const sheets = createGoogleSheetsService();
    let outcome: "created" | "exists";

    if (sheets.isEnabled()) {
      try {
        outcome = await sheets.upsertWaitlistSignup({
          email,
          consentGiven,
          timestamp: consentTimestamp,
        });
      } catch (sheetsErr) {
        console.error("Google Sheets waitlist write failed, falling back to database:", sheetsErr);
        outcome = await persistWaitlistToDatabase(email, consentGiven, consentTimestamp, clientIp);
      }
    } else {
      outcome = await persistWaitlistToDatabase(email, consentGiven, consentTimestamp, clientIp);
    }

    if (outcome === "exists") {
      return res.json({
        success: true,
        message: "You're already on the waitlist. We'll email you product updates.",
      });
    }

    emailSubscriptionsTotal.inc({
      role: "unknown",
      consent_given: consentGiven ? "true" : "false",
    });

    const emailService = createEmailService();
    emailService.sendConfirmationEmail(email).catch((error) => {
      console.error("Failed to send confirmation email:", error);
    });

    emailService
      .sendAdminNotificationEmail({
        subject: "New SafePsy waitlist signup",
        textBody: [
          "A new user joined the SafePsy waitlist.",
          "",
          `Email: ${email}`,
          `Consent given: ${consentGiven ? "yes" : "no"}`,
          `Timestamp: ${new Date().toISOString()}`,
        ].join("\n"),
        htmlBody: `
        <p><strong>A new user joined the SafePsy waitlist.</strong></p>
        <ul>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Consent given:</strong> ${consentGiven ? "yes" : "no"}</li>
          <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
        </ul>
      `,
      })
      .catch((error) => {
        console.error("Failed to send admin notification email:", error);
      });

    res.json({
      success: true,
      message: "Thanks! We'll email you product updates.",
    });
  } catch (e) {
    console.error("Subscription error:", e);
    res.status(500).json({ success: false, message: "Something went wrong. Please try again later." });
  }
});

export default router;
