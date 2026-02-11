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
