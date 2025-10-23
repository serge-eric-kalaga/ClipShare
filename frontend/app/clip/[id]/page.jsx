"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Clipboard, Lock, Eye, AlertCircle, Users } from "lucide-react"
import { encryptData, decryptData } from "@/hooks/functions"

const generateRandomColor = () => {
  const colors = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#6366f1", "#f97316"]
  return colors[Math.floor(Math.random() * colors.length)]
}

const generateViewerName = () => {
  const adjectives = ["Rapide", "Brillant", "Créatif", "Sage", "Joyeux", "Calme"]
  const nouns = ["Panda", "Renard", "Aigle", "Dauphin", "Tigre", "Loup"]
  return `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`
}

export default function ClipboardViewPage() {
  const params = useParams()
  const [clipboardText, setClipboardText] = useState("")
  const [loading, setLoading] = useState(true)
  const [clipboard, setClipboard] = useState(null)
  const [isLocked, setIsLocked] = useState(false)
  const [passwordInput, setPasswordInput] = useState("")
  const [passwordError, setPasswordError] = useState(false)
  const [isExpired, setIsExpired] = useState(false)
  const [currentViewer, setCurrentViewer] = useState(null)
  const [activeViewers, setActiveViewers] = useState([])

  useEffect(() => {
    const viewerName = generateViewerName()
    const viewerColor = generateRandomColor()
    const viewerId = Math.random().toString(36).substr(2, 9)

    setCurrentViewer({
      id: viewerId,
      name: viewerName,
      color: viewerColor,
      joinedAt: new Date().toISOString(),
    })

    const loadClipboard = () => {
      const history = decryptData(localStorage.getItem("clipboard_history"))
      if (history) {
        const historyArray = JSON.parse(history)
        const foundClipboard = historyArray.find((item) => item.id === params.id)
        if (foundClipboard) {
          setClipboard(foundClipboard)

          if (foundClipboard.expiresAt && new Date(foundClipboard.expiresAt) < new Date()) {
            setIsExpired(true)
            setLoading(false)
            return
          }

          if (foundClipboard.password) {
            setIsLocked(true)
            setLoading(false)
            return
          }

          foundClipboard.views = (foundClipboard.views || 0) + 1
          foundClipboard.lastViewed = new Date().toISOString()

          if (!foundClipboard.activeViewers) {
            foundClipboard.activeViewers = []
          }
          foundClipboard.activeViewers.push({
            id: viewerId,
            name: viewerName,
            color: viewerColor,
            joinedAt: new Date().toISOString(),
          })

          if (foundClipboard.activeViewers.length > 5) {
            foundClipboard.activeViewers = foundClipboard.activeViewers.slice(-5)
          }

          const clipboardIndex = historyArray.findIndex((item) => item.id === params.id)
          historyArray[clipboardIndex] = foundClipboard
          localStorage.setItem("clipboard_history", encryptData(JSON.stringify(historyArray)))

          setClipboardText(foundClipboard.text || "")
          setActiveViewers(foundClipboard.activeViewers || [])
          setLoading(false)
          return
        }
      }

      const savedClipboard = decryptData(localStorage.getItem("current_clipboard"))
      if (savedClipboard) {
        const foundClipboard = JSON.parse(savedClipboard)
        if (foundClipboard.id === params.id) {
          setClipboard(foundClipboard)

          if (foundClipboard.expiresAt && new Date(foundClipboard.expiresAt) < new Date()) {
            setIsExpired(true)
            setLoading(false)
            return
          }

          if (foundClipboard.password) {
            setIsLocked(true)
            setLoading(false)
            return
          }

          foundClipboard.views = (foundClipboard.views || 0) + 1
          foundClipboard.lastViewed = new Date().toISOString()

          if (!foundClipboard.activeViewers) {
            foundClipboard.activeViewers = []
          }
          foundClipboard.activeViewers.push({
            id: viewerId,
            name: viewerName,
            color: viewerColor,
            joinedAt: new Date().toISOString(),
          })

          if (foundClipboard.activeViewers.length > 5) {
            foundClipboard.activeViewers = foundClipboard.activeViewers.slice(-5)
          }

          localStorage.setItem("current_clipboard", encryptData(JSON.stringify(foundClipboard)))

          setClipboardText(foundClipboard.text || "")
          setActiveViewers(foundClipboard.activeViewers || [])
        }
      }
      setLoading(false)
    }

    loadClipboard()

    const interval = setInterval(() => {
      const history = decryptData(localStorage.getItem("clipboard_history"))
      if (history) {
        const historyArray = JSON.parse(history)
        const foundClipboard = historyArray.find((item) => item.id === params.id)
        if (foundClipboard && !isLocked && !isExpired) {
          setClipboardText(foundClipboard.text || "")
          setClipboard(foundClipboard)
          setActiveViewers(foundClipboard.activeViewers || [])
          return
        }
      }

      const savedClipboard = decryptData(localStorage.getItem("current_clipboard"))
      if (savedClipboard) {
        const foundClipboard = JSON.parse(savedClipboard)
        if (foundClipboard.id === params.id && !isLocked && !isExpired) {
          setClipboardText(foundClipboard.text || "")
          setClipboard(foundClipboard)
          setActiveViewers(foundClipboard.activeViewers || [])
        }
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [params.id, isLocked, isExpired])

  const handlePasswordSubmit = (e) => {
    e.preventDefault()
    if (clipboard && passwordInput === clipboard.password) {
      setIsLocked(false)
      setPasswordError(false)
      setClipboardText(clipboard.text || "")
    } else {
      setPasswordError(true)
    }
  }

  const handleTextChange = (e) => {
    if (clipboard?.readOnly) return

    const newText = e.target.value
    setClipboardText(newText)

    const history = decryptData(localStorage.getItem("clipboard_history"))
    if (history) {
      const historyArray = JSON.parse(history)
      const clipboardIndex = historyArray.findIndex((item) => item.id === params.id)

      if (clipboardIndex !== -1) {
        historyArray[clipboardIndex].text = newText
        historyArray[clipboardIndex].updatedAt = new Date().toISOString()
        localStorage.setItem("clipboard_history", encryptData(JSON.stringify(historyArray)))
      }
    }

    const savedClipboard = decryptData(localStorage.getItem("current_clipboard"))
    if (savedClipboard) {
      const clipboardData = JSON.parse(savedClipboard)
      if (clipboardData.id === params.id) {
        clipboardData.text = newText
        clipboardData.updatedAt = new Date().toISOString()
        localStorage.setItem("current_clipboard", encryptData(JSON.stringify(clipboardData)))
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center mx-auto">
            <Clipboard className="h-8 w-8 text-primary-foreground" />
          </div>
          <p className="text-muted-foreground">Chargement du clipboard...</p>
        </div>
      </div>
    )
  }

  if (isExpired) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
              <Clipboard className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">ClipShare</h1>
              <p className="text-xs text-muted-foreground">Clipboard partagé</p>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <Card className="border-destructive">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                  <div>
                    <CardTitle>Clipboard expiré</CardTitle>
                    <CardDescription>Ce clipboard n'est plus accessible</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Ce clipboard a atteint sa date d'expiration et n'est plus disponible.
                </p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  if (isLocked) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
              <Clipboard className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">ClipShare</h1>
              <p className="text-xs text-muted-foreground">Clipboard partagé</p>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Lock className="h-8 w-8 text-primary" />
                  <div>
                    <CardTitle>Clipboard protégé</CardTitle>
                    <CardDescription>Entrez le mot de passe pour accéder</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Mot de passe</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Entrez le mot de passe..."
                      value={passwordInput}
                      onChange={(e) => {
                        setPasswordInput(e.target.value)
                        setPasswordError(false)
                      }}
                      className={passwordError ? "border-destructive" : ""}
                    />
                    {passwordError && <p className="text-sm text-destructive">Mot de passe incorrect</p>}
                  </div>
                  <Button type="submit" className="w-full">
                    Déverrouiller
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
                <Clipboard className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">ClipShare</h1>
                <p className="text-xs text-muted-foreground">{clipboard?.title || "Clipboard partagé"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{activeViewers.length}</span>
              <div className="flex items-center -space-x-2">
                {activeViewers.slice(-3).map((viewer, index) => (
                  <div
                    key={viewer.id}
                    className="h-8 w-8 rounded-full border-2 border-background flex items-center justify-center text-xs font-semibold"
                    style={{
                      backgroundColor: viewer.color,
                      color: "#fff",
                      zIndex: activeViewers.length - index,
                    }}
                    title={viewer.name}
                  >
                    {viewer.name.charAt(0).toUpperCase()}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Clipboard Partagé</CardTitle>
                  <CardDescription>
                    {clipboard?.readOnly
                      ? "Ce clipboard est en lecture seule"
                      : "Vous pouvez voir et modifier ce clipboard en temps réel"}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {clipboard?.readOnly && <Eye className="h-5 w-5 text-muted-foreground" />}
                  {currentViewer && (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted">
                      <div
                        className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold"
                        style={{
                          backgroundColor: currentViewer.color,
                          color: "#fff",
                        }}
                      >
                        {currentViewer.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs font-medium">{currentViewer.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Le clipboard est vide..."
                value={clipboardText}
                onChange={handleTextChange}
                disabled={clipboard?.readOnly}
                className="min-h-[500px] font-mono text-sm resize-none"
              />
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm text-muted-foreground">
                <span>{clipboardText.length} caractères</span>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                    Synchronisation en temps réel
                  </span>
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {activeViewers.length} viewer(s) actif(s)
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
