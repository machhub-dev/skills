// filepath: src/app/layout.tsx
import type { Metadata } from 'next';
import { SDKProvider } from '@/contexts/SDKContext';
import './globals.css';

export const metadata: Metadata = {
    title: 'MACHHUB App',
    description: 'Built with MACHHUB SDK',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>
                <SDKProvider>
                    {children}
                </SDKProvider>
            </body>
        </html>
    );
}
