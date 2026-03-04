import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Auth from './views/Auth';
import ScriptStudio from './views/ScriptStudio/index';
import UserCenter from './views/UserCenter';
import AssetsManager from './views/AssetsManager';
import Projects from './views/Projects';
import AdminLogin from './views/AdminLogin';
import AdminLayout from './views/admin/AdminLayout';
import Dashboard from './views/admin/Dashboard';
import AIModels from './views/admin/AIModels';
import UserManagement from './views/admin/UserManagement';
import AdminRoute from './components/AdminRoute';
import ProtectedRoute from './components/ProtectedRoute';
import { ToastProvider } from './contexts/ToastContext';
import { PreviewProvider } from './components/PreviewProvider';
import TaskQueueBubble from './components/TaskQueueBubble';
import Settings from './views/Settings';

const App: React.FC = () => {
  return (
    <Router>
      <PreviewProvider>
        <Routes>
          {/* 公开路由 - 不需要登录 */}
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* 管理员路由 - 需要管理员权限 */}
          <Route path="/admin" element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="ai-models" element={<AIModels />} />
            <Route path="users" element={<UserManagement />} />
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
          </Route>

          {/* 受保护路由 - 需要登录 */}
          <Route path="*" element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<ScriptStudio />} />
                  <Route path="/assets" element={<AssetsManager />} />
                  <Route path="/projects" element={<Projects />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/user-center" element={<UserCenter />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          } />
        </Routes>
        <TaskQueueBubble />
      </PreviewProvider>
    </Router>
  );
};

export default App;