/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import { useRoomStore } from './store/useRoomStore';
import { useThemeStore } from './store/useThemeStore';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './services/firebase';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import RoomCreator from './pages/RoomCreator';
import Lobby from './pages/Lobby';
import MatchArea from './pages/MatchArea';
import JoinRoom from './pages/JoinRoom';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';
import Practice from './pages/Practice';
import Settings from './pages/Settings';
import Help from './pages/Help';
import Terms from './pages/Terms';
import History from './pages/History';
import ToastContainer from './components/ToastContainer';

function AutoReconnect() {
  const { profile } = useAuthStore();
  const { joinRoom, currentRoom } = useRoomStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkActiveRoom = async () => {
      if (!profile?.uid) return;
      
      const savedRoomId = localStorage.getItem('chem_active_room_id');
      if (!savedRoomId) return;

      if (currentRoom?.id === savedRoomId) return;

      try {
        const roomRef = doc(db, 'rooms', savedRoomId);
        const roomSnap = await getDoc(roomRef);

        if (roomSnap.exists()) {
          const roomData = roomSnap.data();
          const isPlayerInRoom = !!roomData.players?.[profile.uid];
          const isRoomActive = roomData.status !== 'matchEnd';

          if (isPlayerInRoom && isRoomActive) {
            await joinRoom(savedRoomId, profile);
            if (roomData.status === 'lobby') {
              if (!location.pathname.startsWith(`/room/${savedRoomId}`)) {
                navigate(`/room/${savedRoomId}`);
              }
            } else {
              if (!location.pathname.startsWith(`/match/${savedRoomId}`)) {
                navigate(`/match/${savedRoomId}`);
              }
            }
          } else {
            localStorage.removeItem('chem_active_room_id');
          }
        } else {
          localStorage.removeItem('chem_active_room_id');
        }
      } catch (err) {
        console.error("Auto reconnect error:", err);
      }
    };

    checkActiveRoom();
  }, [profile?.uid]);

  return null;
}

export default function App() {
  const { init, user, loading } = useAuthStore();
  
  useEffect(() => {
    init();
  }, [init]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
  <BrowserRouter basename="/dau-truong">
    <AutoReconnect />
    <ToastContainer />

    <Routes>
      <Route
        path="/login"
        element={!user ? <Login /> : <Navigate to="/" />}
      />

      <Route
        path="/"
        element={user ? <MainLayout /> : <Navigate to="/login" />}
      >
        <Route index element={<Dashboard />} />
        <Route path="create-room" element={<RoomCreator />} />
        <Route path="room/:roomId" element={<Lobby />} />
        <Route path="match/:roomId" element={<MatchArea />} />
        <Route path="join" element={<JoinRoom />} />
        <Route
          path="matchmaking"
          element={<Navigate to="/join" replace />}
        />
        <Route path="practice" element={<Practice />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="history" element={<History />} />
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<Settings />} />
        <Route path="help" element={<Help />} />
        <Route path="terms" element={<Terms />} />
      </Route>
    </Routes>
  </BrowserRouter>
);
}
