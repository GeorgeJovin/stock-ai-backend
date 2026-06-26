# StockAI Backend

Express API with Prisma database client and Yahoo Finance API integration for stock data and analysis.

## Setup & Running

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   Create a `.env` file in the root directory (refer to `.env` file setup):
   ```env
   DATABASE_URL="file:./dev.db"
   OPENAI_API_KEY="your-openai-api-key"
   PORT=3000
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
- `npm run db:push`: Push Prisma schema to the database
- `npm run db:studio`: Launch Prisma Studio DB browser
- `npm run format`: Format code with Prettier
- `npm run lint`: Lint code with ESLint
