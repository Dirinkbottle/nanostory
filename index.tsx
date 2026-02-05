import React from 'react';
import ReactDOM from 'react-dom/client';
import { HeroUIProvider } from "@heroui/react";
import './index.css';
import App from './App';
import { ToastProvider } from './contexts/ToastContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <HeroUIProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </HeroUIProvider>
  </React.StrictMode>
);
