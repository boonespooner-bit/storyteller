import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { shares as sharesApi } from '../utils/api.js';

export default function SharedChapterPage() {
  const { token, chapterId } = useParams();
  const navigate = useNavigate();

  const [chapter, setChapter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  const fetchChapter = useCallback(async () => {
    try {
      const data = await sharesApi.getChapter(token, chapterId);
      setChapter(data);
    } catch (err) {
      console.error('Failed to fetch chapter:', err);
    } finally {
      setLoading(false);
    }
  }, [token, chapterId]);

  useEffect(() => {
    fetchChapter();
  }, [fetchChapter]);

  if (loading) {
    return (
      <>
        <div className="header">
          <button className="header-back" onClick={() => navigate(`/shared/${token}`)}>&larr;</button>
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
          <button className="header-back" onClick={() => navigate(`/shared/${token}`)}>&larr;</button>
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

  return (
    <>
      <div className="header">
        <button className="header-back" onClick={() => navigate(`/shared/${token}`)}>&larr;</button>
        <span className="header-title" style={{ flex: 1, textAlign: 'center' }}>
          {chapter.title}
        </span>
        <div style={{ width: 40 }} />
      </div>

      <div className="page chapter-detail">
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

        {/* Narrative - read only */}
        <div className="narrative-section">
          <h3>Story Narrative</h3>
          {chapter.ai_narrative ? (
            <div className="narrative-readonly">
              {chapter.ai_narrative}
            </div>
          ) : (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-secondary)' }}>
              <p>No narrative available yet.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
