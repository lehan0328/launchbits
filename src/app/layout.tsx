import type { Metadata } from "next";
import "./globals.css";
import { SidebarProvider } from "@/contexts/SidebarContext";
import TopBar from "@/components/TopBar";
import Sidebar from "@/components/Sidebar";
import { getCurrentUser } from "@/server/db";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: "Launchbits — Launch Governance Platform",
  description: "Cross-functional feature launch governance. Connect code changes to mandatory privacy, security, and legal sign-offs before anything ships.",
};

// Paths that should never show the app shell (sidebar/topbar)
const SHELL_EXCLUDED_PATHS = ['/login', '/auth/callback'];

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Detect if this is a shell-excluded path
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || headersList.get('x-invoke-path') || '';
  const isShellExcluded = SHELL_EXCLUDED_PATHS.some(p => pathname.startsWith(p));

  // Try to get the current user (will be null on /login)
  let user = null;
  try {
    user = await getCurrentUser();
  } catch {
    // Not authenticated — this is expected on /login
  }

  const showShell = user && !isShellExcluded;

  return (
    <html lang="en">
      <body>
        {showShell ? (
          <SidebarProvider>
            <TopBar user={user!} />
            <div className="app-layout">
              <Sidebar user={user!} />
              <main className="app-main">
                {children}
              </main>
            </div>
          </SidebarProvider>
        ) : (
          // No shell for unauthenticated pages or shell-excluded paths
          children
        )}
      </body>
    </html>
  );
}
