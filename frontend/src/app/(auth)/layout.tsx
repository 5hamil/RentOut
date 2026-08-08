import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../globals.css';
import { BackButton } from './_components/BackButton';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'RentOut — Account',
  description: 'Sign up or log in to RentOut, the peer-to-peer electronics rental marketplace.',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F7F8FA] relative">
      <BackButton />
      {children}
    </div>
  );
}
