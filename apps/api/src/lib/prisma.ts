import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
})

// Graceful shutdown for both SIGTERM and SIGINT
const disconnect = async () => {
  await prisma.$disconnect()
}

process.on('SIGINT', disconnect)
process.on('SIGTERM', disconnect)
process.on('beforeExit', disconnect)
