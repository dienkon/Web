/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppRouter } from './app/router';
import { ToastProvider } from './components/ui/ToastNotification';
import { AuthProvider } from './context/AuthContext';
import { DebugDiagnostics } from './components/common/DebugDiagnostics';

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppRouter />
        <DebugDiagnostics />
      </AuthProvider>
    </ToastProvider>
  );
}
