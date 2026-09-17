import React from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from './user/HomePage';
import Map from './user/Map';
import AdminPage from './admin/AdminPage';

/**
 * App — Root router.
 * Maps routes to corresponding user page components.
 */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/map" element={<Map />} />
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  );
}
