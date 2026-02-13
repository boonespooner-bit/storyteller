const API_BASE = '/api';

function getHeaders() {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

function getAuthHeader() {
  const token = localStorage.getItem('token');
  if (token) {
    return { 'Authorization': `Bearer ${token}` };
  }
  return {};
}

async function handleResponse(res) {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(
      res.ok ? 'Unexpected response from server' : `Server error (${res.status})`
    );
  }
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

// Auth
export const auth = {
  register: (email, password, name) =>
    fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email, password, name }),
    }).then(handleResponse),

  login: (email, password) =>
    fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email, password }),
    }).then(handleResponse),

  googleSignIn: (credential) =>
    fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ credential }),
    }).then(handleResponse),

  forgotPassword: (email) =>
    fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email }),
    }).then(handleResponse),

  resetPassword: (token, newPassword) =>
    fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ token, newPassword }),
    }).then(handleResponse),

  me: () =>
    fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders(),
    }).then(handleResponse),

  claimBooks: (bookIds) =>
    fetch(`${API_BASE}/auth/claim-books`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ bookIds }),
    }).then(handleResponse),
};

// Books
export const books = {
  list: () =>
    fetch(`${API_BASE}/books`, {
      headers: getHeaders(),
    }).then(handleResponse),

  get: (id) =>
    fetch(`${API_BASE}/books/${id}`, {
      headers: getHeaders(),
    }).then(handleResponse),

  create: (title, author) =>
    fetch(`${API_BASE}/books`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ title, author }),
    }).then(handleResponse),

  update: (id, data) =>
    fetch(`${API_BASE}/books/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse),

  delete: (id) =>
    fetch(`${API_BASE}/books/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    }).then(handleResponse),

  export: async (id) => {
    const res = await fetch(`${API_BASE}/books/${id}/export`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Export failed');
    }
    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="(.+)"/);
    const filename = match ? match[1] : 'book.txt';
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};

// Chapters
export const chapters = {
  listByBook: (bookId) =>
    fetch(`${API_BASE}/chapters/book/${bookId}`, {
      headers: getHeaders(),
    }).then(handleResponse),

  get: (id) =>
    fetch(`${API_BASE}/chapters/${id}`, {
      headers: getHeaders(),
    }).then(handleResponse),

  create: (bookId, title, audioBlob) => {
    const formData = new FormData();
    formData.append('bookId', bookId);
    if (title) formData.append('title', title);
    if (audioBlob) formData.append('audio', audioBlob, 'recording.webm');

    return fetch(`${API_BASE}/chapters`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: formData,
    }).then(handleResponse);
  },

  update: (id, data) =>
    fetch(`${API_BASE}/chapters/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse),

  reorder: (bookId, chapterIds) =>
    fetch(`${API_BASE}/chapters/reorder/${bookId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ chapterIds }),
    }).then(handleResponse),

  delete: (id) =>
    fetch(`${API_BASE}/chapters/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    }).then(handleResponse),

  getStatus: (id) =>
    fetch(`${API_BASE}/chapters/${id}/status`, {
      headers: getHeaders(),
    }).then(handleResponse),
};

// Shares
export const shares = {
  invite: (bookId, email) =>
    fetch(`${API_BASE}/books/${bookId}/share`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email }),
    }).then(handleResponse),

  list: (bookId) =>
    fetch(`${API_BASE}/books/${bookId}/shares`, {
      headers: getHeaders(),
    }).then(handleResponse),

  revoke: (shareId) =>
    fetch(`${API_BASE}/shares/${shareId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    }).then(handleResponse),

  getBook: (token) =>
    fetch(`${API_BASE}/shared/${token}`).then(handleResponse),

  getChapters: (token) =>
    fetch(`${API_BASE}/shared/${token}/chapters`).then(handleResponse),

  getChapter: (token, chapterId) =>
    fetch(`${API_BASE}/shared/${token}/chapters/${chapterId}`).then(handleResponse),
};
