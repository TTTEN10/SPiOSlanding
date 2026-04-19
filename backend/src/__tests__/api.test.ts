import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import app from '../server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('API Routes', () => {
  beforeEach(async () => {
    // Clean up test data
    await prisma.emailSubscription.deleteMany()
  })

  afterEach(async () => {
    // Clean up test data
    await prisma.emailSubscription.deleteMany()
  })

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200)

      expect(response.body).toHaveProperty('status', 'ok')
      expect(response.body).toHaveProperty('timestamp')
    })
  })

  describe('POST /api/subscribe', () => {
    it('should subscribe valid email successfully', async () => {
      const email = 'test@example.com'
      
      const response = await request(app)
        .post('/api/subscribe')
        .send({ email })
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        message: 'Successfully joined our waitlist! We\'ll notify you when SafePsy launches.',
      })

      // Verify email was stored in database
      const subscription = await prisma.emailSubscription.findUnique({
        where: { email },
      })
      expect(subscription).toBeTruthy()
      expect(subscription?.email).toBe(email)
    })

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/subscribe')
        .send({ email: 'invalid-email' })
        .expect(400)

      expect(response.body).toEqual({
        success: false,
        message: 'Please provide a valid email address',
      })
    })

    it('should reject missing email', async () => {
      const response = await request(app)
        .post('/api/subscribe')
        .send({})
        .expect(400)

      expect(response.body).toEqual({
        success: false,
        message: 'Email is required',
      })
    })

    it('should reject duplicate email', async () => {
      const email = 'duplicate@example.com'
      
      // First subscription
      await request(app)
        .post('/api/subscribe')
        .send({ email })
        .expect(200)

      // Second subscription with same email
      const response = await request(app)
        .post('/api/subscribe')
        .send({ email })
        .expect(409)

      expect(response.body).toEqual({
        success: false,
        message: 'This email is already on our waitlist',
      })
    })

    it('should handle case-insensitive email deduplication', async () => {
      const email1 = 'test@example.com'
      const email2 = 'TEST@EXAMPLE.COM'
      
      // First subscription
      await request(app)
        .post('/api/subscribe')
        .send({ email: email1 })
        .expect(200)

      // Second subscription with same email (different case)
      const response = await request(app)
        .post('/api/subscribe')
        .send({ email: email2 })
        .expect(409)

      expect(response.body).toEqual({
        success: false,
        message: 'This email is already on our waitlist',
      })
    })

    it('should normalize email to lowercase', async () => {
      const email = 'TEST@EXAMPLE.COM'
      
      const response = await request(app)
        .post('/api/subscribe')
        .send({ email })
        .expect(200)

      expect(response.body.success).toBe(true)

      // Verify email was stored in lowercase
      const subscription = await prisma.emailSubscription.findUnique({
        where: { email: email.toLowerCase() },
      })
      expect(subscription).toBeTruthy()
      expect(subscription?.email).toBe(email.toLowerCase())
    })
  })

  describe('404 handler', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/unknown-route')
        .expect(404)

      expect(response.body).toEqual({
        success: false,
        message: 'Endpoint not found',
      })
    })
  })
})
