import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Auth from './views/Auth';
import ScriptStudio from './views/ScriptStudio';
import UserCenter from './views/UserCenter';
import Assets from './views/Assets';
import { ToastProvider } from './contexts/ToastContext';
import { PreviewProvider } from './components/PreviewProvider';

const App: React.FC = () => {
  return (
    <Router>
      <PreviewProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<ScriptStudio />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/assets" element={<Assets />} />
            <Route path="/user-center" element={<UserCenter />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </PreviewProvider>
    </Router>
  );
};

export default App;