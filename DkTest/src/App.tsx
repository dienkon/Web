/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppRouter } from './app/router';
import { ToastProvider } from './components/ui/ToastNotification';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { DebugDiagnostics } from './components/common/DebugDiagnostics';

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <AppRouter />
          <DebugDiagnostics />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
