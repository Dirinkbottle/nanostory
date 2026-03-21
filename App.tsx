import React, { Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Layout from './components/Layout';
import Auth from './views/Auth';
import AdminRoute from './components/AdminRoute';
import ProtectedRoute from './components/ProtectedRoute';
import { ToastProvider } from './contexts/ToastContext';
import { PreviewProvider } from './components/PreviewProvider';
import TaskQueueBubble from './components/TaskQueueBubble';
import Skeleton from './components/Skeleton';

// 懒加载主要视图组件
const ScriptStudio = React.lazy(() => import('./views/ScriptStudio/index'));
const AssetsManager = React.lazy(() => import('./views/AssetsManager'));
const Projects = React.lazy(() => import('./views/Projects'));
const Settings = React.lazy(() => import('./views/Settings'));
const UserCenter = React.lazy(() => import('./views/UserCenter'));

// 懒加载管理员模块
const AdminLogin = React.lazy(() => import('./views/AdminLogin'));
const AdminLayout = React.lazy(() => import('./views/admin/AdminLayout'));
const Dashboard = React.lazy(() => import('./views/admin/Dashboard'));
const AIModels = React.lazy(() => import('./views/admin/AIModels'));
const UserManagement = React.lazy(() => import('./views/admin/UserManagement'));
const ModelStatsDashboard = React.lazy(() => import('./views/admin/ModelStatsDashboard'));

// 加载中回退组件
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-full">
    <Skeleton lines={5} className="w-96" />
  </div>
);

// 页面过渡动画包装组件
const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
    className="h-full"
  >
    {children}
  </motion.div>
);

// 带动画的路由内容组件
const AnimatedRoutes: React.FC = () => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={
          <Suspense fallback={<LoadingFallback />}>
            <PageTransition><ScriptStudio /></PageTransition>
          </Suspense>
        } />
        <Route path="/assets" element={
          <Suspense fallback={<LoadingFallback />}>
            <PageTransition><AssetsManager /></PageTransition>
          </Suspense>
        } />
        <Route path="/projects" element={
          <Suspense fallback={<LoadingFallback />}>
            <PageTransition><Projects /></PageTransition>
          </Suspense>
        } />
        <Route path="/settings" element={
          <Suspense fallback={<LoadingFallback />}>
            <PageTransition><Settings /></PageTransition>
          </Suspense>
        } />
        <Route path="/user-center" element={
          <Suspense fallback={<LoadingFallback />}>
            <PageTransition><UserCenter /></PageTransition>
          </Suspense>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <PreviewProvider>
        <Routes>
          {/* 公开路由 - 不需要登录 */}
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin/login" element={
            <Suspense fallback={<LoadingFallback />}>
              <AdminLogin />
            </Suspense>
          } />

          {/* 管理员路由 - 需要管理员权限 */}
          <Route path="/admin" element={
            <AdminRoute>
              <Suspense fallback={<LoadingFallback />}>
                <AdminLayout />
              </Suspense>
            </AdminRoute>
          }>
            <Route path="dashboard" element={
              <Suspense fallback={<LoadingFallback />}>
                <Dashboard />
              </Suspense>
            } />
            <Route path="ai-models" element={
              <Suspense fallback={<LoadingFallback />}>
                <AIModels />
              </Suspense>
            } />
            <Route path="users" element={
              <Suspense fallback={<LoadingFallback />}>
                <UserManagement />
              </Suspense>
            } />
            <Route path="model-stats" element={
              <Suspense fallback={<LoadingFallback />}>
                <ModelStatsDashboard />
              </Suspense>
            } />
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
          </Route>

          {/* 受保护路由 - 需要登录 */}
          <Route path="*" element={
            <ProtectedRoute>
              <Layout>
                <AnimatedRoutes />
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