import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { books as booksApi } from '../utils/api.js';

export default function BooksPage() {
  const { user, isAuthenticated, logout } = useAuth();
  const [booksList, setBooksList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const navigate = useNavigate();

  const fetchBooks = useCallback(async () => {
    try {
      if (isAuthenticated) {
        const data = await booksApi.list();
        setBooksList(data);
      } else {
        // For anonymous users, get books from local storage IDs
        const anonBookIds = JSON.parse(localStorage.getItem('anonBookIds') || '[]');
        if (anonBookIds.length > 0) {
          const booksData = [];
          for (const id of anonBookIds) {
            try {
              const book = await booksApi.get(id);
              booksData.push(book);
            } catch {
              // Book might have been deleted
            }
          }
          setBooksList(booksData);
        } else {
          setBooksList([]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch books:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const handleCreateBook = async () => {
    if (!newTitle.trim() || !newAuthor.trim()) return;

    try {
      const book = await booksApi.create(newTitle.trim(), newAuthor.trim());

      if (!isAuthenticated) {
        const anonBookIds = JSON.parse(localStorage.getItem('anonBookIds') || '[]');
        anonBookIds.push(book.id);
        localStorage.setItem('anonBookIds', JSON.stringify(anonBookIds));
      }

      setShowCreateModal(false);
      setNewTitle('');
      setNewAuthor('');
      navigate(`/book/${book.id}`);
    } catch (err) {
      console.error('Failed to create book:', err);
    }
  };

  const handleDeleteBook = async (bookId) => {
    try {
      await booksApi.delete(bookId);
      setBooksList(prev => prev.filter(b => b.id !== bookId));

      if (!isAuthenticated) {
        const anonBookIds = JSON.parse(localStorage.getItem('anonBookIds') || '[]');
        localStorage.setItem('anonBookIds', JSON.stringify(anonBookIds.filter(id => id !== bookId)));
      }
    } catch (err) {
      console.error('Failed to delete book:', err);
    }
    setShowDeleteConfirm(null);
  };

  const handleUpdateTitle = async (bookId, newBookTitle) => {
    try {
      const updated = await booksApi.update(bookId, { title: newBookTitle });
      setBooksList(prev => prev.map(b => b.id === bookId ? updated : b));
    } catch (err) {
      console.error('Failed to update book:', err);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr + 'Z').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <>
      {/* Header */}
      <div className="header">
        <span className="header-title">The Storyteller</span>
        <div className="header-actions">
          {isAuthenticated ? (
            <div style={{ position: 'relative' }}>
              <button
                className="user-btn"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
              </button>
              {showUserMenu && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 140 }}
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="user-menu">
                    <div className="user-menu-email">{user.email}</div>
                    <button className="user-menu-item" onClick={() => { logout(); setShowUserMenu(false); }}>
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/auth')}>
              Sign In
            </button>
          )}
        </div>
      </div>

      {/* Page */}
      <div className="page">
        {/* Auth prompt for non-authenticated users */}
        {!isAuthenticated && (
          <div className="auth-prompt">
            <h3>Save Your Stories</h3>
            <p>Create an account to save your books and access them from any device.</p>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/auth')}>
              Create Account
            </button>
          </div>
        )}

        {loading ? (
          <div className="loading">
            <div className="spinner" />
          </div>
        ) : booksList.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">&#128214;</div>
            <h3>No Books Yet</h3>
            <p>Start your first book to begin recording your life stories.</p>
          </div>
        ) : (
          <div className="book-list">
            {booksList.map((book) => (
              <div key={book.id} className="card book-card" style={{ position: 'relative' }}>
                <div
                  className="card-interactive"
                  onClick={() => navigate(`/book/${book.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <input
                    className="editable-title book-card-title"
                    value={book.title}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      setBooksList(prev =>
                        prev.map(b => b.id === book.id ? { ...b, title: e.target.value } : b)
                      );
                    }}
                    onBlur={(e) => {
                      if (e.target.value.trim()) {
                        handleUpdateTitle(book.id, e.target.value.trim());
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.target.blur();
                    }}
                  />
                  <div className="book-card-meta">
                    <span>by {book.author}</span>
                    <span>Started {formatDate(book.created_at)}</span>
                    <span>{book.chapter_count || 0} chapters</span>
                    <span>{(book.total_words || 0).toLocaleString()} words</span>
                  </div>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ position: 'absolute', top: 12, right: 12, color: 'var(--danger)', fontSize: 16 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteConfirm(book.id);
                  }}
                >
                  &#x2715;
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Book Button */}
      <button
        className="btn btn-primary btn-full new-book-btn"
        onClick={() => setShowCreateModal(true)}
      >
        + Create New Book
      </button>

      {/* Create Book Modal */}
      {showCreateModal && (
        <div className="overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle" />
            <h2 className="modal-title">Create New Book</h2>

            <div className="form-group">
              <label className="form-label">Book Title</label>
              <input
                className="form-input"
                placeholder="My Life Story"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Author Name</label>
              <input
                className="form-input"
                placeholder="Your name"
                value={newAuthor}
                onChange={(e) => setNewAuthor(e.target.value)}
              />
            </div>

            <button
              className="btn btn-primary btn-full"
              onClick={handleCreateBook}
              disabled={!newTitle.trim() || !newAuthor.trim()}
            >
              Create Book
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="overlay modal-centered" onClick={() => setShowDeleteConfirm(null)}>
          <div className="modal confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 12, fontFamily: 'var(--font-serif)' }}>Delete Book?</h3>
            <p>Are you sure? Deleting this book will remove it permanently.</p>
            <div className="confirm-actions">
              <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={() => handleDeleteBook(showDeleteConfirm)}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
