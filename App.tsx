import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Auth from './views/Auth';
import ScriptStudio from './views/ScriptStudio';
import UserCenter from './views/UserCenter';
import Assets from './views/Assets';
import Projects from './views/Projects';
import AdminLogin from './views/AdminLogin';
import AdminLayout from './views/admin/AdminLayout';
import Dashboard from './views/admin/Dashboard';
import AIModels from './views/admin/AIModels';
import UserManagement from './views/admin/UserManagement';
import { ToastProvider } from './contexts/ToastContext';
import { PreviewProvider } from './components/PreviewProvider';

const App: React.FC = () => {
  return (
    <Router>
      <PreviewProvider>
        <Routes>
          <Route path="/admin/login" element={<AdminLogin />} />
          
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="ai-models" element={<AIModels />} />
            <Route path="users" element={<UserManagement />} />
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
          </Route>

          <Route path="*" element={
            <Layout>
              <Routes>
                <Route path="/" element={<ScriptStudio />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/assets" element={<Assets />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/user-center" element={<UserCenter />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          } />
        </Routes>
      </PreviewProvider>
    </Router>
  );
};

export default App;