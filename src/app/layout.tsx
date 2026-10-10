import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegistration } from "@/components/pwa";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Nível Aprovado", template: "%s · Nível Aprovado" },
  description: "Transforme o conteúdo do seu edital numa trilha de estudos com cobertura verificável, aulas, questões e revisões.",
  applicationName: "Nível Aprovado",
  appleWebApp: { capable: true, title: "Nível Aprovado", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#1f4fd8",
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
