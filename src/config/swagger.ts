export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'StockAI API Documentation',
    version: '1.0.0',
    description: 'StockAI Backend — Express API with AI-powered stock analysis',
  },
  servers: [
    {
      url: '/api',
      description: 'API Base Path (default)',
    },
    {
      url: '/',
      description: 'Root Path (for general endpoints like /health)',
    },
  ],
  paths: {
    '/health': {
      get: {
        summary: 'Check API health status',
        description: 'Returns the health, current timestamp, and uptime of the server.',
        responses: {
          200: {
            description: 'API is healthy and running',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    timestamp: { type: 'string', example: '2026-06-27T03:57:00Z' },
                    uptime: { type: 'number', example: 123.45 },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/stocks': {
      get: {
        summary: 'Search or list supported stocks',
        description:
          'Searches stocks by a query string matched with name, ticker, or sector. If no query parameter is provided, returns all supported stocks.',
        parameters: [
          {
            name: 'q',
            in: 'query',
            description: 'Search query for stock name, ticker, or sector',
            required: false,
            schema: {
              type: 'string',
              maxLength: 100,
            },
          },
        ],
        responses: {
          200: {
            description: 'List of matching stock quotes',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    stocks: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/StockQuote',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/stocks/{ticker}': {
      get: {
        summary: 'Get detailed information for a single stock',
        description:
          'Returns detailed technical and financial metrics for a specific ticker (e.g. price, market capitalization, PE ratio, 52-week highs/lows).',
        parameters: [
          {
            name: 'ticker',
            in: 'path',
            description: 'The stock ticker symbol (e.g., AAPL)',
            required: true,
            schema: {
              type: 'string',
              minLength: 1,
              maxLength: 20,
            },
          },
        ],
        responses: {
          200: {
            description: 'Stock details successfully retrieved',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    stock: {
                      $ref: '#/components/schemas/StockDetail',
                    },
                  },
                },
              },
            },
          },
          400: {
            description: 'Invalid or unsupported stock ticker',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          404: {
            description: 'Stock details not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/stocks/{ticker}/analysis': {
      get: {
        summary: 'Get or trigger AI analysis for a stock (SSE)',
        description:
          'Establishes a Server-Sent Events (SSE) connection to stream real-time tokens of the AI analysis, concluding with the full JSON object including cached status.',
        parameters: [
          {
            name: 'ticker',
            in: 'path',
            description: 'The stock ticker symbol (e.g., AAPL)',
            required: true,
            schema: {
              type: 'string',
              minLength: 1,
              maxLength: 20,
            },
          },
        ],
        responses: {
          200: {
            description:
              'Successfully established Server-Sent Events stream. The connection will send "token", "complete", or "error" events.',
            headers: {
              'Content-Type': {
                schema: { type: 'string', example: 'text/event-stream' },
              },
              'Cache-Control': {
                schema: { type: 'string', example: 'no-cache' },
              },
              Connection: {
                schema: { type: 'string', example: 'keep-alive' },
              },
            },
          },
          400: {
            description: 'Invalid or unsupported stock ticker',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      StockQuote: {
        type: 'object',
        required: ['ticker', 'name', 'price', 'change', 'changePercent', 'currency'],
        properties: {
          ticker: { type: 'string', example: 'AAPL' },
          name: { type: 'string', example: 'Apple Inc.' },
          price: { type: 'number', example: 175.5 },
          change: { type: 'number', example: 1.25 },
          changePercent: { type: 'number', example: 0.72 },
          currency: { type: 'string', example: 'USD' },
        },
      },
      StockDetail: {
        allOf: [
          { $ref: '#/components/schemas/StockQuote' },
          {
            type: 'object',
            required: ['marketCap', 'fiftyTwoWeekHigh', 'fiftyTwoWeekLow', 'volume', 'avgVolume'],
            properties: {
              marketCap: { type: 'number', example: 2750000000000 },
              peRatio: { type: 'number', nullable: true, example: 28.5 },
              fiftyTwoWeekHigh: { type: 'number', example: 198.23 },
              fiftyTwoWeekLow: { type: 'number', example: 124.17 },
              volume: { type: 'number', example: 52000000 },
              avgVolume: { type: 'number', example: 55000000 },
            },
          },
        ],
      },
      AnalysisResponse: {
        type: 'object',
        required: [
          'id',
          'ticker',
          'bullCase',
          'bearCase',
          'verdict',
          'createdAt',
          'updatedAt',
          'isCached',
        ],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            example: 'f39a79bb-3d44-4690-bf38-16e0be09756b',
          },
          ticker: { type: 'string', example: 'AAPL' },
          bullCase: { type: 'string', example: 'Strong revenue growth in services.' },
          bearCase: { type: 'string', example: 'Declining hardware sales in key markets.' },
          verdict: { type: 'string', example: 'Hold' },
          createdAt: { type: 'string', format: 'date-time', example: '2026-06-27T03:57:00.000Z' },
          updatedAt: { type: 'string', format: 'date-time', example: '2026-06-27T03:57:00.000Z' },
          isCached: { type: 'boolean', example: true },
        },
      },
      ErrorResponse: {
        type: 'object',
        required: ['status', 'statusCode', 'message'],
        properties: {
          status: { type: 'string', example: 'error' },
          statusCode: { type: 'number', example: 400 },
          message: { type: 'string', example: 'Ticker invalid' },
        },
      },
    },
  },
};
