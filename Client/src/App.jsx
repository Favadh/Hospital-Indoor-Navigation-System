import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './user/HomePage';
import Map from './user/Map';
import AdminLogin from './admin/components/AdminLogin';
import AdminPage from './admin/AdminPage';

/**
 * App — Root router.
 * Maps routes to user pages and modular admin portal pages.
 */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/map" element={<Map />} />
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<AdminPage />} />
      <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
