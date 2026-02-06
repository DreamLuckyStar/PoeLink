// main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import DisclaimerGate from './DisclaimerGate';
import './tailwind.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DisclaimerGate />
  </React.StrictMode>
);