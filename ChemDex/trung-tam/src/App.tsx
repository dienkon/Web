import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import TaiLieuSoPage from './pages/TaiLieuSoPage';
import CongDongPage from './pages/CongDongPage';

function App() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/tai-lieu-so" replace />} />
      <Route path="/tai-lieu-so/*" element={<TaiLieuSoPage />} />
      <Route path="/cong-dong/*" element={<CongDongPage />} />
    </Routes>
  );
}

export default App;
