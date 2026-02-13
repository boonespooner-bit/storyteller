import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/setup.js';
import { authenticateToken, requireAuth } from '../middleware/auth.js';

const router = Router();

// Get all books for current user
router.get('/', authenticateToken, (req, res) => {
  const db = getDb();

  if (req.user) {
    const books = db.prepare(`
      SELECT b.*,
        (SELECT COUNT(*) FROM chapters WHERE book_id = b.id) as chapter_count,
        (SELECT COALESCE(SUM(word_count), 0) FROM chapters WHERE book_id = b.id) as total_words
      FROM books b
      WHERE b.user_id = ?
      ORDER BY b.updated_at DESC
    `).all(req.user.id);
    res.json(books);
  } else {
    // Return empty for unauthenticated requests - they use local storage
    res.json([]);
  }
});

// Get single book
router.get('/:id', authenticateToken, (req, res) => {
  const db = getDb();
  const book = db.prepare(`
    SELECT b.*,
      (SELECT COUNT(*) FROM chapters WHERE book_id = b.id) as chapter_count,
      (SELECT COALESCE(SUM(word_count), 0) FROM chapters WHERE book_id = b.id) as total_words
    FROM books b
    WHERE b.id = ?
  `).get(req.params.id);

  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }

  // Check access
  if (book.user_id && (!req.user || req.user.id !== book.user_id)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  res.json(book);
});

// Create book
router.post('/', authenticateToken, (req, res) => {
  const { title, author } = req.body;
  if (!title || !author) {
    return res.status(400).json({ error: 'Title and author are required' });
  }

  const db = getDb();
  const id = uuidv4();
  const userId = req.user ? req.user.id : null;

  db.prepare('INSERT INTO books (id, user_id, title, author) VALUES (?, ?, ?, ?)').run(
    id, userId, title, author
  );

  const book = db.prepare(`
    SELECT b.*,
      0 as chapter_count,
      0 as total_words
    FROM books b WHERE b.id = ?
  `).get(id);

  res.status(201).json(book);
});

// Export book as text
router.get('/:id/export', authenticateToken, (req, res) => {
  const db = getDb();
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);

  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }

  if (book.user_id && (!req.user || req.user.id !== book.user_id)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const chapters = db.prepare(
    'SELECT title, ai_narrative, position FROM chapters WHERE book_id = ? ORDER BY position ASC'
  ).all(req.params.id);

  let text = `${book.title}\nby ${book.author}\n\n`;

  chapters.forEach((ch, i) => {
    text += `Chapter ${i + 1}: ${ch.title}\n\n`;
    text += (ch.ai_narrative || '(No narrative yet)') + '\n\n';
    if (i < chapters.length - 1) {
      text += '---\n\n';
    }
  });

  const filename = book.title.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_') + '.txt';

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(text);
});

// Update book
router.put('/:id', authenticateToken, (req, res) => {
  const db = getDb();
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);

  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }

  if (book.user_id && (!req.user || req.user.id !== book.user_id)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { title, author } = req.body;
  db.prepare('UPDATE books SET title = COALESCE(?, title), author = COALESCE(?, author), updated_at = datetime(\'now\') WHERE id = ?').run(
    title, author, req.params.id
  );

  const updated = db.prepare(`
    SELECT b.*,
      (SELECT COUNT(*) FROM chapters WHERE book_id = b.id) as chapter_count,
      (SELECT COALESCE(SUM(word_count), 0) FROM chapters WHERE book_id = b.id) as total_words
    FROM books b WHERE b.id = ?
  `).get(req.params.id);

  res.json(updated);
});

// Delete book
router.delete('/:id', authenticateToken, (req, res) => {
  const db = getDb();
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);

  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }

  if (book.user_id && (!req.user || req.user.id !== book.user_id)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  db.prepare('DELETE FROM books WHERE id = ?').run(req.params.id);
  res.json({ message: 'Book deleted' });
});

export default router;
