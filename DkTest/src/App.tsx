/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppRouter } from './app/router';
import { ToastProvider } from './components/ui/ToastNotification';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { DebugDiagnostics } from './components/common/DebugDiagnostics';
import OfflineSyncController from './components/student/OfflineSyncController';
import AppUpdateController from './components/student/AppUpdateController';
import NotificationPermissionController from './components/common/NotificationPermissionController';

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <OfflineSyncController />
          <AppUpdateController />
          <NotificationPermissionController />
          <AppRouter />
          <DebugDiagnostics />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
