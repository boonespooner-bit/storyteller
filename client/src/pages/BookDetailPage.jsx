import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAuth } from '../contexts/AuthContext.jsx';
import { books as booksApi, chapters as chaptersApi } from '../utils/api.js';
import { useAudioRecorder } from '../hooks/useAudioRecorder.js';

function SortableChapter({ chapter, index, onClick, onTitleChange }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chapter.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : 'auto',
  };

  const [editing, setEditing] = useState(false);
  const [titleValue, setTitleValue] = useState(chapter.title);
  const inputRef = useRef(null);

  useEffect(() => {
    setTitleValue(chapter.title);
  }, [chapter.title]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const hasNarrative = !!chapter.ai_narrative;
  const hasTranscript = !!chapter.original_transcript;
  const isProcessing = chapter.audio_path && !hasTranscript;

  const formatDate = (dateStr) => {
    return new Date(dateStr + 'Z').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div ref={setNodeRef} style={style} className={`chapter-item ${isDragging ? 'dragging' : ''}`}>
      <div className="chapter-drag-handle" {...attributes} {...listeners}>
        &#x2630;
      </div>
      <div className="chapter-number">{index + 1}</div>
      <div className="chapter-info" onClick={() => !editing && onClick()}>
        {editing ? (
          <input
            ref={inputRef}
            className="editable-title chapter-title"
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={() => {
              setEditing(false);
              if (titleValue.trim() && titleValue.trim() !== chapter.title) {
                onTitleChange(chapter.id, titleValue.trim());
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.target.blur();
              if (e.key === 'Escape') {
                setTitleValue(chapter.title);
                setEditing(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div
            className="chapter-title"
            onClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
            style={{ cursor: 'text' }}
          >
            {chapter.title}
          </div>
        )}
        <div className="chapter-subtitle">
          {formatDate(chapter.created_at)} &middot; {(chapter.word_count || 0).toLocaleString()} words
        </div>
      </div>
      <div className="chapter-status">
        {isProcessing ? (
          <div className="status-dot processing" title="Processing" />
        ) : hasNarrative ? (
          <div className="status-dot ready" title="Ready" />
        ) : null}
      </div>
    </div>
  );
}

export default function BookDetailPage() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { isRecording, duration, formatDuration, startRecording, stopRecording } = useAudioRecorder();

  const [book, setBook] = useState(null);
  const [chaptersList, setChaptersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchData = useCallback(async () => {
    try {
      const [bookData, chaptersData] = await Promise.all([
        booksApi.get(bookId),
        chaptersApi.listByBook(bookId),
      ]);
      setBook(bookData);
      setChaptersList(chaptersData);
    } catch (err) {
      console.error('Failed to fetch book data:', err);
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Poll for processing status
  useEffect(() => {
    const processingChapters = chaptersList.filter(
      (ch) => ch.audio_path && (!ch.original_transcript || !ch.ai_narrative)
    );

    if (processingChapters.length === 0) return;

    const interval = setInterval(async () => {
      const updated = await chaptersApi.listByBook(bookId);
      setChaptersList(updated);

      const stillProcessing = updated.filter(
        (ch) => ch.audio_path && (!ch.original_transcript || !ch.ai_narrative)
      );
      if (stillProcessing.length === 0) {
        clearInterval(interval);
        // Also refresh book data for word count
        const bookData = await booksApi.get(bookId);
        setBook(bookData);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [chaptersList, bookId]);

  const handleRecord = async () => {
    if (isRecording) {
      const blob = await stopRecording();
      if (blob) {
        try {
          const chapter = await chaptersApi.create(bookId, null, blob);
          setChaptersList((prev) => [...prev, chapter]);

          // Show auth prompt for anonymous users after first recording
          if (!isAuthenticated) {
            setShowAuthPrompt(true);
          }
        } catch (err) {
          console.error('Failed to create chapter:', err);
        }
      }
    } else {
      await startRecording();
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = chaptersList.findIndex((ch) => ch.id === active.id);
    const newIndex = chaptersList.findIndex((ch) => ch.id === over.id);
    const newOrder = arrayMove(chaptersList, oldIndex, newIndex);

    setChaptersList(newOrder);

    try {
      await chaptersApi.reorder(bookId, newOrder.map((ch) => ch.id));
    } catch (err) {
      console.error('Reorder failed:', err);
      fetchData();
    }
  };

  const handleTitleChange = async (chapterId, newTitle) => {
    try {
      await chaptersApi.update(chapterId, { title: newTitle });
      setChaptersList((prev) =>
        prev.map((ch) => (ch.id === chapterId ? { ...ch, title: newTitle } : ch))
      );
    } catch (err) {
      console.error('Failed to update chapter title:', err);
    }
  };

  const handleBookTitleChange = async (newTitle) => {
    if (!newTitle.trim() || !book) return;
    try {
      const updated = await booksApi.update(bookId, { title: newTitle.trim() });
      setBook(updated);
    } catch (err) {
      console.error('Failed to update book title:', err);
    }
  };

  if (loading) {
    return (
      <>
        <div className="header">
          <button className="header-back" onClick={() => navigate('/')}>&larr;</button>
          <span className="header-title">Loading...</span>
          <div />
        </div>
        <div className="loading"><div className="spinner" /></div>
      </>
    );
  }

  if (!book) {
    return (
      <>
        <div className="header">
          <button className="header-back" onClick={() => navigate('/')}>&larr;</button>
          <span className="header-title">Not Found</span>
          <div />
        </div>
        <div className="page">
          <div className="empty-state">
            <h3>Book not found</h3>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="header">
        <button className="header-back" onClick={() => navigate('/')}>&larr;</button>
        <input
          className="editable-title header-title"
          style={{ textAlign: 'center', flex: 1, margin: '0 8px' }}
          value={book.title}
          onChange={(e) => setBook({ ...book, title: e.target.value })}
          onBlur={(e) => handleBookTitleChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
        />
        <div style={{ width: 40 }} />
      </div>

      <div className="page">
        <div style={{ marginBottom: 16, color: 'var(--text-secondary)', fontSize: 13 }}>
          by {book.author} &middot; {book.chapter_count || chaptersList.length} chapters &middot; {(book.total_words || 0).toLocaleString()} words
        </div>

        {/* Auth prompt for anonymous users */}
        {showAuthPrompt && !isAuthenticated && (
          <div className="auth-prompt">
            <h3>Don&apos;t lose your recordings!</h3>
            <p>Create an account to save your stories and access them from any device.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/auth')}>
                Create Account
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAuthPrompt(false)}>
                Later
              </button>
            </div>
          </div>
        )}

        {chaptersList.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">&#127908;</div>
            <h3>No Stories Yet</h3>
            <p>Tap the record button below to start telling your first story.</p>
          </div>
        ) : (
          <div className="section-label">Chapters</div>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={chaptersList.map((ch) => ch.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="chapter-list">
              {chaptersList.map((chapter, index) => (
                <SortableChapter
                  key={chapter.id}
                  chapter={chapter}
                  index={index}
                  onClick={() => navigate(`/book/${bookId}/chapter/${chapter.id}`)}
                  onTitleChange={handleTitleChange}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Record button */}
      <div className="record-section">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {isRecording && (
            <div className="record-timer">{formatDuration(duration)}</div>
          )}
          <button
            className={`record-btn ${isRecording ? 'recording' : ''}`}
            onClick={handleRecord}
            title={isRecording ? 'Stop recording' : 'Start recording'}
          >
            <div className="record-btn-inner" />
          </button>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
            {isRecording ? 'Tap to stop' : 'Tap to record a story'}
          </div>
        </div>
      </div>
    </>
  );
}
