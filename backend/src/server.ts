import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5005;

// CORS configuration to allow local development & production urls
const corsOptions = {
  origin: '*', // Allow all origins for testing/ease of use, customize in production
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' })); // Increase limits for larger batches
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check Route
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Register routes
app.use('/api', apiRouter);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : undefined
  });
});

app.listen(PORT, () => {
  console.log(`🚀 GrowEasy CSV Importer Backend running on port ${PORT}`);
  console.log(`Health Check: http://localhost:${PORT}/health`);
  console.log(`API Base Path: http://localhost:${PORT}/api`);
});
