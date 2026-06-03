import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import AppLayout from './components/common/AppLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CaseList from './pages/teacher/CaseList';
import CaseCreate from './pages/teacher/CaseCreate';
import CaseDetail from './pages/teacher/CaseDetail';
import TrialSetup from './pages/teacher/TrialSetup';
import TrialList from './pages/teacher/TrialList';
import TrialMonitor from './pages/teacher/TrialMonitor';
import TrialRoom from './pages/student/TrialRoom';
import TrialJudge from './pages/judge/TrialJudge';
import ReportView from './pages/reports/ReportView';

export default function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="cases" element={<CaseList />} />
              <Route path="cases/create" element={<CaseCreate />} />
              <Route path="cases/:id" element={<CaseDetail />} />
              <Route path="trials" element={<TrialList />} />
              <Route path="trials/create" element={<TrialSetup />} />
              <Route path="trials/:id" element={<TrialMonitor />} />
              <Route path="trials/:id/room" element={<TrialRoom />} />
              <Route path="trials/:id/judge" element={<TrialJudge />} />
              <Route path="trials/:id/report" element={<ReportView />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ConfigProvider>
  );
}
