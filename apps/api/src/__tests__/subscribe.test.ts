import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";

import { createApp } from "../app";

const upsertWaitlistSignup = vi.fn();
const sheetsMockState = { enabled: true };

vi.mock("../lib/googleSheets", () => ({
  createGoogleSheetsService: () => ({
    isEnabled: () => sheetsMockState.enabled,
    upsertWaitlistSignup,
  }),
}));

vi.mock("../lib/emailService", () => ({
  createEmailService: () => ({
    sendConfirmationEmail: vi.fn().mockResolvedValue(undefined),
    sendAdminNotificationEmail: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("../lib/ratelimit", async () => {
  const actual: any = await vi.importActual("../lib/ratelimit");
  return {
    ...actual,
    subscriptionRateLimitMiddleware: (_req: any, _res: any, next: any) => next(),
  };
});

describe("POST /api/subscribe", () => {
  const app = createApp();

  beforeEach(() => {
    sheetsMockState.enabled = true;
    upsertWaitlistSignup.mockReset();
  });

  it("rejects invalid emails", async () => {
    const res = await request(app).post("/api/subscribe").send({ email: "invalid", consentGiven: true });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(upsertWaitlistSignup).not.toHaveBeenCalled();
  });

  it("requires consent", async () => {
    const res = await request(app).post("/api/subscribe").send({ email: "test@example.com" });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, message: "Consent is required" });
    expect(upsertWaitlistSignup).not.toHaveBeenCalled();
  });

  it("creates a new subscription when email not present", async () => {
    upsertWaitlistSignup.mockResolvedValueOnce("created");

    const res = await request(app)
      .post("/api/subscribe")
      .send({ email: "test@example.com", consentGiven: true });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, message: "Thanks! We'll email you product updates." });
    expect(upsertWaitlistSignup).toHaveBeenCalledTimes(1);
    expect(upsertWaitlistSignup).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "test@example.com",
        consentGiven: true,
      })
    );
  });

  it("is idempotent: returns success with a different message on duplicates", async () => {
    upsertWaitlistSignup.mockResolvedValueOnce("exists");

    const res = await request(app)
      .post("/api/subscribe")
      .send({ email: "test@example.com", consentGiven: true });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/already on the waitlist/i);
    expect(upsertWaitlistSignup).toHaveBeenCalledTimes(1);
  });

  it("returns 503 when Google Sheets is not configured", async () => {
    sheetsMockState.enabled = false;

    const res = await request(app)
      .post("/api/subscribe")
      .send({ email: "new@example.com", consentGiven: true });

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(upsertWaitlistSignup).not.toHaveBeenCalled();
  });
});
