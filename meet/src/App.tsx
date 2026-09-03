import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { JoinPage } from './pages/JoinPage';
import { MeetingPage } from './pages/MeetingPage';
import { ClassroomPage } from './pages/ClassroomPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/join/:code" element={<JoinPage />} />
        <Route path="/room/:code" element={<JoinPage />} />
        <Route path="/meeting/:code" element={<MeetingPage />} />
        <Route path="/classroom" element={<ClassroomPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
