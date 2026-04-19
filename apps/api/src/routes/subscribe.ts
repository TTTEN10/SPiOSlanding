import { Router } from "express";
import { prisma } from "../lib/prisma";
import { ipHash } from "../lib/crypto";
import { subscriptionRateLimitMiddleware } from "../lib/ratelimit";
import { safetyMiddleware, safetyResponseInterceptor } from "../middleware/safety";
import { createEmailService } from "../lib/emailService";
import { createGoogleSheetsService } from "../lib/googleSheets";
import { emailSubscriptionsTotal } from "../lib/metrics";

const router = Router();

// Apply rate limiting middleware
router.use(subscriptionRateLimitMiddleware);

// Apply safety middleware (injection filter, moderation, PII redaction)
router.use(safetyMiddleware({
  injectionFilter: {
    enabled: true,
    blockOnDetect: true, // Block requests with injection attempts
    logDetections: true,
  },
  moderation: {
    enabled: true,
    blockOnDetect: false, // Log but don't block (moderation is informational)
    logDetections: true,
  },
  piiRedaction: {
    enabled: true,
    redactInLogs: true, // Redact PII in logs for privacy
    redactInResponses: false, // Don't redact in responses
    preserveForAuth: true,
  },
}));

// Apply response interceptor
router.use(safetyResponseInterceptor);

router.post("/", async (req, res) => {
  const email = (req.body?.email || "").toString().trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ success: false, message: "Invalid email" });

  if (email.length > 255)
    return res.status(400).json({ success: false, message: "Email address is too long" });

  // Optional fields from JoinOurWaitlist form with validation
  const fullName = req.body?.fullName?.toString().trim() || null;
  const role = req.body?.role?.toString().trim() || null;
  const consentGiven = req.body?.consentGiven === true || false;
  const consentTimestamp = consentGiven ? new Date() : null;

  // Validate optional field lengths if provided
  if (fullName && fullName.length > 100)
    return res.status(400).json({ success: false, message: "Full name must not exceed 100 characters" });

  if (role && !['client', 'therapist', 'partner'].includes(role))
    return res.status(400).json({ success: false, message: "Invalid role. Must be one of: client, therapist, partner" });

  if (role && role.length > 50)
    return res.status(400).json({ success: false, message: "Role must not exceed 50 characters" });

  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.socket.remoteAddress || "";

  try {
    const subscription = await prisma.emailSubscription.upsert({
      where: { email },
      create: { 
        email, 
        fullName,
        role,
        ipHash: ipHash(ip),
        consentGiven,
        consentTimestamp
      },
      update: {}
    });
    
    // Track metrics for Prometheus
    emailSubscriptionsTotal.inc({
      role: role || 'unknown',
      consent_given: consentGiven ? 'true' : 'false'
    });
    
    // Send confirmation email (non-blocking)
    const emailService = createEmailService();
    emailService.sendConfirmationEmail(email).catch((error) => {
      console.error('Failed to send confirmation email:', error);
      // Don't throw - email failures shouldn't break the subscription flow
    });

    // Notify SafePsy admin about new subscription (non-blocking)
    emailService.sendAdminNotificationEmail({
      subject: 'New SafePsy waitlist signup',
      textBody: [
        'A new user joined the SafePsy waitlist.',
        '',
        `Email: ${email}`,
        `Full name: ${fullName ?? '(not provided)'}`,
        `Role: ${role ?? '(not provided)'}`,
        `Consent given: ${consentGiven ? 'yes' : 'no'}`,
        `Timestamp: ${new Date().toISOString()}`,
      ].join('\n'),
      htmlBody: `
        <p><strong>A new user joined the SafePsy waitlist.</strong></p>
        <ul>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Full name:</strong> ${fullName ?? '(not provided)'}</li>
          <li><strong>Role:</strong> ${role ?? '(not provided)'}</li>
          <li><strong>Consent given:</strong> ${consentGiven ? 'yes' : 'no'}</li>
          <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
        </ul>
      `,
    }).catch((error) => {
      console.error('Failed to send admin notification email:', error);
    });

    // Log to Google Sheets (non-blocking)
    const googleSheetsService = createGoogleSheetsService();
    if (googleSheetsService.isEnabled()) {
      googleSheetsService.logSubscription({
        email,
        fullName,
        role,
        consentGiven,
        timestamp: new Date(),
      }).catch((error) => {
        console.error('Failed to log to Google Sheets:', error);
        // Don't throw - Google Sheets failures shouldn't break the subscription flow
      });
    }
    
    // Return success message matching the expected format
    res.json({ 
      success: true, 
      message: 'Thanks! We\'ll email you product updates.' 
    });
  } catch (e) {
    console.error('Subscription error:', e);
    res.status(500).json({ success: false, message: "Something went wrong. Please try again later." });
  }
});

export default router;
