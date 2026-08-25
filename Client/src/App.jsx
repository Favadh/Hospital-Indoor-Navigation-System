import React from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';

/**
 * App — Root component.
 * Handles route definitions only. All page logic lives in /pages.
 */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
    </Routes>
  );
}
