import type { Metadata } from "next";
import "./globals.css";
import { SidebarProvider } from "@/contexts/SidebarContext";
import TopBar from "@/components/TopBar";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Launchbits — Launch Governance Platform",
  description: "Cross-functional feature launch governance. Connect code changes to mandatory privacy, security, and legal sign-offs before anything ships.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SidebarProvider>
          <TopBar />
          <div className="app-layout">
            <Sidebar />
            <main className="app-main">
              {children}
            </main>
          </div>
        </SidebarProvider>
      </body>
    </html>
  );
}

