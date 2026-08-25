import axios from 'axios';

// Dynamic API Base URL — resolves to current hostname automatically
// Allows LAN access (e.g. http://192.168.x.x:5173 → http://192.168.x.x:8000)
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined'
    ? `http://${window.location.hostname}:8000`
    : 'http://localhost:8000');

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
