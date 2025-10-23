"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Clipboard, ArrowRight, Eye, EyeOff } from "lucide-react"
import axios from "axios"

export default function SignupPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [passwordVisible, setPasswordVisible] = useState(false)

  const handleSignup = (e) => {
    e.preventDefault()
    setLoading(true)

    // Simulate signup
    setTimeout(() => {
      const user = {
        username: email,
        nom_prenom: name,
        password: password,
      }

      const registerUserURL = `${process.env.NEXT_PUBLIC_API_URL}/users/auth/register`;

      axios.post(registerUserURL, user)
        .then((response) => {

          const { dismiss } = toast({
            title: "Compte créé avec succès",
            description: "Bienvenue sur ClipShare !",
            action: <Link href="#" onClick={(e) => {
              e.preventDefault()
              dismiss()
              setTimeout(() => router.push("/login"), 100)
            }} className="font-medium text-blue-500">Se connecter</Link>,
          })

        })
        .catch((err) => {
          console.log(err);

          toast({
            title: "Erreur lors de la création du compte",
            description: err.response?.data?.message || "Une erreur est survenue. Veuillez réessayer.",
          })
          setLoading(false)
        })

      // router.push("/login")
      setLoading(false)
    }, 1000)
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
            <CardTitle>Créer un compte</CardTitle>
            <CardDescription>Commencez à partager vos clipboards en quelques secondes</CardDescription>
          </CardHeader>
          <form onSubmit={handleSignup}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom et prénom</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Votre nom complet"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
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
                  <>Création en cours...</>
                ) : (
                  <>
                    Créer mon compte
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Déjà un compte ?{" "}
                <Link href="/login" className="text-primary hover:underline">
                  Se connecter
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
