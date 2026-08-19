import { Cairo } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-cairo",
});

export const metadata = {
  title: "جدول مدرسي - حجز وإدارة الجداول الزمنية",
  description: "نظام إلكتروني لحجز وإدارة الجداول الزمنية المدرسية في الجزائر",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable} suppressHydrationWarning>
      <body className={`${cairo.className} min-h-screen`} style={{ backgroundColor: "#F5F6F0" }} suppressHydrationWarning>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
