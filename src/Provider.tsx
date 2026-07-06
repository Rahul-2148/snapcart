'use client'

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import React from 'react';

const Provider = ({ children }: { children: React.ReactNode }) => {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light">
        {children}
      </ThemeProvider>
    </SessionProvider>
  )
}

export default Provider;