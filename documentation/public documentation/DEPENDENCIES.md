# SafePsy Dependencies Documentation

This document lists all dependencies required for the SafePsy application deployment and their purposes.

## Runtime Dependencies

### Backend API (`apps/api/package.json`)

#### Core Framework
- **express** `^4.21.2`: Web application framework
- **cors** `^2.8.5`: Cross-Origin Resource Sharing middleware
- **helmet** `^8.0.0`: Security headers middleware
- **cookie-parser** `^1.4.7`: Parse HTTP request cookies
- **dotenv** `^16.4.7`: Environment variable management

#### Database & ORM
- **@prisma/client** `6.19.1`: Prisma ORM client (generated from schema)
- **prisma** `^6.19.1`: Prisma CLI for migrations and schema management

#### Runtime & Build Tools
- **tsx** `^4.19.2`: TypeScript execution runtime (used in production)
- **typescript** `^5.7.2`: TypeScript compiler (dev dependency, but needed for tsx)

#### Utilities
- **jsdom** `^24.1.3`: DOM implementation for server-side rendering/parsing
- **dompurify** `^3.2.2`: HTML sanitization
- **axios** `^1.12.0`: HTTP client
- **winston** `^3.15.1`: Logging library
- **joi** `^17.13.3`: Schema validation

#### Security & Authentication
- **bcrypt** `^6.0.0`: Password hashing
- **jsonwebtoken** `^9.0.3`: JWT token generation/verification
- **siwe** `^2.3.2`: Sign-In With Ethereum

#### Blockchain & Smart Contracts
- **ethers** `^6.15.0`: Ethereum library
- **alchemy-sdk** `^3.0.0`: Alchemy SDK for blockchain interactions
- **@openzeppelin/contracts** `^5.1.0`: OpenZeppelin smart contracts
- **solc** `^0.8.28`: Solidity compiler

#### Storage & Infrastructure
- **@aws-sdk/client-s3** `^3.712.0`: AWS S3 client
- **web3.storage** `^4.0.0`: Web3 storage (IPFS)
- **ioredis** `^5.4.2`: Redis client
- **@qdrant/js-client-rest** `^1.16.2`: Qdrant vector database client

#### Monitoring & Metrics
- **prom-client** `^15.1.0`: Prometheus metrics

#### Email & Notifications
- **postmark** `^3.0.23`: Postmark email service
- **googleapis** `^144.0.0`: Google APIs (for Gmail, etc.)

#### Rate Limiting
- **express-rate-limit** `^7.4.1`: Rate limiting middleware

### Frontend (`apps/web/package.json`)

#### Core Framework
- **react** `^18.x`: UI library
- **react-dom** `^18.x`: React DOM renderer
- **react-router-dom** `^6.x`: Client-side routing

#### Build Tools
- **vite** `^5.x`: Build tool and dev server
- **typescript** `^5.x`: TypeScript support

#### UI Components & Styling
- Various UI libraries as needed

## Infrastructure Dependencies

### Docker Images

1. **node:18-alpine**
   - Base image for application
   - Includes Node.js 18 and npm
   - Alpine Linux for smaller image size

2. **postgres:15-alpine**
   - PostgreSQL 15 database server
   - Alpine Linux variant

3. **caddy:2-alpine**
   - Caddy web server v2
   - Automatic SSL certificate management
   - Reverse proxy capabilities

### System Packages (installed in Dockerfile)

- **openssl** & **openssl-dev**: Required for Prisma and PostgreSQL
- **postgresql-client**: PostgreSQL client tools
- **python3** & **py3-pip**: Required for some native Node.js modules
- **make** & **g++**: Build tools for native modules

## Development Dependencies

### Backend Dev Dependencies
- **nodemon** `^3.1.9`: Auto-restart on file changes
- **@types/node** `^22.10.5`: TypeScript types for Node.js
- **@types/express** `^5.0.6`: TypeScript types for Express
- **eslint** `^9.18.0`: Linting
- **prettier** `^3.4.2`: Code formatting
- **vitest** `^2.1.8`: Testing framework
- **hardhat** `^3.1.0`: Ethereum development environment

## Production Deployment Requirements

### Required at Runtime

1. **Node.js 18+**: JavaScript runtime
2. **npm**: Package manager (included with Node.js)
3. **Prisma Client**: Generated from schema at runtime
4. **TypeScript Source Files**: Required for `tsx` runtime execution

### Optional Dependencies

