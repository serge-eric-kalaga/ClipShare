"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Clipboard, Lock, Eye, AlertCircle, Users, Download, FileText, File as FileIcon, Image as ImageIcon, Clock, Shield, LogIn, Copy, Check, ChevronDown } from "lucide-react"
import { encryptData, decryptData } from "@/hooks/functions"
import { useToast } from "@/hooks/use-toast"
import ReactMarkdown from "react-markdown"
import axios from "axios"

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
  const router = useRouter()
  const { toast } = useToast()

  const [user, setUser] = useState(null)
  const [clipboardText, setClipboardText] = useState("")
  const [loading, setLoading] = useState(true)
  const [clipboard, setClipboard] = useState(null)
  const [isLocked, setIsLocked] = useState(false)
  const [passwordInput, setPasswordInput] = useState("")
  const [passwordError, setPasswordError] = useState(false)
  const [isExpired, setIsExpired] = useState(false)
  const [currentViewer, setCurrentViewer] = useState(null)
  const [activeViewers, setActiveViewers] = useState([])
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [markdownMode, setMarkdownMode] = useState(false)
  const [copied, setCopied] = useState(false)
  const [notFound, setNotFound] = useState(false)

  // Charger l'utilisateur depuis localStorage
  useEffect(() => {
    const userData = localStorage.getItem("clipshare_user")
    if (userData) {
      try {
        const decryptedData = decryptData(userData)
        if (decryptedData) {
          setUser(JSON.parse(decryptedData))
        }
      } catch (error) {
        console.error('Erreur chargement utilisateur:', error)
      }
    }
  }, [])

  // Charger l'utilisateur depuis localStorage
  useEffect(() => {
    const userData = localStorage.getItem("clipshare_user")
    if (userData) {
      try {
        const decryptedData = decryptData(userData)
        if (decryptedData) {
          setUser(JSON.parse(decryptedData))
        }
      } catch (error) {
        console.error('Erreur chargement utilisateur:', error)
      }
    }
  }, [])

  // Charger le clipboard depuis l'API backend
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

    const loadClipboard = async () => {
      try {
        // Tenter de charger depuis l'API backend
        const endpoint = user
          ? `${process.env.NEXT_PUBLIC_API_URL}/clipboards/${params.id}`
          : `${process.env.NEXT_PUBLIC_API_URL}/clipboards/share/${params.id}`

        const headers = user
          ? { Authorization: `Bearer ${user.access_token}` }
          : {}

        try {
          const response = await axios.get(endpoint, { headers })

          const clipboardData = response.data?.data || response.data

          // Vérifier l'expiration
          if (clipboardData.expireAt && new Date(clipboardData.expireAt) < new Date()) {
            setIsExpired(true)
            setLoading(false)
            return
          }

          // Vérifier le mot de passe
          if (clipboardData.password) {
            // Mapper même quand protégé par mot de passe
            setClipboard({
              id: clipboardData._id,
              title: clipboardData.title,
              text: clipboardData.content,
              content: clipboardData.content, // Garder les deux pour compatibilité
              password: clipboardData.password,
              readOnly: clipboardData.readOnly,
              files: clipboardData.files || [],
              expiresAt: clipboardData.expireAt,
              createdAt: clipboardData.createdAt,
              updatedAt: clipboardData.updatedAt,
              views: clipboardData.visits || 0,
            })
            setIsLocked(true)
            setLoading(false)
            return
          }

          // Mapper les données backend vers le format frontend
          setClipboard({
            id: clipboardData._id,
            title: clipboardData.title,
            text: clipboardData.content,
            password: clipboardData.password,
            readOnly: clipboardData.readOnly,
            files: clipboardData.files || [],
            expiresAt: clipboardData.expireAt,
            createdAt: clipboardData.createdAt,
            updatedAt: clipboardData.updatedAt,
            views: clipboardData.visits || 0,
          })

          setClipboardText(clipboardData.content || "")
          setUploadedFiles(clipboardData.files || [])
          setLoading(false)
          return
        } catch (apiError) {
          // Si l'API échoue, essayer localStorage
        }
        const loadFromLocalStorage = () => {
          const history = localStorage.getItem("clipboard_history")
          if (history) {
            const historyArray = JSON.parse(history)
            const foundClipboard = historyArray.find((item) => item.id === params.id)
            if (foundClipboard) {
              setClipboard(foundClipboard)

              if (foundClipboard.expiresAt && new Date(foundClipboard.expiresAt) < new Date()) {
                setIsExpired(true)
                setLoading(false)
                return true
              }

              if (foundClipboard.password) {
                setIsLocked(true)
                setLoading(false)
                return true
              }

              setClipboardText(foundClipboard.text || "")
              setUploadedFiles(foundClipboard.files || [])
              setLoading(false)
              return true
            }
          }

          const savedClipboard = localStorage.getItem("current_clipboard")
          if (savedClipboard) {
            const foundClipboard = JSON.parse(savedClipboard)
            if (foundClipboard.id === params.id) {
              setClipboard(foundClipboard)

              if (foundClipboard.expiresAt && new Date(foundClipboard.expiresAt) < new Date()) {
                setIsExpired(true)
                setLoading(false)
                return true
              }

              if (foundClipboard.password) {
                setIsLocked(true)
                setLoading(false)
                return true
              }

              setClipboardText(foundClipboard.text || "")
              setUploadedFiles(foundClipboard.files || [])
              setLoading(false)
              return true
            }
          }
          return false
        }

        const found = loadFromLocalStorage()
        if (!found) {
          setNotFound(true)
        }
        setLoading(false)

      } catch (error) {
        console.error("Erreur chargement clipboard:", error)

        // En cas d'erreur API, essayer localStorage
        const history = localStorage.getItem("clipboard_history")
        if (history) {
          const historyArray = JSON.parse(history)
          const foundClipboard = historyArray.find((item) => item.id === params.id)
          if (foundClipboard) {
            setClipboard(foundClipboard)
            setClipboardText(foundClipboard.text || "")
            setUploadedFiles(foundClipboard.files || [])
            setLoading(false)
            return
          }
        }

        setNotFound(true)
        setLoading(false)
      }
    }

    loadClipboard()
  }, [params.id, user])

  const handlePasswordSubmit = (e) => {
    e.preventDefault()
    if (clipboard && passwordInput === clipboard.password) {
      setIsLocked(false)
      setPasswordError(false)
      // Utiliser clipboard.text (frontend) ou clipboard.content (backend)
      setClipboardText(clipboard.text || clipboard.content || "")
      setUploadedFiles(clipboard.files || [])
    } else {
      setPasswordError(true)
    }
  }

  const handleTextChange = (e) => {
    if (clipboard?.readOnly) return

    const newText = e.target.value
    setClipboardText(newText)

    // Mettre à jour localStorage uniquement (pas d'auto-save API pour les visiteurs)
    const history = localStorage.getItem("clipboard_history")
    if (history) {
      const historyArray = JSON.parse(history)
      const clipboardIndex = historyArray.findIndex((item) => item.id === params.id)

      if (clipboardIndex !== -1) {
        historyArray[clipboardIndex].text = newText
        historyArray[clipboardIndex].updatedAt = new Date().toISOString()
        localStorage.setItem("clipboard_history", JSON.stringify(historyArray))
      }
    }

    const savedClipboard = localStorage.getItem("current_clipboard")
    if (savedClipboard) {
      const clipboardData = JSON.parse(savedClipboard)
      if (clipboardData.id === params.id) {
        clipboardData.text = newText
        clipboardData.updatedAt = new Date().toISOString()
        localStorage.setItem("current_clipboard", JSON.stringify(clipboardData))
      }
    }
  }

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      toast({
        title: "URL copiée !",
        description: "L'URL a été copiée dans le presse-papiers",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast({
        title: "Erreur",
        description: "Impossible de copier l'URL",
        variant: "destructive",
      })
    }
  }

  const handleCopyContent = async () => {
    try {
      await navigator.clipboard.writeText(clipboardText)
      toast({
        title: "Contenu copié !",
        description: "Le contenu a été copié dans le presse-papiers",
      })
    } catch (err) {
      toast({
        title: "Erreur",
        description: "Impossible de copier le contenu",
        variant: "destructive",
      })
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  const formatDate = (dateString) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    return date.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center mx-auto animate-pulse">
            <Clipboard className="h-8 w-8 text-primary-foreground" />
          </div>
          <p className="text-muted-foreground">Chargement du clipboard...</p>
        </div>
      </div>
    )
  }

  if (notFound) {
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
                    <CardTitle>Clipboard introuvable</CardTitle>
                    <CardDescription>Ce clipboard n'existe pas ou a été supprimé</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Le clipboard que vous recherchez n'existe pas ou n'est plus accessible.
                </p>
                {!user && (
                  <Alert>
                    <LogIn className="h-4 w-4" />
                    <AlertDescription>
                      Connectez-vous si ce clipboard nécessite une authentification.
                    </AlertDescription>
                  </Alert>
                )}
                <div className="flex gap-2">
                  <Button onClick={() => router.push("/dashboard")} className="flex-1">
                    Aller au dashboard
                  </Button>
                  {!user && (
                    <Button onClick={() => router.push("/login")} variant="outline" className="flex-1">
                      Se connecter
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
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
                  <Clock className="h-8 w-8 text-destructive" />
                  <div>
                    <CardTitle>Clipboard expiré</CardTitle>
                    <CardDescription>Ce clipboard n'est plus accessible</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Ce clipboard a atteint sa date d'expiration et n'est plus disponible.
                </p>
                {clipboard?.expiresAt && (
                  <p className="text-xs text-muted-foreground">
                    Expiré le : {formatDate(clipboard.expiresAt)}
                  </p>
                )}
                <Button onClick={() => router.push("/dashboard")} className="w-full mt-4">
                  Retour au dashboard
                </Button>
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
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="h-8 w-8 md:h-10 md:w-10 rounded-xl bg-primary flex items-center justify-center">
                <Clipboard className="h-4 w-4 md:h-5 md:w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold">ClipShare</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  {clipboard?.title || "Clipboard partagé"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {clipboard?.readOnly && (
                <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-xs">
                  <Eye className="h-3 w-3" />
                  <span>Lecture seule</span>
                </div>
              )}
              {clipboard?.password && (
                <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-xs">
                  <Lock className="h-3 w-3" />
                  <span>Protégé</span>
                </div>
              )}
              {currentViewer && (
                <div className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 rounded-full bg-muted">
                  <div
                    className="h-5 w-5 md:h-6 md:w-6 rounded-full flex items-center justify-center text-[10px] md:text-xs font-semibold"
                    style={{
                      backgroundColor: currentViewer.color,
                      color: "#fff",
                    }}
                  >
                    {currentViewer.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-[10px] md:text-xs font-medium hidden sm:inline">{currentViewer.name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 md:py-8">
        <div className="max-w-5xl mx-auto space-y-4">
          {/* Informations clipboard */}
          {!user && (
            <Alert className="bg-card">
              <LogIn className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span className="text-sm">
                  Connectez-vous pour enregistrer vos modifications en ligne
                </span>
                <Button size="sm" variant="outline" onClick={() => router.push("/login")}>
                  Se connecter
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Contenu principal */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <CardTitle className="text-lg md:text-xl">{clipboard?.title || "Sans titre"}</CardTitle>
                  <CardDescription className="text-sm">
                    {clipboard?.readOnly
                      ? "Ce clipboard est en lecture seule"
                      : "Vous pouvez voir et modifier ce contenu"}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopyUrl} className="bg-transparent">
                    {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                    <span className="hidden sm:inline">{copied ? "Copié !" : "Copier URL"}</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleCopyContent} className="bg-transparent">
                    <Copy className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Copier contenu</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="text" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="text" className="text-xs sm:text-sm">
                    <FileText className="h-4 w-4 mr-1 sm:mr-2" />
                    Texte
                  </TabsTrigger>
                  <TabsTrigger value="files" className="text-xs sm:text-sm">
                    <FileIcon className="h-4 w-4 mr-1 sm:mr-2" />
                    Fichiers ({uploadedFiles.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="text" className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <Label className="text-sm text-muted-foreground">Mode d'affichage</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={!markdownMode ? "default" : "outline"}
                        size="sm"
                        onClick={() => setMarkdownMode(false)}
                        className="flex-1 sm:flex-none text-xs sm:text-sm"
                      >
                        Texte brut
                      </Button>
                      <Button
                        variant={markdownMode ? "default" : "outline"}
                        size="sm"
                        onClick={() => setMarkdownMode(true)}
                        className="flex-1 sm:flex-none text-xs sm:text-sm"
                      >
                        Markdown
                      </Button>
                    </div>
                  </div>

                  {markdownMode ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-2 block">Éditeur</Label>
                        <Textarea
                          placeholder="# Titre&#10;&#10;**Gras** *Italique*"
                          value={clipboardText}
                          onChange={handleTextChange}
                          disabled={clipboard?.readOnly}
                          className="min-h-[300px] md:min-h-[500px] font-mono text-sm resize-none"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-2 block">Aperçu</Label>
                        <div className="min-h-[300px] md:min-h-[500px] p-4 border rounded-lg bg-muted/30 prose prose-sm dark:prose-invert max-w-none overflow-auto">
                          <ReactMarkdown>{clipboardText || "*Aucun contenu*"}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Textarea
                      placeholder={clipboard?.readOnly ? "Ce clipboard est vide..." : "Commencez à taper..."}
                      value={clipboardText}
                      onChange={handleTextChange}
                      disabled={clipboard?.readOnly}
                      className="min-h-[300px] md:min-h-[500px] font-mono text-sm resize-none"
                    />
                  )}
                </TabsContent>

                <TabsContent value="files" className="space-y-4">
                  {uploadedFiles.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm">Aucun fichier attaché</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label className="text-sm">Fichiers attachés ({uploadedFiles.length})</Label>
                      <div className="space-y-2">
                        {uploadedFiles.map((file, index) => {
                          const isFileObject = typeof file === "object" && file !== null
                          const fileName = isFileObject ? file.name : file.split("/").pop()
                          const fileType = isFileObject ? file.type : ""
                          const fileSize = isFileObject ? file.size : 0
                          const isImage = isFileObject
                            ? fileType.startsWith("image/")
                            : /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName)

                          const fileUrl = isFileObject
                            ? file.data
                            : `${process.env.NEXT_PUBLIC_API_URL}${file}`

                          return (
                            <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                {isImage ? (
                                  <ImageIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                                ) : (
                                  <FileIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{fileName}</p>
                                  {fileSize > 0 && (
                                    <p className="text-xs text-muted-foreground">{formatFileSize(fileSize)}</p>
                                  )}
                                </div>
                              </div>
                              <a
                                href={fileUrl}
                                download={fileName}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Button variant="ghost" size="sm">
                                  <Download className="h-4 w-4" />
                                </Button>
                              </a>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              {/* Métadonnées */}
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-4 border-t text-xs text-muted-foreground">
                <div className="flex flex-wrap items-center gap-3">
                  <span>{clipboardText.length} caractères</span>
                  <span>•</span>
                  <span>{uploadedFiles.length} fichier(s)</span>
                  {clipboard?.views !== undefined && (
                    <>
                      <span>•</span>
                      <span>{clipboard.views} vue(s)</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  {clipboard?.createdAt && (
                    <span className="text-xs">Créé le {formatDate(clipboard.createdAt)}</span>
                  )}
                  {clipboard?.readOnly && (
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      Lecture seule
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informations de sécurité */}
          {(clipboard?.password || clipboard?.expiresAt) && (
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Informations de sécurité
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                {clipboard?.password && (
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    <span>Ce clipboard est protégé par mot de passe</span>
                  </div>
                )}
                {clipboard?.expiresAt && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>Expire le {formatDate(clipboard.expiresAt)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
