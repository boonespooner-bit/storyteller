import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { chapters as chaptersApi } from '../utils/api.js';

export default function ChapterDetailPage() {
  const { bookId, chapterId } = useParams();
  const navigate = useNavigate();

  const [chapter, setChapter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [narrativeText, setNarrativeText] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const saveTimer = useRef(null);

  const fetchChapter = useCallback(async () => {
    try {
      const data = await chaptersApi.get(chapterId);
      setChapter(data);
      setNarrativeText(data.ai_narrative || '');
    } catch (err) {
      console.error('Failed to fetch chapter:', err);
    } finally {
      setLoading(false);
    }
  }, [chapterId]);

  useEffect(() => {
    fetchChapter();
  }, [fetchChapter]);

  // Poll for processing status
  useEffect(() => {
    if (!chapter) return;
    if (chapter.audio_path && (!chapter.original_transcript || !chapter.ai_narrative)) {
      const interval = setInterval(async () => {
        const updated = await chaptersApi.get(chapterId);
        setChapter(updated);
        if (updated.ai_narrative && !narrativeText) {
          setNarrativeText(updated.ai_narrative);
        }
        if (updated.original_transcript && updated.ai_narrative) {
          clearInterval(interval);
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [chapter, chapterId, narrativeText]);

  const handleNarrativeChange = (e) => {
    const newText = e.target.value;
    setNarrativeText(newText);
    setSaveStatus('saving');

    // Debounced auto-save
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await chaptersApi.update(chapterId, { ai_narrative: newText });
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(''), 2000);
      } catch (err) {
        console.error('Auto-save failed:', err);
        setSaveStatus('error');
      }
    }, 1000);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  if (loading) {
    return (
      <>
        <div className="header">
          <button className="header-back" onClick={() => navigate(`/book/${bookId}`)}>&larr;</button>
          <span className="header-title">Loading...</span>
          <div style={{ width: 40 }} />
        </div>
        <div className="loading"><div className="spinner" /></div>
      </>
    );
  }

  if (!chapter) {
    return (
      <>
        <div className="header">
          <button className="header-back" onClick={() => navigate(`/book/${bookId}`)}>&larr;</button>
          <span className="header-title">Not Found</span>
          <div style={{ width: 40 }} />
        </div>
        <div className="page">
          <div className="empty-state">
            <h3>Chapter not found</h3>
          </div>
        </div>
      </>
    );
  }

  const isProcessing = chapter.audio_path && (!chapter.original_transcript || !chapter.ai_narrative);

  return (
    <>
      <div className="header">
        <button className="header-back" onClick={() => navigate(`/book/${bookId}`)}>&larr;</button>
        <span className="header-title" style={{ flex: 1, textAlign: 'center' }}>
          {chapter.title}
        </span>
        <div style={{ width: 40 }} />
      </div>

      <div className="page chapter-detail">
        {/* Processing indicator */}
        {isProcessing && (
          <div className="processing-indicator">
            <div className="spinner" />
            <span>
              {!chapter.original_transcript
                ? 'Transcribing your recording...'
                : 'Generating narrative...'}
            </span>
          </div>
        )}

        {/* Audio player */}
        {chapter.audio_path && (
          <div className="audio-section">
            <div className="section-label">Original Recording</div>
            <div className="audio-player">
              <audio controls preload="metadata">
                <source src={chapter.audio_path} type="audio/webm" />
                Your browser does not support the audio element.
              </audio>
            </div>
          </div>
        )}

        {/* Original transcript (collapsible) */}
        {chapter.original_transcript && (
          <div className="transcript-section">
            <div
              className="collapsible-header"
              onClick={() => setTranscriptOpen(!transcriptOpen)}
            >
              <span>Original Transcript</span>
              <span>{transcriptOpen ? '\u25B2' : '\u25BC'}</span>
            </div>
            {transcriptOpen && (
              <div className="collapsible-content">
                {chapter.original_transcript}
              </div>
            )}
          </div>
        )}

        {/* AI Narrative - editable */}
        <div className="narrative-section">
          <h3>Story Narrative</h3>
          {narrativeText || !isProcessing ? (
            <>
              <textarea
                className="narrative-editor"
                value={narrativeText}
                onChange={handleNarrativeChange}
                placeholder={
                  isProcessing
                    ? 'Your narrative is being generated...'
                    : 'The AI-generated narrative will appear here once your recording is processed.'
                }
                disabled={isProcessing}
              />
              {saveStatus && (
                <div className={`save-indicator ${saveStatus}`}>
                  {saveStatus === 'saving'
                    ? 'Saving...'
                    : saveStatus === 'saved'
                    ? 'All changes saved'
                    : 'Save failed'}
                </div>
              )}
            </>
          ) : (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-secondary)' }}>
              <div className="spinner" style={{ margin: '0 auto 12px' }} />
              <p>Generating your story narrative...</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
