import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import FileUpload from './pages/FileUpload';
import ComplianceAnalysis from './pages/ComplianceAnalysis';
import RAGExperiments from './pages/RAGExperiments';
import KnowledgePortal from './pages/KnowledgePortal';
import Reports from './pages/Reports';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="upload" element={<FileUpload />} />
          <Route path="analysis" element={<ComplianceAnalysis />} />
          <Route path="experiments" element={<RAGExperiments />} />
          <Route path="portal" element={<KnowledgePortal />} />
          <Route path="reports" element={<Reports />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
