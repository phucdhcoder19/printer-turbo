import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { ToastProvider } from './components/ui/Toast';
import { AuthProvider } from './lib/useAuth';
import { ChannelsProvider } from './lib/useChannels';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <AuthProvider>
        <ChannelsProvider>
          <RouterProvider router={router} />
        </ChannelsProvider>
      </AuthProvider>
    </ToastProvider>
  </React.StrictMode>,
);
