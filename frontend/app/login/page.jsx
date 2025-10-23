"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { encryptData } from "@/hooks/functions"
import { useToast } from "@/hooks/use-toast"
import { Clipboard, ArrowRight, Eye, EyeOff } from "lucide-react"
import axios from "axios"

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [passwordVisible, setPasswordVisible] = useState(false)

  const handleLogin = (e) => {
    e.preventDefault()
    setLoading(true)

    axios.post(`${process.env.NEXT_PUBLIC_API_URL}/users/auth/login`, {
      username: email,
      password: password,
    })
      .then(async (response) => {
        const user = response?.data?.data;
        const userData = JSON.stringify(user);

        const encryptedData = encryptData(userData);
        localStorage.setItem("clipshare_user", encryptedData)

        toast({
          title: "Connexion réussie",
          description: "Bienvenue sur ClipShare !",
        })

        // Vérifier si on a des clipboards locaux potentiellement synchronisables
        const history = localStorage.getItem("clipboard_history")
        if (history) {
          const clipboards = JSON.parse(history)
          // Si on a au moins un clipboard avec un ID valide, aller sur /sync
          // La page /sync fera la vérification détaillée avec le backend
          const hasValidIds = clipboards.some(clip =>
            clip.id && !clip.id.startsWith("local_") && /^[a-f0-9]{24}$/i.test(clip.id)
          )

          if (hasValidIds) {
            router.push("/sync")
            return
          }
        }

        router.push("/dashboard")

        // Rediriger vers /sync s'il y a potentiellement des clipboards à synchroniser
        // La page /sync fera la vérification complète avec le serveur
        if (hasLocalClipboards) {
          router.push("/sync")
        } else {
          router.push("/dashboard")
        }

        setLoading(false)
      })
      .catch((err) => {
        toast({
          title: <span className="text-red-500">Erreur lors de la connexion</span>,
          description: err.response?.data?.message || "Une erreur est survenue. Veuillez réessayer.",
        })
        setLoading(false)
      })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center">
              <Clipboard className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-balance">ClipShare</h1>
          <p className="text-muted-foreground text-pretty">Partagez votre clipboard instantanément</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Connexion</CardTitle>
            <CardDescription>Connectez-vous pour accéder à vos clipboards</CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="vous@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={passwordVisible ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
                    onClick={() => setPasswordVisible(!passwordVisible)}
                  >
                    {passwordVisible ? <EyeOff /> : <Eye />}
                  </button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 mt-3">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>Connexion en cours...</>
                ) : (
                  <>
                    Se connecter
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Pas encore de compte ?{" "}
                <Link href="/signup" className="text-primary hover:underline">
                  Créer un compte
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
