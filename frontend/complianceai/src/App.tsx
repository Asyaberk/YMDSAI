import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import FileUpload from './pages/FileUpload';
import ComplianceAnalysis from './pages/ComplianceAnalysis';
import RAGExperiments from './pages/RAGExperiments';
import KnowledgePortal from './pages/KnowledgePortal';
import Reports from './pages/Reports';
import Archive from './pages/Archive';
import Landing from './pages/Landing';
import AdminDashboard from './pages/AdminDashboard';

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Yükleniyor...</div>;
  if (!user) return <Navigate to="/welcome" replace />;
  if (adminOnly && user.role !== 'ADMIN') return <Navigate to="/" replace />;
  
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/welcome" element={<Landing />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="upload" element={<FileUpload />} />
            <Route path="analysis" element={<ComplianceAnalysis />} />
            <Route path="archive" element={<Archive />} />
            <Route path="experiments" element={<RAGExperiments />} />
            <Route path="portal" element={<KnowledgePortal />} />
            <Route path="reports" element={<Reports />} />
            <Route path="admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
