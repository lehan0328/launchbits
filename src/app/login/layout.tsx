import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In — Launchbits',
  description: 'Sign in to Launchbits launch governance platform.',
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Login page gets its own minimal layout (no sidebar/topbar)
  return children;
}
