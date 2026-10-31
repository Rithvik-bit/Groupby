# GroupBuy — Collaborative Ownership & Resource-Sharing Platform

GroupBuy is a full-stack platform enabling individuals and organizations to co-own high-value assets, collectively purchase resources, and share commercial equipment with automated governance, transparent financial ledgers, and real-time collaboration.

---

## 🏛️ Architecture & Core Principles

1. **Integer Arithmetic Precision**:
   - **Monetary Values**: Stored exclusively as integer **paise** (1 INR = 100 paise) across all models, calculations, and APIs to eliminate floating-point rounding errors.
   - **Ownership Percentages**: Stored strictly as **basis points** (10,000 bps = 100.00%, 1 bps = 0.01%). Finalized group equity validations enforce that total ownership sums to exactly 10,000 bps.

2. **Authentication & Session Security**:
   - Short-lived JWT access tokens stored in client memory (15 min).
   - Rotating refresh tokens stored in secure, `HttpOnly`, `SameSite=Strict` cookies (7 days).
   - Server-side SHA-256 refresh-token hash verification with token family invalidation and revocation upon logout.
   - CORS with credentials, Helmet security headers, rate limiting, and CSRF header validation.

3. **Concurrency-Safe State Management**:
   - Atomic conditional updates (`$inc`, `$set`, OCC with version checks) for contributions and funding progress.
   - Concurrency-safe reservation strategies without relying on arbitrary date range unique indexes.
   - MongoDB multi-document transactions when running on a replica set, with automatic detection and graceful standalone fallback for local development.

4. **Provider Abstractions**:
   - **PaymentProvider**: Pluggable interface with a `SimulatedPaymentProvider` in development. All simulated operations are explicitly marked with disclaimers to ensure simulated contributions are never mistaken for real funds.
   - **EmailProvider**: Pluggable interface with a development `ConsoleEmailProvider` that safely formats action links without dumping raw credentials or passwords into logs.

5. **Monorepo Structure**:
   ```
   GroupBuy/
   ├── package.json              # Workspace root scripts
   ├── .gitignore                # Root ignore protecting secrets
   ├── .env.example              # Master environment configuration template
   ├── README.md                 # Setup and architecture documentation
   ├── server/                   # Express.js REST API & Socket.IO Server
   │   ├── src/
   │   │   ├── config/           # MongoDB connection & transaction management
   │   │   ├── controllers/      # Auth, groups, chat, contributions, bookings
   │   │   ├── middleware/       # Auth guards, role validation, error handler
   │   │   ├── models/           # Mongoose schemas (Paise & Basis Points)
   │   │   ├── routes/           # Express API route modules
   │   │   ├── services/         # PaymentProvider & EmailProvider implementations
   │   │   ├── sockets/          # Authenticated Socket.IO handlers
   │   │   └── utils/            # JWT, audit logger, custom error classes
   │   ├── tests/                # Automated Jest & Supertest test suite
   │   ├── .env.example          # Server environment template
   │   └── package.json          # Server dependencies & scripts
   └── client/                   # Vite React SPA
       ├── src/
       │   ├── components/       # UI components & shared layouts
       │   ├── context/          # Auth context & state management
       │   ├── pages/            # Dashboard, Groups, Auth, Profile
       │   └── services/         # Axios API client with token refresh interceptor
       ├── .env.example          # Client environment template
       ├── vite.config.js        # Vite config with API & WebSocket proxies
       └── package.json          # Client dependencies & scripts
   ```

---

## 🚀 Prerequisites

- **Node.js**: v18.0.0 or later (Node 20+ recommended)
- **npm**: v9.0.0 or later
- **MongoDB**: v6.0 or later (Optional for unit tests; `mongodb-memory-server` is used automatically in testing)

---

## ⚙️ Quick Setup & Installation

### 1. Environment Configuration

Copy the environment configuration templates in both `server` and `client`:

```bash
# In the server directory:
cp server/.env.example server/.env

# In the client directory:
cp client/.env.example client/.env
```

