import { Inter } from 'next/font/google';
import './globals.css';
import Providers from './components/Providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata = {
  title: 'CR Matcher',
  description: 'Organize code reviews with your team',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark" className={inter.variable}>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
