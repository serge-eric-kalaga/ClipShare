"use client"

import '@/styles/editor.css'
import { useEffect, useState, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Clipboard, Lock, Eye, AlertCircle, Users, Download, FileText, File as FileIcon, Image as ImageIcon, Clock, Shield, LogIn, Copy, Check, ChevronDown, Upload, Trash2, X } from "lucide-react"
import { encryptData, decryptData } from "@/hooks/functions"
import { useToast } from "@/hooks/use-toast"
import ReactMarkdown from "react-markdown"
import RichTextEditor from "@/components/rich-text-editor"
import axios from "axios"
import { io as socketIoClient } from "socket.io-client"

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
  const [editorMode, setEditorMode] = useState("rich") // "rich", "markdown", "plain"
  const [copied, setCopied] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [isSynch, setIsSynch] = useState(true)
  const [socketConnected, setSocketConnected] = useState(false)
  const [totalViews, setTotalViews] = useState(0)

  // Ref pour le timer de debounce (auto-save après 2 secondes)
  const saveTimerRef = useRef(null)
  // Socket.io client ref
  const socketRef = useRef(null)
  // Ref pour suivre si l'utilisateur est en train de taper
  const isTypingRef = useRef(false)

  // Fonction de sauvegarde avec debounce
  const debouncedSave = useCallback(async (newText) => {
    // Passer en mode "non synchronisé"
    setIsSynch(false)

    // Annuler le timer précédent s'il existe
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }

    // Créer un nouveau timer de 2 secondes
    saveTimerRef.current = setTimeout(async () => {
      try {
        // Si c'est un clipboard local ou sans ID valide, ne pas envoyer au serveur
        if (!params.id || params.id.startsWith("local_") || !/^[a-f0-9]{24}$/i.test(params.id)) {
          setIsSynch(true)
          return
        }

        // Préparer le payload avec tous les champs
        const savedClipboard = localStorage.getItem("current_clipboard")
        let payload = {
          content: newText,
        }

        if (savedClipboard) {
          const clipboard = JSON.parse(savedClipboard)
          payload = {
            title: clipboard.title || "Sans titre",
            content: newText,
            files: clipboard.files || [],
            password: clipboard.password || null,
            expireAt: clipboard.expiresAt || null,
            readOnly: clipboard.readOnly || false,
            _id: params.id,
          }
        }

        // MISE À JOUR : _id en query parameter ET dans le body (comme dans le dashboard)
        const updateUrl = `${process.env.NEXT_PUBLIC_API_URL}/clipboards?_id=${params.id}`
        const config = {
          headers: {
            "Content-Type": "application/json",
          },
        }

        // Ajouter l'authentification si l'utilisateur est connecté
        if (user) {
          config.headers.Authorization = `Bearer ${user?.access_token}`
        }

        const response = await axios.post(updateUrl, payload, config)

        // Mettre à jour également le localStorage
        if (savedClipboard) {
          const clipboard = JSON.parse(savedClipboard)
          clipboard.text = newText
          clipboard.updatedAt = new Date().toISOString()
          localStorage.setItem("current_clipboard", JSON.stringify(clipboard))
        }

        // Repasser en mode "synchronisé"
        setIsSynch(true)
      } catch (error) {
        console.error("Erreur sauvegarde:", error)
        // Rester en mode "non synchronisé" en cas d'erreur
        toast({
          title: "Erreur de synchronisation",
          description: "Impossible de sauvegarder sur le serveur",
          variant: "destructive",
        })
      }
    }, 2000)
  }, [params.id, user, toast])

  // Fonction de téléchargement de fichiers
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    // Si on a un clipboard avec ID valide (pas local_), utiliser l'API de upload
    if (params.id && !params.id.startsWith("local_") && /^[a-f0-9]{24}$/i.test(params.id)) {
      // Upload via API (avec ou sans authentification)
      for (const file of files) {
        const formData = new FormData()
        formData.append("file", file)

        try {
          const config = {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }

          // Ajouter l'authentification si l'utilisateur est connecté
          if (user) {
            config.headers.Authorization = `Bearer ${user?.access_token}`
          }

          const response = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/clipboards/file?clipboardId=${params.id}`,
            formData,
            config
          )

          const updatedClipboard = response.data?.data
          if (updatedClipboard) {
            setUploadedFiles(updatedClipboard.files || [])

            const savedClipboard = localStorage.getItem("current_clipboard")
            if (savedClipboard) {
              const clipboard = JSON.parse(savedClipboard)
              clipboard.files = updatedClipboard.files
              clipboard.updatedAt = updatedClipboard.updatedAt
              localStorage.setItem("current_clipboard", JSON.stringify(clipboard))
            }
          }

          toast({
            title: "Fichier ajouté",
            description: `${file.name} a été téléchargé`,
          })
        } catch (error) {
          console.error("Erreur upload fichier:", error)
          toast({
            title: "Erreur",
            description: error.response?.data?.message || `Impossible de télécharger ${file.name}`,
            variant: "destructive",
          })
        }
      }
    } else {
      // Pas encore de clipboard ou clipboard local : créer d'abord un clipboard
      toast({
        title: "Information",
        description: "Veuillez d'abord créer un clipboard avant d'ajouter des fichiers",
        variant: "default",
      })
    }
  }

  // Fonction de suppression de fichier
  const handleRemoveFile = (index) => {
    const updatedFiles = uploadedFiles.filter((_, i) => i !== index)
    setUploadedFiles(updatedFiles)

    const savedClipboard = localStorage.getItem("current_clipboard")
    if (savedClipboard) {
      const clipboard = JSON.parse(savedClipboard)
      clipboard.files = updatedFiles
      clipboard.updatedAt = new Date().toISOString()
      localStorage.setItem("current_clipboard", JSON.stringify(clipboard))

      // Trigger auto-save avec debouncedSave
      debouncedSave(clipboardText)
    }

    toast({
      title: "Fichier supprimé",
      description: "Le fichier a été retiré du clipboard",
    })
  }

  // Fonction pour détecter si une chaîne contient du HTML
  const isHTML = (str) => {
    if (!str) return false
    const htmlRegex = /<\/?[a-z][\s\S]*>/i
    return htmlRegex.test(str)
  }

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

  // Détecter automatiquement le mode d'édition en fonction du contenu
  useEffect(() => {
    if (clipboardText) {
      if (isHTML(clipboardText)) {
        setEditorMode("rich")
      }
    }
  }, [clipboardText])

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

  // Socket.io client : connexion et listeners pour les mises à jour en temps réel
  useEffect(() => {
    if (!params.id || params.id.startsWith("local_") || !/^[a-f0-9]{24}$/i.test(params.id)) {
      // Ne pas se connecter pour les clipboards locaux
      return
    }

    try {
      socketRef.current = socketIoClient(process.env.NEXT_PUBLIC_API_URL || window.location.origin)

      socketRef.current.on('connect', () => {
        console.log('Socket connected:', socketRef.current.id)
        setSocketConnected(true)
        // Rejoindre la salle du clipboard
        socketRef.current.emit('joinClipboard', { clipboardId: params.id })
      })

      socketRef.current.on('disconnect', () => {
        console.log('Socket disconnected')
        setSocketConnected(false)
      })

      // Écouter les mises à jour du clipboard
      socketRef.current.on('clipboard:update', (payload) => {
        const clipData = payload?.data || payload
        if (clipData._id === params.id || clipData.id === params.id) {
          // Check for security changes to show notifications
          const prevClipboard = clipboard
          const becameReadOnly = clipData.readOnly && (!prevClipboard || !prevClipboard.readOnly)
          const passwordAdded = clipData.password && (!prevClipboard || !prevClipboard.password)
          const passwordRemoved = !clipData.password && prevClipboard && prevClipboard.password

          // If password was added and we were viewing the content, lock it
          if (passwordAdded && !isLocked) {
            setIsLocked(true)
            toast({
              title: "🔐 Mot de passe requis",
              description: "Le propriétaire a ajouté un mot de passe. Veuillez le saisir pour continuer.",
              duration: 5000,
            })
          }

          // If password was removed and we were locked, unlock
          if (passwordRemoved && isLocked) {
            setIsLocked(false)
            setClipboardText(clipData.content || clipData.text || "")
            toast({
              title: "🔓 Accès déverrouillé",
              description: "Le mot de passe a été supprimé. Vous pouvez maintenant voir le contenu.",
              duration: 4000,
            })
          }

          // Ne pas écraser le contenu si l'utilisateur est en train de taper ou si le clipboard est verrouillé
          if (!isTypingRef.current && !isLocked) {
            setClipboardText(clipData.content || clipData.text || "")
          }

          // Toujours mettre à jour les fichiers et autres données (silencieusement)
          setUploadedFiles(clipData.files || [])
          setClipboard((prev) => ({
            ...prev,
            text: clipData.content || clipData.text || "",
            content: clipData.content || clipData.text || "",
            files: clipData.files || [],
            updatedAt: clipData.updatedAt,
            title: clipData.title || prev?.title,
            // Update security settings in real-time
            password: clipData.password,
            readOnly: clipData.readOnly,
            expiresAt: clipData.expireAt || clipData.expiresAt,
          }))

          // Update localStorage to avoid overwriting changes from dashboard
          const savedClipboard = localStorage.getItem("current_clipboard")
          if (savedClipboard) {
            try {
              const clipboardData = JSON.parse(savedClipboard)
              if (clipboardData.id === params.id) {
                clipboardData.text = clipData.content || clipData.text || ""
                clipboardData.content = clipData.content || clipData.text || ""
                clipboardData.title = clipData.title || clipboardData.title
                clipboardData.files = clipData.files || []
                clipboardData.password = clipData.password || ""
                clipboardData.readOnly = clipData.readOnly || false
                clipboardData.expiresAt = clipData.expireAt || clipData.expiresAt || null
                clipboardData.updatedAt = clipData.updatedAt
                localStorage.setItem("current_clipboard", JSON.stringify(clipboardData))
              }
            } catch (err) {
              console.error('Error updating localStorage from socket', err)
            }
          }

          // Show notification for read-only mode
          if (becameReadOnly) {
            toast({
              title: "🔒 Mode lecture seule activé",
              description: "Le propriétaire a activé le mode lecture seule",
              duration: 4000,
            })
          }
        }
      })

      // Écouter les suppressions
      socketRef.current.on('clipboard:deleted', (payload) => {
        const clipboardId = payload?.clipboardId || payload
        if (clipboardId === params.id) {
          toast({
            title: "Clipboard supprimé",
            description: "Ce clipboard a été supprimé",
            variant: "destructive",
          })
          setTimeout(() => {
            router.push('/dashboard')
          }, 2000)
        }
      })

      // Écouter les viewers actifs
      socketRef.current.on('clipboard:viewers', (data) => {
        console.log('[clipboard:viewers] Received data:', data)
        const { clipboardId, active, totalViews: views } = data || {}
        if (clipboardId === params.id) {
          console.log('[clipboard:viewers] Updating active viewers:', active)
          setActiveViewers(
            Array.from({ length: active || 0 }).map((_, i) => ({
              name: `Viewer ${i + 1}`,
              color: generateRandomColor(),
            }))
          )
          if (views != null) {
            setTotalViews(views)
            setClipboard((prev) => ({
              ...prev,
              views,
            }))
          }
        }
      })

      // Cleanup on unmount
      return () => {
        try {
          if (socketRef.current) {
            socketRef.current.emit('leaveClipboard', { clipboardId: params.id })
            socketRef.current.disconnect()
          }
        } catch (err) {
          console.error('Socket cleanup error', err)
        }
      }
    } catch (err) {
      console.error('Socket init error', err)
    }
  }, [params.id, toast, router])

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

    // Marquer que l'utilisateur est en train de taper
    isTypingRef.current = true

    // Mettre à jour localStorage
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

    // Réinitialiser isTyping après 3 secondes d'inactivité
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }
    setTimeout(() => {
      isTypingRef.current = false
    }, 3000)

    // Déclencher la sauvegarde automatique avec debounce
    debouncedSave(newText)
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
      // Si le contenu est du HTML, extraire le texte brut
      let textToCopy = clipboardText
      if (isHTML(clipboardText)) {
        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = clipboardText
        textToCopy = tempDiv.textContent || tempDiv.innerText || ''
      }

      await navigator.clipboard.writeText(textToCopy)
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
              {clipboard?.expireAt && (
                <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md bg-orange-500/10 border border-orange-500/20 text-xs">
                  <Clock className="h-3 w-3 text-orange-600" />
                  <span className="text-orange-600">
                    Expire le {formatDate(clipboard.expireAt)}
                  </span>
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
              {activeViewers.length > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                  <Users className="h-3 w-3 text-green-600" />
                  <span className="text-[10px] md:text-xs font-medium text-green-600">
                    {activeViewers.length + 1} en ligne
                  </span>
                </div>
              )}
              {socketConnected && (
                <div className="hidden md:flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10">
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] text-green-600 font-medium">Temps réel</span>
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
                  {!clipboard?.readOnly && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <Label className="text-sm text-muted-foreground">Mode d'édition</Label>
                      <div className="flex items-center gap-2">
                        <Button
                          variant={editorMode === "rich" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setEditorMode("rich")}
                          className="flex-1 sm:flex-none text-xs sm:text-sm"
                        >
                          Éditeur riche
                        </Button>
                        <Button
                          variant={editorMode === "markdown" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setEditorMode("markdown")}
                          className="flex-1 sm:flex-none text-xs sm:text-sm"
                        >
                          Markdown
                        </Button>
                        <Button
                          variant={editorMode === "plain" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setEditorMode("plain")}
                          className="flex-1 sm:flex-none text-xs sm:text-sm"
                        >
                          Texte brut
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Affichage du contenu */}
                  {clipboard?.readOnly ? (
                    // Mode lecture seule : affichage uniquement
                    isHTML(clipboardText) ? (
                      <div className="border rounded-lg">
                        <div className="min-h-[300px] md:min-h-[500px] p-4 prose prose-sm dark:prose-invert max-w-none overflow-auto">
                          <div dangerouslySetInnerHTML={{ __html: clipboardText }} />
                        </div>
                      </div>
                    ) : (
                      <Textarea
                        placeholder="Ce clipboard est vide..."
                        value={clipboardText}
                        disabled={true}
                        className="min-h-[300px] md:min-h-[500px] font-mono text-sm resize-none"
                      />
                    )
                  ) : (
                    // Mode édition
                    editorMode === "rich" ? (
                      <RichTextEditor
                        content={clipboardText}
                        onChange={(html) => {
                          // Marquer que l'utilisateur est en train de taper
                          isTypingRef.current = true
                          setClipboardText(html)

                          // Réinitialiser isTyping après 3 secondes d'inactivité
                          if (saveTimerRef.current) {
                            clearTimeout(saveTimerRef.current)
                          }
                          setTimeout(() => {
                            isTypingRef.current = false
                          }, 3000)

                          debouncedSave(html)
                        }}
                        placeholder="Commencez à taper..."
                      />
                    ) : editorMode === "markdown" ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-muted-foreground mb-2 block">Éditeur</Label>
                          <Textarea
                            placeholder="# Titre&#10;&#10;**Gras** *Italique*"
                            value={clipboardText}
                            onChange={(e) => {
                              // Marquer que l'utilisateur est en train de taper
                              isTypingRef.current = true
                              setClipboardText(e.target.value)

                              // Réinitialiser isTyping après 3 secondes d'inactivité
                              if (saveTimerRef.current) {
                                clearTimeout(saveTimerRef.current)
                              }
                              setTimeout(() => {
                                isTypingRef.current = false
                              }, 3000)

                              debouncedSave(e.target.value)
                            }}
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
                        placeholder="Commencez à taper..."
                        value={clipboardText}
                        onChange={(e) => {
                          // Marquer que l'utilisateur est en train de taper
                          isTypingRef.current = true
                          setClipboardText(e.target.value)

                          // Réinitialiser isTyping après 3 secondes d'inactivité
                          if (saveTimerRef.current) {
                            clearTimeout(saveTimerRef.current)
                          }
                          setTimeout(() => {
                            isTypingRef.current = false
                          }, 3000)

                          debouncedSave(e.target.value)
                        }}
                        className="min-h-[300px] md:min-h-[500px] font-mono text-sm resize-none"
                      />
                    )
                  )}
                </TabsContent>

                <TabsContent value="files" className="space-y-4">
                  {/* Zone de téléchargement (uniquement en mode écriture) */}
                  {!clipboard?.readOnly && (
                    <div className="border-2 border-dashed border-border rounded-lg p-6 md:p-8 text-center">
                      <input
                        type="file"
                        id="file-upload"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                        accept="image/*,.pdf,.doc,.docx,.txt"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <Upload className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-sm font-medium mb-1">Cliquez pour télécharger</p>
                        <p className="text-xs text-muted-foreground">Images, PDFs, documents (max 15MB)</p>
                      </label>
                    </div>
                  )}

                  {uploadedFiles.length === 0 ? (
                    !clipboard?.readOnly ? null : (
                      <div className="text-center py-12 text-muted-foreground">
                        <FileIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-sm">Aucun fichier attaché</p>
                      </div>
                    )
                  ) : (
                    <div className="space-y-2">
                      <Label className="text-sm">Fichiers {!clipboard?.readOnly ? "téléchargés" : "attachés"} ({uploadedFiles.length})</Label>
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
                              <div className="flex items-center gap-2">
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
                                {/* Bouton supprimer (uniquement en mode écriture) */}
                                {!clipboard?.readOnly && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveFile(index)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
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
                  {/* Indicateur de synchronisation */}
                  {!clipboard?.readOnly && (
                    <span className="flex items-center gap-2">
                      <span className={"h-2 w-2 rounded-full animate-pulse " + (isSynch ? "bg-green-500" : "bg-orange-500")} />
                      {isSynch ? "Synchronisé" : "Non synchronisé"}
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