- **SCALEWAY_API_KEY**: For AI chatbot functionality (if enabled)
- **Redis**: For caching (if configured)
- **S3/AWS**: For file storage (if configured)
- **IPFS/Web3.Storage**: For decentralized storage (if configured)

## Dependency Installation Notes

### Backend Installation

The backend uses `npm install --legacy-peer-deps` due to peer dependency conflicts. This is handled automatically in the Docker container startup command.

### Prisma Client Generation

Prisma Client must be generated at runtime because:
1. Schema may be updated during deployment
2. Database provider may differ (SQLite in dev, PostgreSQL in prod)
3. Enums and types must match the current schema

Generation command:
```bash
npx prisma generate --schema=./schema.prisma
```

### Frontend Build

Frontend is built locally and deployed as static files:
```bash
cd apps/web
npm install
npm run build
# Output: apps/web/dist/
```

## Version Compatibility

- **Node.js**: 18.x (Alpine Linux compatible)
- **PostgreSQL**: 15.x
- **Prisma**: 6.19.x
- **Caddy**: 2.x
- **TypeScript**: 5.7.x

## Known Issues & Workarounds

1. **Peer Dependency Warnings**: Use `--legacy-peer-deps` flag
2. **Prisma Binary Issues**: Ensure OpenSSL is installed
3. **Native Module Build**: Requires Python and build tools
4. **TypeScript ESM/CommonJS**: Mixed module systems require careful configuration

## Documentation Dependencies (Tokenomics & Pricing)

The following documentation depends on or references the **revised (LLM-first) tokenomics** defined in [TOKENOMICS.md](TOKENOMICS.md). When updating tokenomics (revenue share, allocation, airdrop, buyback+burn, dual payment, Gold tier), update the canonical source first, then sync references below.

| Document | Relationship to tokenomics |
|----------|----------------------------|
| **[TOKENOMICS.md](TOKENOMICS.md)** | **Canonical source** — $PSY design, dual payment (fiat or $PSY), revenue-sharing (9% → Treasury, 3% → stakers), Gold ($69) cashback, ICO phases, allocation, airdrop (Proof-of-Mental-Health), buyback+burn (5%). |
| **[PRICING_COMPLETE_GUIDE.md](PRICING_COMPLETE_GUIDE.md)** | Tier pricing ($19 Premium, $69 Gold), implementation status, and tokenomics dependency table (dual payment, staking, cashback, burn, airdrop). |
| **[DEPLOYMENT_FILES_INDEX.md](DEPLOYMENT_FILES_INDEX.md)** | Index entry for Product, Pricing & Tokenomics; points to TOKENOMICS and PRICING_COMPLETE_GUIDE. |
| **[documentation/api/SSE_STREAMING_CONTRACT.md](api/SSE_STREAMING_CONTRACT.md)** | References 3-tier pricing and TOKENOMICS/PRICING_COMPLETE_GUIDE. |
| **[documentation/wallpaper/whitepaper.md](wallpaper/whitepaper.md)** | Payment and pricing sections reference TOKENOMICS and PRICING_COMPLETE_GUIDE. |
| **[DID_COMPLETE_GUIDE.md](DID_COMPLETE_GUIDE.md)** | Target pricing and premium tiers reference TOKENOMICS. |
| **[TECHNICAL_REVIEW.md](../private%20documentation/TECHNICAL_REVIEW.md)** | Target pricing model and tier limits reference TOKENOMICS and PRICING_COMPLETE_GUIDE. |
| **infra/terraform (README, SAFEPSY_APP_DEPLOYMENT)** | Subscription/tier context references TOKENOMICS for 3-tier and $PSY. |

**Update order when changing tokenomics:** (1) TOKENOMICS.md, (2) PRICING_COMPLETE_GUIDE.md (dependency table and env vars), (3) DEPLOYMENT_FILES_INDEX.md, (4) other docs as needed.

## Security Considerations

- All dependencies should be regularly updated
- Use `npm audit` to check for vulnerabilities
- Review dependency licenses for compliance
- Keep security-focused packages (helmet, cors) up to date

## Dependency Updates

To update dependencies:

```bash
# Backend
cd apps/api
npm update
npm audit fix

# Frontend
cd apps/web
npm update
npm audit fix

# Root (if applicable)
npm update
```

Always test thoroughly after updating dependencies, especially:
- Prisma (database schema compatibility)
- Express (API compatibility)
- React/Vite (frontend compatibility)

