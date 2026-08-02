import type { Metadata } from "next";
import "./globals.css";
import { SidebarProvider } from "@/contexts/SidebarContext";
import TopBar from "@/components/TopBar";
import Sidebar from "@/components/Sidebar";
import { getCurrentUser } from "@/server/db";

export const metadata: Metadata = {
  title: "Launchbits — Launch Governance Platform",
  description: "Cross-functional feature launch governance. Connect code changes to mandatory privacy, security, and legal sign-offs before anything ships.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Try to get the current user (will be null on /login)
  let user = null;
  try {
    user = await getCurrentUser();
  } catch {
    // Not authenticated — this is expected on /login
  }

  return (
    <html lang="en">
      <body>
        {user ? (
          <SidebarProvider>
            <TopBar user={user} />
            <div className="app-layout">
              <Sidebar user={user} />
              <main className="app-main">
                {children}
              </main>
            </div>
          </SidebarProvider>
        ) : (
          // No shell for unauthenticated pages (login, auth callback)
          children
        )}
      </body>
    </html>
  );
}
