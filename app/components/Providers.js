'use client';

import { SessionProvider } from 'next-auth/react';
import ThemeProvider from './ThemeProvider';
import ToastProvider from './ToastProvider';

export default function Providers({ children }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
