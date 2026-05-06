import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";

import subscribe from "./routes/subscribe";
import contact from "./routes/contact";
import feedback from "./routes/feedback";
import testing from "./routes/testing";
import chat from "./routes/chat";
import betaChat from "./routes/beta-chat";
import did from "./routes/did";
import auth from "./routes/auth";
import payment from "./routes/payment";
import rag from "./routes/rag";

import logger from "./lib/logger";
import { errorHandlerMiddleware } from "./middleware/error-handler";
import { sanitizeMiddleware } from "./middleware/sanitize";
import { rateLimitMiddleware } from "./lib/ratelimit";
import { metricsMiddleware } from "./middleware/metrics";
import { getMetrics } from "./lib/metrics";
import { requestIdMiddleware } from "./middleware/request-id";

function parseAllowedOrigins(isProd: boolean): string[] {
  const raw = (process.env.FRONTEND_URL || "").trim();
  const defaults = isProd
    ? ["https://safepsy.com", "https://www.safepsy.com"]
    : ["http://localhost:3000", "http://localhost:3001"];

  const fromEnv = raw
    ? raw
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean)
    : [];

  // Production: always union canonical public origins with FRONTEND_URL. Browsers send `Origin`
  // on credentialed / crossorigin asset requests; if FRONTEND_URL is mis-set (e.g. leftover
  // localhost from templates), CORS would reject and break CSS/JS loading before Express static runs.
  const origins = isProd
    ? Array.from(new Set([...defaults, ...fromEnv]))
    : fromEnv.length > 0
      ? fromEnv
      : defaults;

  if (isProd) {
    for (const origin of origins) {
      if (origin === "*" || origin.includes("*")) {
        throw new Error("Invalid FRONTEND_URL: wildcard origins are not allowed in production");
      }
      try {
        const u = new URL(origin);
        if (!u.protocol || !u.host) throw new Error("invalid");
      } catch {
        throw new Error(`Invalid FRONTEND_URL origin in production: "${origin}"`);
      }
    }
  }

  return origins;
}

function parseExtraConnectSrc(): string[] {
  const raw = (process.env.CSP_CONNECT_SRC || "").trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
    .filter((v) => v !== "'self'");
}

export function createApp() {
  const app = express();

  // Request ID tracking (must be before other middleware)
  app.use(requestIdMiddleware);

  // Trust proxy for accurate IP addresses (important for rate limiting)
  app.set("trust proxy", 1);

  const isProd = process.env.NODE_ENV === "production";
  const allowedOrigins = parseAllowedOrigins(isProd);

  const corsMiddleware = cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      logger.warn(`CORS blocked origin: ${origin}`);
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-wallet-address",
      "x-wallet-signature",
      "x-wallet-message",
      "x-chain-id",
      "x-did-hash",
    ],
    exposedHeaders: ["X-Request-ID"],
  });

  // CORS only for APIs — never for static /assets (avoids env misconfig breaking CSS/JS; browsers may send Origin on module assets).
  app.use((req, res, next) => {
    const p = req.path;
    if (p.startsWith("/api")) {
      return corsMiddleware(req, res, next);
    }
    return next();
  });

  app.use(cookieParser());

  // Body parser with size limits (must be before sanitization)
  app.use(express.json({ limit: "10kb" }));
  app.use("/api/chat/completions", express.json({ limit: "100kb" }));
  app.use("/beta/chat", express.json({ limit: "100kb" }));
  app.use("/api/rag/index", express.json({ limit: "500kb" }));

  // Input sanitization middleware (after body parser, before routes)
  app.use(sanitizeMiddleware());

  const extraConnectSrc = parseExtraConnectSrc();
  const helmetConfig: any = {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", ...extraConnectSrc],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "same-origin" },
    permittedCrossDomainPolicies: false,
    originAgentCluster: true,
  };

  if (isProd) {
    helmetConfig.contentSecurityPolicy.directives.upgradeInsecureRequests = [];
  }

  app.use(helmet(helmetConfig));

  app.use("/api", rateLimitMiddleware);
  app.use(metricsMiddleware);

  app.get("/healthz", (_req, res) => res.send("ok"));
  // Canonical URL used by deploy scripts and monitors (must not fall through to SPA HTML).
  app.get("/api/healthz", (_req, res) => res.type("text/plain").send("ok"));
  app.get("/readyz", (_req, res) => res.send("ready"));
  app.get("/metrics", async (_req, res) => {
    try {
      const metrics = await getMetrics();
      res.set("Content-Type", "text/plain; version=0.0.4");
      res.send(metrics);
    } catch (error) {
      logger.error("Error generating metrics:", error);
      res.status(500).send("Error generating metrics");
    }
  });

  app.use("/api/subscribe", subscribe);
  app.use("/api/contact", contact);
  app.use("/api/feedback", feedback);
  if (!isProd) {
    app.use("/api/testing", testing);
  } else {
    app.use("/api/testing", (_req, res) => res.status(404).json({ error: "Not found" }));
  }
  app.use("/api/auth", auth);

  // This repo is deployed as the public landing + waitlist. The beta chatbot must not be reachable
  // from production even if someone guesses the URL.
  const enableBetaChat = !isProd && process.env.ENABLE_BETA_CHAT !== "0";
  if (enableBetaChat) {
    app.use("/beta", betaChat);
  } else {
    app.use("/beta", (_req, res) => res.status(404).json({ error: "Not found" }));
  }
  app.use("/api/chat", chat);
  app.use("/api/did", did);
  app.use("/api/payment", payment);
  app.use("/api/rag", rag);

  // Serve built web app (if present)
  const dist = path.join(__dirname, "../../web/dist");
  const frontendDist = path.join(__dirname, "../../frontend/dist");
  const actualDist = fs.existsSync(dist) ? dist : fs.existsSync(frontendDist) ? frontendDist : dist;

  if (fs.existsSync(actualDist)) {
    // index: false so GET / is not served by static (which would omit our HTML cache headers). SPA
    // routes must always hit the handler below with strict no-store so deploys show new bundles.
    app.use(
      express.static(actualDist, {
        index: false,
        setHeaders(res, filePath) {
          if (filePath.endsWith("index.html")) {
            res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private, max-age=0");
            res.setHeader("Pragma", "no-cache");
          }
        },
      }),
    );
    app.get("*", (req, res) => {
      const p = req.path;
      // Do not SPA-fallback for hashed bundles or other static files — returning index.html breaks MIME/types and looks like a "dead" app after deploy + stale cache.
      if (p.startsWith("/assets/")) {
        return res.status(404).type("text/plain").send("Not found");
      }
      if (/\.(js|mjs|cjs|css|map|json|woff2?|ttf|eot|svg|png|jpe?g|gif|webp|ico|avif)(\?|$)/i.test(p)) {
        return res.status(404).type("text/plain").send("Not found");
      }
      const indexPath = path.join(actualDist, "index.html");
      if (fs.existsSync(indexPath)) {
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private, max-age=0");
        res.setHeader("Pragma", "no-cache");
        return res.sendFile(indexPath);
      }
      return res.status(404).json({ error: "Frontend not built. Run 'npm run build:web'" });
    });
  } else {
    app.get("*", (_req, res) => res.status(404).json({ error: "Frontend not built. Run 'npm run build:web'" }));
  }

  app.use(errorHandlerMiddleware);

  return app;
}

