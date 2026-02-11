import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getDb } from '../db/setup.js';
import { authenticateToken } from '../middleware/auth.js';
import { transcribeAudio, generateNarrative } from '../services/gemini.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', '..');
const uploadsDir = path.join(dataDir, 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

const router = Router();

// Get chapters for a book
router.get('/book/:bookId', authenticateToken, (req, res) => {
  const db = getDb();
  const chapters = db.prepare(
    'SELECT * FROM chapters WHERE book_id = ? ORDER BY position ASC'
  ).all(req.params.bookId);
  res.json(chapters);
});

// Get single chapter
router.get('/:id', authenticateToken, (req, res) => {
  const db = getDb();
  const chapter = db.prepare('SELECT * FROM chapters WHERE id = ?').get(req.params.id);
  if (!chapter) {
    return res.status(404).json({ error: 'Chapter not found' });
  }
  res.json(chapter);
});

// Create chapter with audio upload
router.post('/', authenticateToken, upload.single('audio'), async (req, res) => {
  try {
    const { bookId, title } = req.body;
    if (!bookId) {
      return res.status(400).json({ error: 'Book ID is required' });
    }

    const db = getDb();
    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Get next position
    const lastChapter = db.prepare(
      'SELECT MAX(position) as maxPos FROM chapters WHERE book_id = ?'
    ).get(bookId);
    const position = (lastChapter.maxPos ?? -1) + 1;

    const id = uuidv4();
    const audioPath = req.file ? `/uploads/${req.file.filename}` : null;

    db.prepare(
      'INSERT INTO chapters (id, book_id, title, position, audio_path) VALUES (?, ?, ?, ?, ?)'
    ).run(id, bookId, title || `Chapter ${position + 1}`, position, audioPath);

    // Update book timestamp
    db.prepare('UPDATE books SET updated_at = datetime(\'now\') WHERE id = ?').run(bookId);

    let chapter = db.prepare('SELECT * FROM chapters WHERE id = ?').get(id);

    // If audio file was uploaded, start transcription in background
    if (req.file) {
      processAudio(id, req.file.path, bookId);
    }

    res.status(201).json(chapter);
  } catch (err) {
    console.error('Create chapter error:', err);
    res.status(500).json({ error: 'Failed to create chapter' });
  }
});

// Background audio processing
async function processAudio(chapterId, audioFilePath, bookId) {
  try {
    const db = getDb();

    // Step 1: Transcribe audio
    const transcript = await transcribeAudio(audioFilePath);
    const wordCount = transcript ? transcript.split(/\s+/).filter(Boolean).length : 0;

    db.prepare(
      'UPDATE chapters SET original_transcript = ?, word_count = ?, updated_at = datetime(\'now\') WHERE id = ?'
    ).run(transcript, wordCount, chapterId);

    // Step 2: Get all chapters in this book for context
    const allChapters = db.prepare(
      'SELECT * FROM chapters WHERE book_id = ? ORDER BY position ASC'
    ).all(bookId);

    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId);

    // Step 3: Generate narrative
    const narrative = await generateNarrative(transcript, allChapters, book);
    const narrativeWordCount = narrative ? narrative.split(/\s+/).filter(Boolean).length : 0;

    db.prepare(
      'UPDATE chapters SET ai_narrative = ?, word_count = ?, updated_at = datetime(\'now\') WHERE id = ?'
    ).run(narrative, narrativeWordCount, chapterId);

    // Update book timestamp
    db.prepare('UPDATE books SET updated_at = datetime(\'now\') WHERE id = ?').run(bookId);
  } catch (err) {
    console.error('Audio processing error:', err);
  }
}

// Update chapter
router.put('/:id', authenticateToken, (req, res) => {
  const db = getDb();
  const chapter = db.prepare('SELECT * FROM chapters WHERE id = ?').get(req.params.id);
  if (!chapter) {
    return res.status(404).json({ error: 'Chapter not found' });
  }

  const { title, ai_narrative, position } = req.body;

  if (title !== undefined) {
    db.prepare('UPDATE chapters SET title = ?, updated_at = datetime(\'now\') WHERE id = ?').run(title, req.params.id);
  }

  if (ai_narrative !== undefined) {
    const wordCount = ai_narrative.split(/\s+/).filter(Boolean).length;
    db.prepare('UPDATE chapters SET ai_narrative = ?, word_count = ?, updated_at = datetime(\'now\') WHERE id = ?').run(
      ai_narrative, wordCount, req.params.id
    );
  }

  if (position !== undefined) {
    db.prepare('UPDATE chapters SET position = ?, updated_at = datetime(\'now\') WHERE id = ?').run(position, req.params.id);
  }

  // Update book timestamp
  db.prepare('UPDATE books SET updated_at = datetime(\'now\') WHERE id = ?').run(chapter.book_id);

  const updated = db.prepare('SELECT * FROM chapters WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// Reorder chapters
router.put('/reorder/:bookId', authenticateToken, (req, res) => {
  const { chapterIds } = req.body;
  if (!chapterIds || !Array.isArray(chapterIds)) {
    return res.status(400).json({ error: 'chapterIds array is required' });
  }

  const db = getDb();
  const stmt = db.prepare('UPDATE chapters SET position = ?, updated_at = datetime(\'now\') WHERE id = ?');
  const transaction = db.transaction(() => {
    chapterIds.forEach((id, index) => {
      stmt.run(index, id);
    });
  });
  transaction();

  const chapters = db.prepare(
    'SELECT * FROM chapters WHERE book_id = ? ORDER BY position ASC'
  ).all(req.params.bookId);

  res.json(chapters);
});

// Delete chapter
router.delete('/:id', authenticateToken, (req, res) => {
  const db = getDb();
  const chapter = db.prepare('SELECT * FROM chapters WHERE id = ?').get(req.params.id);
  if (!chapter) {
    return res.status(404).json({ error: 'Chapter not found' });
  }

  // Delete audio file if exists
  if (chapter.audio_path) {
    const fullPath = path.join(__dirname, '..', '..', chapter.audio_path);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }

  db.prepare('DELETE FROM chapters WHERE id = ?').run(req.params.id);

  // Reorder remaining chapters
  const remaining = db.prepare(
    'SELECT id FROM chapters WHERE book_id = ? ORDER BY position ASC'
  ).all(chapter.book_id);
  const stmt = db.prepare('UPDATE chapters SET position = ? WHERE id = ?');
  remaining.forEach((ch, i) => stmt.run(i, ch.id));

  // Update book timestamp
  db.prepare('UPDATE books SET updated_at = datetime(\'now\') WHERE id = ?').run(chapter.book_id);

  res.json({ message: 'Chapter deleted' });
});

// Get processing status
router.get('/:id/status', authenticateToken, (req, res) => {
  const db = getDb();
  const chapter = db.prepare(
    'SELECT id, original_transcript, ai_narrative FROM chapters WHERE id = ?'
  ).get(req.params.id);

  if (!chapter) {
    return res.status(404).json({ error: 'Chapter not found' });
  }

  res.json({
    hasTranscript: !!chapter.original_transcript,
    hasNarrative: !!chapter.ai_narrative,
  });
});

export default router;
