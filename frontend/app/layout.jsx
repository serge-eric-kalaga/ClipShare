import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata = {
  title: "ClipShare - Partage de Clipboard et de fichiers en temps réel",
  description: "ClipShare est une application conçue pour vous aider à sauvegarder, organiser et partager des éléments que vous copiez : notes, extraits de texte, images ou documents. L'idée est simple : centraliser ce qui compte pour vous, et le rendre accessible quand vous en avez besoin",
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
