import type {Metadata} from 'next';
import { Inter } from 'next/font/google'; // Import Inter font
import './globals.css';
import { Toaster } from "@/components/ui/toaster" // Import Toaster

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' }); // Configure Inter font

export const metadata: Metadata = {
  title: 'TextQuest Adventures', // Updated App Name
  description: 'An immersive text-based fantasy RPG powered by AI.', // Updated Description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark"> {/* Apply dark theme by default */}
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
        {children}
        <Toaster /> {/* Add Toaster for potential future notifications */}
      </body>
    </html>
  );
}
