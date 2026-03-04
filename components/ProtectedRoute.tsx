import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getAuthToken } from '../services/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * 路由守卫组件 - 保护需要登录才能访问的路由
 * 如果用户未登录，自动重定向到登录页面
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const location = useLocation();
  const token = getAuthToken();

  if (!token) {
    // 保存当前路径，登录后可以返回
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
