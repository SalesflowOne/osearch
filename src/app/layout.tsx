export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { Nunito, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import Sidebar from '@/components/Sidebar';
import { Toaster } from 'sonner';
import ThemeProvider from '@/components/theme/Provider';
import configManager from '@/lib/config';
import SetupWizard from '@/components/Setup/SetupWizard';
import { ChatProvider } from '@/lib/hooks/useChat';
import { OwebAuthProvider } from '@/lib/oweb/AuthProvider';
import WorkspaceBar from '@/components/Oweb/WorkspaceBar';
import { isOwebModeEnabled } from '@/lib/oweb/config';

const nunito = Nunito({
  weight: ['700', '800'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
});

const plusJakarta = Plus_Jakarta_Sans({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'OSearch — Cited answers from the open web',
  description:
    'OWeb’s search app. Research the web with citations, sources, and smart widgets — same identity and OneCredits as OWeb.',
  icons: {
    icon: '/osearch-mark.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const owebMode = isOwebModeEnabled();
  // In constellation mode, skip the self-host setup wizard.
  const setupComplete = owebMode || configManager.isSetupComplete();
  const configSections = configManager.getUIConfigSections();

  return (
    <html
      className={cn('h-full', nunito.variable, plusJakarta.variable)}
      lang="en"
      suppressHydrationWarning
    >
      <body className={cn('h-full antialiased font-sans', plusJakarta.className)}>
        <ThemeProvider>
          <OwebAuthProvider>
            {setupComplete ? (
              <ChatProvider>
                <WorkspaceBar />
                <Sidebar>{children}</Sidebar>
                <Toaster
                  toastOptions={{
                    unstyled: true,
                    classNames: {
                      toast:
                        'bg-light-secondary dark:bg-dark-secondary dark:text-white/70 text-black-70 rounded-lg p-4 flex flex-row items-center space-x-2',
                    },
                  }}
                />
              </ChatProvider>
            ) : (
              <SetupWizard configSections={configSections} />
            )}
          </OwebAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
