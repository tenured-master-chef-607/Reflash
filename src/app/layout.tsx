'use client';

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { useState, useEffect } from "react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Initialize theme from localStorage on mount
  useEffect(() => {
    // Load theme from localStorage
    const savedSettings = localStorage.getItem('reflashSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setTheme(settings.theme || 'light');
      document.documentElement.classList.toggle('dark-theme', settings.theme === 'dark');
    }

    // Listen for theme changes from other components
    const handleStorageChange = () => {
      const updatedSettings = localStorage.getItem('reflashSettings');
      if (updatedSettings) {
        const settings = JSON.parse(updatedSettings);
        setTheme(settings.theme || 'light');
        document.documentElement.classList.toggle('dark-theme', settings.theme === 'dark');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Create a custom event for theme changes within the same window
    window.addEventListener('themeChange', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('themeChange', handleStorageChange);
    };
  }, []);

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <script src="https://cdn.jsdelivr.net/npm/chart.js" defer></script>
        <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns" defer></script>
        <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js" defer></script>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-100`}
      >
        {children}
      </body>
    </html>
  );
}
