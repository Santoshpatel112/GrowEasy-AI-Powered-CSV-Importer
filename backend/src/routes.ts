import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse';
import { AIService } from './services/ai.js';
import { RawRow } from './types/index.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
const aiService = new AIService();

// Helper to parse CSV buffer async
const parseCsvBuffer = (buffer: Buffer): Promise<RawRow[]> => {
  return new Promise((resolve, reject) => {
    const results: RawRow[] = [];
    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true
    });

    parser.on('readable', () => {
      let record;
      while ((record = parser.read()) !== null) {
        results.push(record);
      }
    });

    parser.on('error', (err) => {
      reject(err);
    });

    parser.on('end', () => {
      resolve(results);
    });

    parser.write(buffer);
    parser.end();
  });
};

/**
 * Route: POST /api/upload-preview
 * Accepts a CSV file, parses it, and returns headers + preview rows.
 */
router.post('/upload-preview', upload.single('csvFile'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No CSV file uploaded' });
      return;
    }

    const fileContent = req.file.buffer;
    const rows = await parseCsvBuffer(fileContent);

    if (rows.length === 0) {
      res.status(400).json({ success: false, message: 'CSV file is empty' });
      return;
    }

    const headers = Object.keys(rows[0]);
    res.json({
      success: true,
      headers,
      rows,
      totalRows: rows.length
    });
  } catch (error: any) {
    console.error('Error parsing CSV:', error);
    res.status(500).json({ success: false, message: 'Failed to parse CSV file', error: error.message });
  }
});

/**
 * Route: POST /api/import
 * Processes raw rows in batches with AI mapping and returns structured leads.
 */
router.post('/import', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { rows, headers } = req.body as { rows: RawRow[]; headers: string[] };

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      res.status(400).json({ success: false, message: 'No rows provided for import' });
      return;
    }

    if (!headers || !Array.isArray(headers) || headers.length === 0) {
      res.status(400).json({ success: false, message: 'No headers provided' });
      return;
    }

    const BATCH_SIZE = 10; // Batching is key for LLMs to stay within limits and succeed
    const imported: any[] = [];
    const skipped: any[] = [];

    // Processing in sequential batches
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(rows.length / BATCH_SIZE)} (size: ${batch.length})...`);
      
      try {
        const result = await aiService.processBatch(batch, headers);
        imported.push(...result.imported);
        skipped.push(...result.skipped);
      } catch (batchError: any) {
        console.error(`Error processing batch starting at index ${i}:`, batchError);
        // Implement auto-retry once
        try {
          console.log(`Retrying batch starting at index ${i}...`);
          const result = await aiService.processBatch(batch, headers);
          imported.push(...result.imported);
          skipped.push(...result.skipped);
        } catch (retryError: any) {
          console.error(`Retry failed for batch starting at index ${i}. Skipping batch.`, retryError);
          // Mark all rows in the failed batch as skipped
          for (const row of batch) {
            skipped.push({
              row,
              reason: `AI processing failed: ${retryError.message}`
            });
          }
        }
      }
    }

    res.json({
      success: true,
      imported,
      skipped,
      stats: {
        totalProcessed: rows.length,
        totalImported: imported.length,
        totalSkipped: skipped.length
      }
    });
  } catch (error: any) {
    console.error('Error during import:', error);
    res.status(500).json({ success: false, message: 'Failed to process CSV data', error: error.message });
  }
});

export default router;
