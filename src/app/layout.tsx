import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegistration } from "@/components/pwa";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "APROVUM", template: "%s · APROVUM" },
  description: "Transforme o conteúdo do seu edital numa trilha de estudos com cobertura verificável, aulas, questões e revisões.",
  applicationName: "APROVUM",
  appleWebApp: { capable: true, title: "APROVUM", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: "/icons/favicon-64.png", type: "image/png", sizes: "64x64" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh antialiased">
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
