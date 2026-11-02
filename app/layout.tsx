import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = { title: 'FC 27 Tracker', description: 'Tracker e auxiliar do Modo Carreira do EA FC 27' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Tektur:wght@400;500;600;700;800&family=Ubuntu+Sans:wght@300;400;500;600;700&display=swap" />
      </head>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