> **Security Note**: Never commit `.env` files to git. All secret files are ignored in `.gitignore`.

### 2. Install Dependencies

Install all dependencies across the entire monorepo from the root:

```bash
# From workspace root:
npm run install:all
```

*(On Windows PowerShell, use `npm.cmd run install:all` if script execution policy is restricted).*

Alternatively, install dependencies in each directory individually:
```bash
cd server && npm install
cd ../client && npm install
```

---

## 🧪 Running Automated Tests

GroupBuy includes an automated test suite powered by Jest, Supertest, and `mongodb-memory-server` (runs completely in-memory without needing a local MongoDB service):

```bash
# Run server test suite from workspace root:
npm test
```

### Tests Covered:
- **`health.test.js`**: Verifies `/health` endpoint status, uptime, and database connection reporting.
- **`providers.test.js`**: Verifies `PaymentProvider` & `SimulatedPaymentProvider` (disclaimers, integer paise validation, refunds) and `EmailProvider` & `ConsoleEmailProvider` (safe credential handling).
- **`auth.test.js`**: Verifies registration, password validation, login, JWT access/refresh flow, private data isolation, and timing-safe responses.
- **`groupIsolation.test.js`**: Verifies that private groups, member lists, and financial contribution histories are strictly isolated from unauthorized users and non-members.

---

## 💻 Development & Running Locally

### Starting the Backend Server

```bash
# From workspace root:
npm run dev:server

# Or directly in server/:
cd server && npm run dev
```
The server will start on `http://localhost:5000`.

### Health Check Endpoint
Test the server health by opening `http://localhost:5000/health`:
```json
{
  "success": true,
  "status": "ok",
  "timestamp": "2026-10-12T17:00:00.000Z",
  "uptime": 12,
  "environment": "development",
  "database": {
    "connected": true,
    "transactionsSupported": false
  },
  "version": "1.0.0"
}
```

### Starting the Frontend Client

```bash
# From workspace root:
npm run dev:client

# Or directly in client/:
cd client && npm run dev
```
The client will start on `http://localhost:5173`. Vite proxies `/api`, `/socket.io`, and `/health` requests directly to `http://localhost:5000`.

### Building Production Client Bundle

```bash
npm run build:client
```
The production bundle will be generated in `client/dist/`.

---

## 🗄️ MongoDB Setup: Standalone vs Replica Set

GroupBuy automatically detects whether your MongoDB cluster supports multi-document transactions:

- **Standalone Mode (Default Local Dev)**:
  Runs single-document atomic updates. When transactions are requested, the system gracefully logs a diagnostic message and executes the operation with optimistic concurrency control.
- **Replica Set Mode (Recommended for Full ACID Transactions)**:
  To enable full multi-document transactions on local MongoDB:
  1. Start `mongod` with a replica set name:
     ```bash
     mongod --replSet rs0 --dbpath /path/to/data
     ```
  2. Open `mongosh` and initiate the replica set:
     ```javascript
     rs.initiate()
     ```
  3. The server will automatically detect the replica set and enable native transactions.

---

## 📜 Available Scripts

| Script | Command | Description |
|---|---|---|
| `npm run install:all` | Installs server and client dependencies | Monorepo dependency setup |
| `npm run dev:server` | `cd server && npm run dev` | Runs backend in development mode with nodemon |
| `npm run dev:client` | `cd client && npm run dev` | Runs Vite frontend development server |
| `npm run build:client` | `cd client && npm run build` | Builds production frontend distribution |
| `npm test` | `cd server && npm test` | Runs complete automated backend test suite |
| `npm run seed` | `cd server && npm run seed` | Seeds database with initial demo data |

---

## 🛡️ Security Best Practices
- **No Secrets in Source Control**: Checked through `.gitignore`.
- **Paise & Basis Points**: Zero rounding error in financial or ownership accounting.
- **Rate Limiting**: Tiered limits on auth and API endpoints with test-mode bypass.
- **Audit Logging**: Structured audit entries recorded for critical state modifications.
