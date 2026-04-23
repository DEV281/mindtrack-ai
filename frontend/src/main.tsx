import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#ffffff',
            color: '#2c3e50',
            border: '1px solid #dde7ef',
            borderRadius: '16px',
            fontFamily: 'Nunito, sans-serif',
            boxShadow: '0 4px 20px rgba(91,155,213,0.12)',
          },
          success: { iconTheme: { primary: '#52b788', secondary: '#ffffff' } },
          error: { iconTheme: { primary: '#d4829a', secondary: '#ffffff' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
