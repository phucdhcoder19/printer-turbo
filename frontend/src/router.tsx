import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { RequireAuth } from './components/auth/RequireAuth';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { CalendarPage } from './pages/CalendarPage';
import { ContentPage } from './pages/ContentPage';
import { PostEditorPage } from './pages/PostEditorPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { VideosListPage } from './pages/VideosListPage';
import { CreateVideoPage } from './pages/video/CreateVideoPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      // Marketing
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'calendar', element: <CalendarPage /> },
      { path: 'content', element: <ContentPage /> },
      { path: 'content/new', element: <PostEditorPage /> },
      { path: 'content/:id/edit', element: <PostEditorPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
      { path: 'settings', element: <SettingsPage /> },
      // Video
      { path: 'video', element: <CreateVideoPage /> },
      { path: 'videos', element: <VideosListPage /> },
    ],
  },
]);
