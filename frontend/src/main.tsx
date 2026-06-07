import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { ToastProvider } from './components/ui/Toast';
import { ChannelsProvider } from './lib/useChannels';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <ChannelsProvider>
        <RouterProvider router={router} />
      </ChannelsProvider>
    </ToastProvider>
  </React.StrictMode>,
);
