import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from './db/setup.js';
import authRoutes from './routes/auth.js';
import bookRoutes from './routes/books.js';
import chapterRoutes from './routes/chapters.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// Initialize database
getDb();

app.use(cors());
app.use(express.json());

// Serve uploaded files
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..');
app.use('/uploads', express.static(path.join(dataDir, 'uploads')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/chapters', chapterRoutes);

// Serve frontend in production
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('/{*path}', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(distPath, 'index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`Storyteller server running on port ${PORT}`);
});
