import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

const container = document.getElementById('root') as HTMLElement | null;
if (!container) {
  console.error('Root container with id "root" not found ');
} else {
  const root = createRoot(container as HTMLElement);
  root.render(<App />);
}
