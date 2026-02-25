import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { ToastProvider, ToastContainer } from "@/components/toast";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "A2B Manager",
  description: "Estate liquidation appraisal co-pilot",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider appearance={{ baseTheme: dark }}>
      <html lang="en">
        <body className={`${plusJakartaSans.variable} font-sans antialiased`}>
          <ToastProvider>
            {children}
            <ToastContainer />
          </ToastProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
