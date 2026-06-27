# StockAI Backend

Express API with Prisma database client and Yahoo Finance API integration for stock data and analysis.

## Setup & Running

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   Create a `.env` file in the root directory:
   ```env
   # General Config
   NODE_ENV=development
   PORT=3000

   # Database (PostgreSQL)
   DATABASE_URL="postgresql://username:password@localhost:5432/stockai?schema=public"

   # AI Analysis Providers (OpenAI / HuggingFace Router)
   OPENAI_API_KEY="your-api-key"
   OPENAI_BASE_URL="https://api.openai.com/v1"
   OPENAI_MODEL="gpt-4o-mini"

   # Security & Rate Limiting
   CORS_ORIGIN=*
   RATE_LIMIT_WINDOW_MS=60000
   RATE_LIMIT_MAX=100
   AI_RATE_LIMIT_MAX=10

   # Cache Configuration
   ANALYSIS_CACHE_HOURS=24
   ```

3. **Initialize Database**:
   ```bash
   npm run db:push
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```

## Available Scripts

- `npm run dev`: Start Express development server with tsx watch
- `npm run build`: Compile TypeScript to JavaScript in `dist/`
- `npm run start`: Start production build using `node`
- `npm run db:generate`: Generate the Prisma Client
- `npm run db:migrate`: Run Prisma migrations locally in development
- `npm run db:deploy`: Deploy existing migrations to cloud/production databases
- `npm run db:push`: Push Prisma schema directly to the database (bypassing migrations)
- `npm run db:studio`: Launch Prisma Studio DB browser
- `npm run format`: Format code with Prettier
- `npm run lint`: Lint code with ESLint
