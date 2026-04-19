import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'
import Joi from 'joi'
import path from 'path'
import { debugLog } from './debug-log'

// Load environment variables
dotenv.config()

const app = express()
const prisma = new PrismaClient()

// Trust proxy for accurate IP addresses (important for rate limiting)
app.set('trust proxy', 1);

// Security middleware - Enhanced Helmet configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin" },
  permittedCrossDomainPolicies: false,
  originAgentCluster: true,
}));

// Enhanced CORS configuration (fail closed on wildcards in production)
const isProdCors = process.env.NODE_ENV === 'production';
function parseAllowedOrigins(): string[] {
  const raw = (process.env.FRONTEND_URL || '').trim();
  const defaults = isProdCors
    ? ['https://safepsy.com', 'https://www.safepsy.com', 'https://chat.safepsy.com']
    : ['http://localhost:3000', 'http://localhost:3001'];

  const origins = raw
    ? raw
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean)
    : defaults;

  if (isProdCors) {
    for (const origin of origins) {
      if (origin === '*' || origin.includes('*')) {
        throw new Error('Invalid FRONTEND_URL: wildcard origins are not allowed in production');
      }
      try {
        const u = new URL(origin);
        if (!u.protocol || !u.host) throw new Error('invalid');
      } catch {
        throw new Error(`Invalid FRONTEND_URL origin in production: "${origin}"`);
      }
    }
  }

  return origins;
}
const allowedOrigins = parseAllowedOrigins();

// #region agent log
debugLog({
  runId: 'pre-fix',
  hypothesisId: 'D',
  location: 'backend/src/server.ts:allowedOrigins',
  message: 'backend CORS allowlist initialized',
  data: {
    nodeEnv: process.env.NODE_ENV,
    isProd: process.env.NODE_ENV === 'production',
    allowedOriginsCount: allowedOrigins.length,
    allowedOrigins: allowedOrigins.slice(0, 10),
  },
});
// #endregion

app.use(cors({
  origin: (origin, callback) => {
    const isProd = process.env.NODE_ENV === 'production';
    // Allow requests with no Origin header (server-to-server, health checks, curl, etc.).
    // Browsers performing cross-site requests will include Origin, so CSRF-relevant flows
    // are still governed by the allowlist below.
    if (!origin) {
      // #region agent log
      debugLog({
        runId: 'pre-fix',
        hypothesisId: 'D',
        location: 'backend/src/server.ts:corsOrigin',
        message: 'backend CORS allow (missing Origin header)',
        data: { nodeEnv: process.env.NODE_ENV, isProd, origin: null },
      });
      // #endregion
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      // #region agent log
      debugLog({
        runId: 'pre-fix',
        hypothesisId: 'D',
        location: 'backend/src/server.ts:corsOrigin',
        message: 'backend CORS allow (origin in allowlist)',
        data: { nodeEnv: process.env.NODE_ENV, isProd, origin },
      });
      // #endregion
      return callback(null, true);
    }

    console.warn(`CORS blocked origin: ${origin}`);
    // #region agent log
    debugLog({
      runId: 'pre-fix',
      hypothesisId: 'D',
      location: 'backend/src/server.ts:corsOrigin',
      message: 'backend CORS block (origin not in allowlist)',
      data: { nodeEnv: process.env.NODE_ENV, isProd, origin },
    });
    // #endregion
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: [],
}))

// Rate limiting for general API endpoints
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
})

// Specific rate limiting for email subscription endpoint
const subscriptionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // limit each IP to 5 requests per minute
  message: {
    success: false,
    message: 'Too many subscription attempts. Please wait a minute before trying again.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

app.use('/api', generalLimiter)
app.use('/api/subscribe', subscriptionLimiter)

// Body parsing middleware with security limits
app.use(express.json({ limit: '1mb' })) // Reduced from 10mb for security
app.use(express.urlencoded({ extended: true, limit: '1mb' }))

// Static file serving
app.use(express.static(path.join(__dirname, '../public')))

// Waitlist validation schema
const waitlistSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
  fullName: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Full name must be at least 2 characters',
      'string.max': 'Full name must be less than 100 characters',
      'any.required': 'Full name is required',
    }),
  role: Joi.string()
    .valid('client', 'therapist', 'partner')
    .required()
    .messages({
      'any.only': 'Role must be one of: client, therapist, partner',
      'any.required': 'Role is required',
    }),
  consentGiven: Joi.boolean()
    .valid(true)
    .required()
    .messages({
      'any.only': 'You must give consent to join our waitlist',
      'any.required': 'Consent is required',
    }),
})

