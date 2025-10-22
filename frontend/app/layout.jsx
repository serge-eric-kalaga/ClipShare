import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata = {
  title: "ClipShare - Partage de Clipboard en Temps Réel",
  description: "Partagez votre clipboard instantanément avec un QR code",
  generator: "v0.app",
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body className="font-sans antialiased">
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
