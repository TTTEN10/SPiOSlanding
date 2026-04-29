import { Router } from "express";
import { subscriptionRateLimitMiddleware } from "../lib/ratelimit";
import { safetyMiddleware, safetyResponseInterceptor } from "../middleware/safety";
import { createEmailService } from "../lib/emailService";
import { createGoogleSheetsService } from "../lib/googleSheets";
import { emailSubscriptionsTotal } from "../lib/metrics";

const router = Router();

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

  const sheets = createGoogleSheetsService();
  if (!sheets.isEnabled()) {
    return res.status(503).json({
      success: false,
      message: "Waitlist signup is temporarily unavailable. Please try again later.",
    });
  }

  try {
    const outcome = await sheets.upsertWaitlistSignup({
      email,
      consentGiven,
      timestamp: consentTimestamp,
    });

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
    const msg = e instanceof Error ? e.message : String(e);
    const lower = msg.toLowerCase();
    if (
      lower.includes("google_sheets_credentials") ||
      lower.includes("credentials") ||
      lower.includes("google sheets") ||
      lower.includes("permission") ||
      lower.includes("forbidden") ||
      lower.includes("caller does not have permission")
    ) {
      return res.status(503).json({
        success: false,
        message: "Waitlist signup is temporarily unavailable. Please try again later.",
      });
    }
    res.status(500).json({ success: false, message: "Something went wrong. Please try again later." });
  }
});

export default router;
