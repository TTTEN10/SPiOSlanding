import { Router } from "express";
import { prisma } from "../lib/prisma";
import { ipHash } from "../lib/crypto";
import { subscriptionRateLimitMiddleware } from "../lib/ratelimit";
import { safetyMiddleware, safetyResponseInterceptor } from "../middleware/safety";
import { contactMessagesTotal } from "../lib/metrics";
import { createEmailService } from "../lib/emailService";

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
  const fullName = req.body?.fullName?.toString().trim() || "";
  const subject = req.body?.subject?.toString().trim() || "";
  const message = req.body?.message?.toString().trim() || "";

  // Validate required fields with length limits
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ success: false, message: "Please provide a valid email address" });

  if (email.length > 255)
    return res.status(400).json({ success: false, message: "Email address is too long" });

  if (!fullName || fullName.length < 2)
    return res.status(400).json({ success: false, message: "Full name must be at least 2 characters" });

  if (fullName.length > 100)
    return res.status(400).json({ success: false, message: "Full name must not exceed 100 characters" });

  if (!subject || subject.length < 5)
    return res.status(400).json({ success: false, message: "Subject must be at least 5 characters" });

  if (subject.length > 200)
    return res.status(400).json({ success: false, message: "Subject must not exceed 200 characters" });

  if (!message || message.length < 10)
    return res.status(400).json({ success: false, message: "Message must be at least 10 characters" });

  if (message.length > 2000)
    return res.status(400).json({ success: false, message: "Message must not exceed 2000 characters" });

  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.socket.remoteAddress || "";

  try {
    await prisma.contactMessage.create({
      data: {
        email,
        fullName,
        subject,
        message,
        ipHash: ipHash(ip)
      }
    });
    
    // Track metrics for Prometheus
    contactMessagesTotal.inc();

    // Notify SafePsy admin about new contact message (non-blocking)
    const emailService = createEmailService();
    emailService.sendAdminNotificationEmail({
      subject: `New contact message: ${subject}`,
      textBody: [
        'A new contact message was submitted on SafePsy.',
        '',
        `From: ${fullName} <${email}>`,
        `Subject: ${subject}`,
        '',
        'Message:',
        message,
        '',
        `Timestamp: ${new Date().toISOString()}`,
      ].join('\n'),
      htmlBody: `
        <p><strong>A new contact message was submitted on SafePsy.</strong></p>
        <p><strong>From:</strong> ${fullName} &lt;${email}&gt;</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <pre style="white-space: pre-wrap; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">${message}</pre>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
      `,
    }).catch((error) => {
      console.error('Failed to send admin notification email:', error);
    });
    
    res.json({ 
      success: true, 
      message: 'Thank you for your message! We\'ll get back to you soon.' 
    });
  } catch (e) {
    console.error('Contact form error:', e);
    res.status(500).json({ success: false, message: "Something went wrong. Please try again later." });
  }
});

export default router;

