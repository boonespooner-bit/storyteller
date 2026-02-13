import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { getDb } from '../db/setup.js';
import { authenticateToken } from '../middleware/auth.js';
import { sendShareInviteEmail } from '../services/email.js';

const router = Router();

// Share a book with someone via email
router.post('/books/:id/share', authenticateToken, async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const db = getDb();
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);

  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }

  if (book.user_id && (!req.user || req.user.id !== book.user_id)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Check if already shared with this email
  const existing = db.prepare(
    'SELECT * FROM book_shares WHERE book_id = ? AND email = ?'
  ).get(req.params.id, email.toLowerCase());

  if (existing) {
    return res.status(400).json({ error: 'Book is already shared with this email' });
  }

  const id = uuidv4();
  const token = crypto.randomBytes(32).toString('hex');

  db.prepare(
    'INSERT INTO book_shares (id, book_id, email, token) VALUES (?, ?, ?, ?)'
  ).run(id, req.params.id, email.toLowerCase(), token);

  // Send invite email
  try {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    await sendShareInviteEmail(email.toLowerCase(), book.title, book.author, token, baseUrl);
  } catch (err) {
    console.error('Failed to send share email:', err);
    // Share is still created even if email fails
  }

  const share = db.prepare('SELECT * FROM book_shares WHERE id = ?').get(id);
  res.status(201).json(share);
});

// List shares for a book
router.get('/books/:id/shares', authenticateToken, (req, res) => {
  const db = getDb();
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);

  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }

  if (book.user_id && (!req.user || req.user.id !== book.user_id)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const shares = db.prepare(
    'SELECT id, email, created_at FROM book_shares WHERE book_id = ? ORDER BY created_at DESC'
  ).all(req.params.id);

  res.json(shares);
});

// Revoke a share
router.delete('/shares/:shareId', authenticateToken, (req, res) => {
  const db = getDb();
  const share = db.prepare('SELECT * FROM book_shares WHERE id = ?').get(req.params.shareId);

  if (!share) {
    return res.status(404).json({ error: 'Share not found' });
  }

  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(share.book_id);
  if (book.user_id && (!req.user || req.user.id !== book.user_id)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  db.prepare('DELETE FROM book_shares WHERE id = ?').run(req.params.shareId);
  res.json({ message: 'Share revoked' });
});

// Public: get shared book via token
router.get('/shared/:token', (req, res) => {
  const db = getDb();
  const share = db.prepare('SELECT * FROM book_shares WHERE token = ?').get(req.params.token);

  if (!share) {
    return res.status(404).json({ error: 'Shared book not found' });
  }

  const book = db.prepare(`
    SELECT b.*,
      (SELECT COUNT(*) FROM chapters WHERE book_id = b.id) as chapter_count,
      (SELECT COALESCE(SUM(word_count), 0) FROM chapters WHERE book_id = b.id) as total_words
    FROM books b WHERE b.id = ?
  `).get(share.book_id);

  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }

  res.json(book);
});

// Public: get chapters for a shared book
router.get('/shared/:token/chapters', (req, res) => {
  const db = getDb();
  const share = db.prepare('SELECT * FROM book_shares WHERE token = ?').get(req.params.token);

  if (!share) {
    return res.status(404).json({ error: 'Shared book not found' });
  }

  const chapters = db.prepare(
    'SELECT id, book_id, title, position, ai_narrative, word_count, created_at FROM chapters WHERE book_id = ? ORDER BY position ASC'
  ).all(share.book_id);

  res.json(chapters);
});

// Public: get a single chapter for a shared book
router.get('/shared/:token/chapters/:chapterId', (req, res) => {
  const db = getDb();
  const share = db.prepare('SELECT * FROM book_shares WHERE token = ?').get(req.params.token);

  if (!share) {
    return res.status(404).json({ error: 'Shared book not found' });
  }

  const chapter = db.prepare(
    'SELECT id, book_id, title, position, audio_path, original_transcript, ai_narrative, word_count, created_at FROM chapters WHERE id = ? AND book_id = ?'
  ).get(req.params.chapterId, share.book_id);

  if (!chapter) {
    return res.status(404).json({ error: 'Chapter not found' });
  }

  res.json(chapter);
});

export default router;
