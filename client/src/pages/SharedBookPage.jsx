import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { shares as sharesApi } from '../utils/api.js';

export default function SharedBookPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [book, setBook] = useState(null);
  const [chaptersList, setChaptersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [bookData, chaptersData] = await Promise.all([
        sharesApi.getBook(token),
        sharesApi.getChapters(token),
      ]);
      setBook(bookData);
      setChaptersList(chaptersData);
    } catch (err) {
      setError('This shared link is no longer valid.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatDate = (dateStr) => {
    return new Date(dateStr + 'Z').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <>
        <div className="header">
          <div style={{ width: 40 }} />
          <span className="header-title">Loading...</span>
          <div style={{ width: 40 }} />
        </div>
        <div className="loading"><div className="spinner" /></div>
      </>
    );
  }

  if (error || !book) {
    return (
      <>
        <div className="header">
          <div style={{ width: 40 }} />
          <span className="header-title">Shared Book</span>
          <div style={{ width: 40 }} />
        </div>
        <div className="page">
          <div className="empty-state">
            <h3>{error || 'Book not found'}</h3>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="header">
        <div style={{ width: 40 }} />
        <span className="header-title" style={{ flex: 1, textAlign: 'center' }}>
          {book.title}
        </span>
        <div style={{ width: 40 }} />
      </div>

      <div className="page">
        <div style={{ marginBottom: 16, color: 'var(--text-secondary)', fontSize: 13 }}>
          by {book.author} &middot; {book.chapter_count || chaptersList.length} chapters &middot; {(book.total_words || 0).toLocaleString()} words
        </div>

        {chaptersList.length === 0 ? (
          <div className="empty-state">
            <h3>No chapters yet</h3>
            <p>This book doesn&apos;t have any chapters yet.</p>
          </div>
        ) : (
          <div className="section-label">Chapters</div>
        )}

        <div className="chapter-list">
          {chaptersList.map((chapter, index) => {
            const hasNarrative = !!chapter.ai_narrative;
            return (
              <div
                key={chapter.id}
                className="chapter-item"
                onClick={() => navigate(`/shared/${token}/chapter/${chapter.id}`)}
              >
                <div className="chapter-number">{index + 1}</div>
                <div className="chapter-info">
                  <div className="chapter-title">{chapter.title}</div>
                  <div className="chapter-subtitle">
                    {formatDate(chapter.created_at)} &middot; {(chapter.word_count || 0).toLocaleString()} words
                  </div>
                </div>
                <div className="chapter-status">
                  {hasNarrative && (
                    <div className="status-dot ready" title="Ready" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