// Contact form validation schema
const contactSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
  fullName: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Full name must be at least 2 characters',
      'string.max': 'Full name must be less than 100 characters',
      'any.required': 'Full name is required',
    }),
  subject: Joi.string()
    .min(5)
    .max(200)
    .required()
    .messages({
      'string.min': 'Subject must be at least 5 characters',
      'string.max': 'Subject must be less than 200 characters',
      'any.required': 'Subject is required',
    }),
  message: Joi.string()
    .min(10)
    .max(2000)
    .required()
    .messages({
      'string.min': 'Message must be at least 10 characters',
      'string.max': 'Message must be less than 2000 characters',
      'any.required': 'Message is required',
    }),
})

// IP hashing utility with privacy by design (default OFF)
const hashIP = (ip: string): string => {
  const enabled = process.env.IP_HASHING_ENABLED === 'true'
  const salt = process.env.IP_SALT || 'default-privacy-salt-change-in-production'
  
  // If IP hashing is disabled (default), return a placeholder
  if (!enabled) {
    return 'IP_HASHING_DISABLED'
  }
  
  return crypto.createHash('sha256').update(ip + salt).digest('hex')
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Favicon endpoint
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/HeadsOnlyTransparent.png'))
})

// Subscribe endpoint
app.post('/api/subscribe', async (req, res) => {
  try {
    // Validate request body
    const { error, value } = waitlistSchema.validate(req.body)
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      })
    }

    const { email, fullName, role, consentGiven } = value
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown'
    const ipHash = hashIP(clientIP)
    const consentTimestamp = new Date()

    // Check if email already exists
    const existingSubscription = await prisma.emailSubscription.findUnique({
      where: { email },
    })

    if (existingSubscription) {
      return res.status(409).json({
        success: false,
        message: 'This email is already on our waitlist',
      })
    }

    // Create new subscription
    await prisma.emailSubscription.create({
      data: {
        email,
        fullName,
        role,
        ipHash,
        consentGiven,
        consentTimestamp,
      },
    })

    res.json({
      success: true,
      message: 'Thanks! We\'ll email you product updates.',
    })
  } catch (error) {
    console.error('Subscription error:', error)
    res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again later.',
    })
  }
})

// Contact endpoint
app.post('/api/contact', async (req, res) => {
  try {
    // Validate request body
    const { error, value } = contactSchema.validate(req.body)
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      })
    }

    const { email, fullName, subject, message } = value
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown'
    const ipHash = hashIP(clientIP)

    // Create new contact message
    await prisma.contactMessage.create({
      data: {
        email,
        fullName,
        subject,
        message,
        ipHash,
      },
    })

    res.json({
      success: true,
      message: 'Thank you for your message! We\'ll get back to you soon.',
    })
  } catch (error) {
    console.error('Contact form error:', error)
    res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again later.',
    })
  }
})

// Error handling middleware - Don't leak error details in production
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err)
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV !== 'production'
  const errorMessage = isDevelopment ? err.message : 'Internal server error'
  const errorStack = isDevelopment ? err.stack : undefined
  
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(isDevelopment && { error: errorMessage, stack: errorStack }),
  })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
  })
})

const PORT = process.env.PORT || 3001

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...')
  server.close(() => {
    console.log('Server closed')
  })
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...')
  server.close(() => {
    console.log('Server closed')
  })
  await prisma.$disconnect()
  process.exit(0)
})

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

app.listen(PORT, () => {
  console.log(`🚀 SafePsy backend server running on port ${PORT}`)
  console.log(`📊 Health check: http://localhost:${PORT}/health`)
})

export default app
