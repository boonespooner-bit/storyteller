import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext.jsx';
import BooksPage from './pages/BooksPage.jsx';
import BookDetailPage from './pages/BookDetailPage.jsx';
import ChapterDetailPage from './pages/ChapterDetailPage.jsx';
import AuthPage from './pages/AuthPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';

export default function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="app">
        <div className="loading" style={{ minHeight: '100vh' }}>
          <div className="spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<BooksPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/book/:bookId" element={<BookDetailPage />} />
        <Route path="/book/:bookId/chapter/:chapterId" element={<ChapterDetailPage />} />
      </Routes>
    </div>
  );
}
