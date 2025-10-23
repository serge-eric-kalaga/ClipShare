"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import {
  Clipboard,
  LogOut,
  Trash2,
  Plus,
  Copy,
  Check,
  History,
  Edit2,
  Star,
  Search,
  X,
  Lock,
  Clock,
  Eye,
  Shield,
  Upload,
  FileText,
  ImageIcon,
  File,
  Menu,
  Download,
  LogIn,
  AlertCircle,
} from "lucide-react"
import QRCodeDisplay from "@/components/qr-code-display"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ReactMarkdown from "react-markdown"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { decryptData } from "@/hooks/functions"
import axios from "axios"

export default function DashboardPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState(null)
  const [isGuest, setIsGuest] = useState(true)
  const [showAuthNotification, setShowAuthNotification] = useState(true)
  const [clipboardText, setClipboardText] = useState("")
  const [clipboardUrl, setClipboardUrl] = useState("")
  const [currentClipboardId, setCurrentClipboardId] = useState("")
  const [clipboardTitle, setClipboardTitle] = useState("")
  const [copied, setCopied] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [clipboardHistory, setClipboardHistory] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterFavorites, setFilterFavorites] = useState(false)
  const [contentType, setContentType] = useState("text")
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [markdownMode, setMarkdownMode] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const [showSecurityDialog, setShowSecurityDialog] = useState(false)
  const [clipboardPassword, setClipboardPassword] = useState("")
  const [clipboardExpiration, setClipboardExpiration] = useState("never")
  const [clipboardReadOnly, setClipboardReadOnly] = useState(false)
  const [showStatsDialog, setShowStatsDialog] = useState(false) // Added state for statistics

  // Ref pour le timer de debounce (auto-save après 2 secondes)
  const saveTimerRef = useRef(null)

  useEffect(() => {
    const userData = localStorage.getItem("clipshare_user")
    let currentUser = null
    let guest = true

    if (userData) {
      try {
        const decryptedData = decryptData(userData)

        // Vérifier si le déchiffrement a réussi
        if (!decryptedData) {
          console.warn('Failed to decrypt user data, clearing localStorage')
          localStorage.removeItem("clipshare_user")
          setIsGuest(true)
          return
        }

        currentUser = JSON.parse(decryptedData)
        setUser(currentUser)
        console.log(currentUser)

        guest = false
        setIsGuest(false)
        setShowAuthNotification(false)
      } catch (error) {
        console.error('Error loading user data:', error)
        // Nettoyer les données corrompues
        localStorage.removeItem("clipshare_user")
        setIsGuest(true)
      }
    } else {
      setIsGuest(true)
      // Check if user has dismissed the notification
      const notificationDismissed = localStorage.getItem("auth_notification_dismissed")
      if (notificationDismissed) {
        setShowAuthNotification(false)
      }
    }

    // Charger l'historique avec les valeurs locales (pas les états)
    if (!guest && currentUser) {
      // Utilisateur connecté : charger depuis l'API
      axios
        .get(`${process.env.NEXT_PUBLIC_API_URL}/clipboards`, {
          headers: { Authorization: `Bearer ${currentUser?.access_token}` },
        })
        .then((response) => {
          const backendClipboards = response.data?.data || []
          const mappedClipboards = backendClipboards.map((clip) => ({
            id: clip._id,
            url: `${window.location.origin}/clip/${clip._id}`,
            text: clip.content || "",
            title: clip.title || "Sans titre",
            isFavorite: false,
            password: clip.password || "",
            expiration: clip.expireAt || null,
            readOnly: clip.readOnly || false,
            contentType: "text",
            files: clip.files || [],
            markdownMode: false,
            createdAt: clip.createdAt,
            updatedAt: clip.updatedAt,
            views: clip.visits || 0,
            lastViewed: null,
            activeViewers: [],
          }))
          setClipboardHistory(mappedClipboards)
        })
        .catch((err) => {
          console.error("Erreur chargement historique:", err)
        })
    } else {
      // Invité : charger depuis localStorage
      const history = localStorage.getItem("clipboard_history")
      if (history) {
        setClipboardHistory(JSON.parse(history))
      }
    }

    const savedClipboard = localStorage.getItem("current_clipboard")
    if (savedClipboard) {
      const clipboard = JSON.parse(savedClipboard)
      setClipboardText(clipboard.text || "")
      setClipboardUrl(clipboard.url || "")
      setCurrentClipboardId(clipboard.id || "")
      setClipboardTitle(clipboard.title || "")
      setClipboardPassword(clipboard.password || "")
      setClipboardExpiration(clipboard.expiration || "never")
      setClipboardReadOnly(clipboard.readOnly || false)
      setContentType(clipboard.contentType || "text")
      setUploadedFiles(clipboard.files || [])
      setMarkdownMode(clipboard.markdownMode || false)
    }
    // NE PAS créer de clipboard automatiquement
    // Il sera créé lors de la première saisie de texte

    // Cleanup timer on unmount
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
    }
  }, []) // Removed router from dependency array as it's stable

  const loadClipboardHistory = () => {
    // Charger l'historique selon le statut de l'utilisateur
    if (!isGuest && user) {
      axios
        .get(`${process.env.NEXT_PUBLIC_API_URL}/clipboards`, {
          headers: { Authorization: `Bearer ${user?.access_token}` },
        })
        .then((response) => {
          const backendClipboards = response.data?.data || []
          // Mapper les champs backend vers frontend
          const mappedClipboards = backendClipboards.map((clip) => ({
            id: clip._id,
            url: `${window.location.origin}/clip/${clip._id}`,
            text: clip.content || "",
            title: clip.title || "Sans titre",
            isFavorite: false,
            password: clip.password || "",
            expiration: clip.expireAt || null,
            readOnly: clip.readOnly || false,
            contentType: "text",
            files: clip.files || [],
            markdownMode: false,
            createdAt: clip.createdAt,
            updatedAt: clip.updatedAt,
            views: clip.visits || 0,
            lastViewed: null,
            activeViewers: [],
          }))
          setClipboardHistory(mappedClipboards)
        })
        .catch((err) => {
          console.error("Erreur chargement historique:", err)
        })
    } else {
      // Invité : charger depuis localStorage
      const history = localStorage.getItem("clipboard_history")
      if (history) {
        setClipboardHistory(JSON.parse(history))
      }
    }
  }

  // Fonction pour sauvegarder automatiquement après 2 secondes de pause
  const debouncedSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }

    saveTimerRef.current = setTimeout(() => {
      const savedClipboard = localStorage.getItem("current_clipboard")
      if (savedClipboard) {
        const clipboard = JSON.parse(savedClipboard)
        saveToHistory(clipboard)
      }
    }, 2000)
  }, [isGuest, user]) // Dépendances nécessaires pour saveToHistory

  // Définies au niveau du composant pour être utilisables partout
  const generateNewClipboard = () => {
    if (!isGuest && user) {
      // Utilisateur connecté : créer sur le backend SANS _id
      const payload = {
        title: "Sans titre",
        content: "",
        files: [],
        password: null,
        expireAt: null,
        readOnly: false,
      }

      axios
        .post(`${process.env.NEXT_PUBLIC_API_URL}/clipboards`, payload, {
          headers: { Authorization: `Bearer ${user?.access_token}` },
        })
        .then((response) => {
          const saved = response.data?.data || response.data
          const id = saved?._id
          const url = `${window.location.origin}/clip/${id}`

          setClipboardUrl(url)
          setClipboardText("")
          setCurrentClipboardId(id)
          setClipboardTitle("")
          setClipboardPassword("")
          setClipboardExpiration(null)
          setClipboardReadOnly(false)
          setContentType("text")
          setUploadedFiles([])
          setMarkdownMode(false)

          const clipboard = {
            id,
            url,
            text: "",
            title: "Sans titre",
            isFavorite: false,
            password: "",
            expiration: null,
            readOnly: false,
            contentType: "text",
            files: [],
            markdownMode: false,
            createdAt: saved?.createdAt || new Date().toISOString(),
            updatedAt: saved?.updatedAt || new Date().toISOString(),
            views: saved?.visits || 0,
            lastViewed: null,
            activeViewers: [],
          }

          localStorage.setItem("current_clipboard", JSON.stringify(clipboard))
          loadClipboardHistory()

          toast({
            title: "Nouveau clipboard créé",
            description: "Sauvegardé sur le serveur",
          })
        })
        .catch((err) => {
          console.error("Erreur création clipboard:", err)
          toast({
            title: "Erreur",
            description: err?.response?.data?.message || "Une erreur est survenue",
            variant: "destructive",
          })
        })
    } else {
      // Invité : créer localement avec un ID temporaire
      const id = `local_${Math.random().toString(36).substr(2, 9)}`
      const url = `${window.location.origin}/clip/${id}`

      setClipboardUrl(url)
      setClipboardText("")
      setCurrentClipboardId(id)
      setClipboardTitle("")
      setClipboardPassword("")
      setClipboardExpiration(null)
      setClipboardReadOnly(false)
      setContentType("text")
      setUploadedFiles([])
      setMarkdownMode(false)

      const clipboard = {
        id,
        url,
        text: "",
        title: "Sans titre",
        isFavorite: false,
        password: "",
        expiration: null,
        readOnly: false,
        contentType: "text",
        files: [],
        markdownMode: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        views: 0,
        lastViewed: null,
        activeViewers: [],
      }

      localStorage.setItem("current_clipboard", JSON.stringify(clipboard))

      const history = localStorage.getItem("clipboard_history")
      const historyArray = history ? JSON.parse(history) : []
      historyArray.unshift(clipboard)
      localStorage.setItem("clipboard_history", JSON.stringify(historyArray))
      setClipboardHistory(historyArray)

      toast({
        title: "Nouveau clipboard créé",
        description: "Connectez-vous pour sauvegarder en ligne",
      })
    }
  }

  const saveToHistory = (clipboard) => {
    if (!isGuest && user) {
      // Ne pas sauvegarder si l'ID est manquant ou invalide
      if (!clipboard.id) {
        console.warn("Cannot save clipboard without ID")
        return
      }

      // Vérifier si c'est un clipboard local (créé par un invité ou avec préfixe local_)
      // OU si l'ID n'est pas un ObjectId valide (pas 24 caractères hexadécimaux)
      const isLocalClipboard = clipboard.id.startsWith("local_") || !/^[a-f0-9]{24}$/i.test(clipboard.id)

      // Si c'est un clipboard local, créer un nouveau clipboard sur le backend
      if (isLocalClipboard) {
        const payload = {
          title: clipboard.title || "Sans titre",
          content: clipboard.text || "",
          files: clipboard.files || [],
          password: clipboard.password || null,
          expireAt: clipboard.expiresAt || null,
          readOnly: clipboard.readOnly || false,
        }

        // CRÉATION : pas d'_id du tout
        const url = `${process.env.NEXT_PUBLIC_API_URL}/clipboards`

        axios
          .post(url, payload, {
            headers: { Authorization: `Bearer ${user?.access_token}` },
          })
          .then((response) => {
            const saved = response.data?.data || response.data

            // Mettre à jour avec l'ID du backend
            if (saved?._id) {
              const newId = saved._id
              const newUrl = `${window.location.origin}/clip/${newId}`

              setCurrentClipboardId(newId)
              setClipboardUrl(newUrl)

              clipboard.id = newId
              clipboard.url = newUrl
              clipboard.createdAt = saved.createdAt
              clipboard.updatedAt = saved.updatedAt

              localStorage.setItem("current_clipboard", JSON.stringify(clipboard))
            }

            loadClipboardHistory()
          })
          .catch((err) => {
            console.error("Erreur création clipboard:", err)
          })
        return // Important: sortir ici pour ne pas continuer
      }

      // Utilisateur connecté avec un clipboard backend : MISE À JOUR uniquement
      const payload = {
        title: clipboard.title || "Sans titre",
        content: clipboard.text || "",
        files: clipboard.files || [],
        password: clipboard.password || null,
        expireAt: clipboard.expiresAt || null,
        readOnly: clipboard.readOnly || false,
        _id: clipboard.id,
      }

      // MISE À JOUR : _id en query parameter ET dans le body
      const updateUrl = `${process.env.NEXT_PUBLIC_API_URL}/clipboards?_id=${clipboard.id}`

      axios
        .post(updateUrl, payload, {
          headers: { Authorization: `Bearer ${user?.access_token}` },
        })
        .then((response) => {
          loadClipboardHistory()
        })
        .catch((err) => {
          console.error("Erreur mise à jour clipboard:", err)
        })
    } else {
      // Invité : sauvegarder uniquement en localStorage
      const history = localStorage.getItem("clipboard_history")
      const historyArray = history ? JSON.parse(history) : []
      const existingIndex = historyArray.findIndex((item) => item.id === clipboard.id)

      if (existingIndex !== -1) {
        historyArray[existingIndex] = clipboard
      } else {
        historyArray.unshift(clipboard)
      }

      localStorage.setItem("clipboard_history", JSON.stringify(historyArray))
      setClipboardHistory(historyArray)
    }
  }


  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files)

    if (!isGuest && user && currentClipboardId && !currentClipboardId.startsWith("local_")) {
      // Utilisateur connecté avec clipboard backend : upload via API
      for (const file of files) {
        const formData = new FormData()
        formData.append("file", file)

        try {
          const response = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/clipboards/file?clipboardId=${currentClipboardId}`,
            formData,
            {
              headers: {
                Authorization: `Bearer ${user?.access_token}`,
                "Content-Type": "multipart/form-data",
              },
            }
          )

          const updatedClipboard = response.data?.data
          if (updatedClipboard) {
            setUploadedFiles(updatedClipboard.files || [])

            const clipboard = JSON.parse(localStorage.getItem("current_clipboard") || "{}")
            clipboard.files = updatedClipboard.files
            clipboard.updatedAt = updatedClipboard.updatedAt
            localStorage.setItem("current_clipboard", JSON.stringify(clipboard))
          }

          toast({
            title: "Fichier ajouté",
            description: `${file.name} a été téléchargé`,
          })
        } catch (error) {
          console.error("Erreur upload fichier:", error)
          toast({
            title: "Erreur",
            description: `Impossible de télécharger ${file.name}`,
            variant: "destructive",
          })
        }
      }
      loadClipboardHistory()
    } else {
      // Invité ou clipboard local : stockage en base64
      const filePromises = files.map((file) => {
        return new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = (event) => {
            resolve({
              name: file.name,
              type: file.type,
              size: file.size,
              data: event.target.result,
              uploadedAt: new Date().toISOString(),
            })
          }
          reader.readAsDataURL(file)
        })
      })

      const newFiles = await Promise.all(filePromises)
      const updatedFiles = [...uploadedFiles, ...newFiles]
      setUploadedFiles(updatedFiles)

      const savedClipboard = localStorage.getItem("current_clipboard")
      if (savedClipboard) {
        const clipboard = JSON.parse(savedClipboard)
        clipboard.files = updatedFiles
        clipboard.contentType = "mixed"
        clipboard.updatedAt = new Date().toISOString()
        localStorage.setItem("current_clipboard", JSON.stringify(clipboard))

        // Trigger auto-save
        debouncedSave()
      }

      setContentType("mixed")

      toast({
        title: "Fichiers ajoutés",
        description: `${newFiles.length} fichier(s) ajouté(s) avec succès`,
      })
    }
  }

  const handleRemoveFile = (index) => {
    const updatedFiles = uploadedFiles.filter((_, i) => i !== index)
    setUploadedFiles(updatedFiles)

    const savedClipboard = localStorage.getItem("current_clipboard")
    if (savedClipboard) {
      const clipboard = JSON.parse(savedClipboard)
      clipboard.files = updatedFiles
      clipboard.contentType = updatedFiles.length > 0 ? "mixed" : "text"
      clipboard.updatedAt = new Date().toISOString()
      localStorage.setItem("current_clipboard", JSON.stringify(clipboard))

      // Trigger auto-save
      debouncedSave()
    }

    if (updatedFiles.length === 0) {
      setContentType("text")
    }

    toast({
      title: "Fichier supprimé",
      description: "Le fichier a été retiré du clipboard",
    })
  }

  const handleSecuritySettings = () => {
    const savedClipboard = localStorage.getItem("current_clipboard")
    if (savedClipboard) {
      const clipboard = JSON.parse(savedClipboard)
      clipboard.password = clipboardPassword
      clipboard.expiration = clipboardExpiration
      clipboard.readOnly = clipboardReadOnly
      clipboard.updatedAt = new Date().toISOString()

      if (clipboardExpiration !== "never" && clipboardExpiration) {
        const now = new Date()
        const hours = Number.parseInt(clipboardExpiration)
        clipboard.expiresAt = new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString()
      } else {
        clipboard.expiresAt = null
      }

      localStorage.setItem("current_clipboard", JSON.stringify(clipboard))

      // Trigger auto-save
      debouncedSave()
    }

    setShowSecurityDialog(false)
    toast({
      title: "Paramètres de sécurité mis à jour",
      description: "Vos paramètres ont été enregistrés",
    })
  }

  const handleTitleChange = (e) => {
    const newTitle = e.target.value
    setClipboardTitle(newTitle)

    const savedClipboard = localStorage.getItem("current_clipboard")
    if (savedClipboard) {
      const clipboard = JSON.parse(savedClipboard)
      clipboard.title = newTitle
      clipboard.updatedAt = new Date().toISOString()
      localStorage.setItem("current_clipboard", JSON.stringify(clipboard))

      // AUTO-SAVE après 2 secondes
      debouncedSave()
    }
  }

  const handleTextChange = (e) => {
    const newText = e.target.value
    setClipboardText(newText)

    // Si pas de clipboard existant, en créer un d'abord
    if (!currentClipboardId && !isGuest && user) {
      // Utilisateur connecté : créer sur le backend
      const payload = {
        title: clipboardTitle || "Sans titre",
        content: newText,
        files: [],
        password: null,
        expireAt: null,
        readOnly: false,
      }

      axios
        .post(`${process.env.NEXT_PUBLIC_API_URL}/clipboards`, payload, {
          headers: { Authorization: `Bearer ${user?.access_token}` },
        })
        .then((response) => {
          const saved = response.data?.data || response.data
          const id = saved?._id
          const url = `${window.location.origin}/clip/${id}`

          setClipboardUrl(url)
          setCurrentClipboardId(id)

          const clipboard = {
            id,
            url,
            text: newText,
            title: clipboardTitle || "Sans titre",
            isFavorite: false,
            password: "",
            expiration: null,
            readOnly: false,
            contentType: "text",
            files: [],
            markdownMode: markdownMode,
            createdAt: saved.createdAt || new Date().toISOString(),
            updatedAt: saved.updatedAt || new Date().toISOString(),
            views: 0,
            lastViewed: null,
            activeViewers: [],
          }

          localStorage.setItem("current_clipboard", JSON.stringify(clipboard))
        })
        .catch((err) => {
          console.error("Erreur création clipboard:", err)
        })
    } else if (!currentClipboardId && isGuest) {
      // Invité : créer localement (sans ajouter à l'historique tout de suite)
      const id = `local_${Math.random().toString(36).substr(2, 9)}`
      const url = `${window.location.origin}/clip/${id}`

      setClipboardUrl(url)
      setCurrentClipboardId(id)

      const clipboard = {
        id,
        url,
        text: newText,
        title: clipboardTitle || "Sans titre",
        isFavorite: false,
        password: "",
        expiration: null,
        readOnly: false,
        contentType: "text",
        files: [],
        markdownMode: markdownMode,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        views: 0,
        lastViewed: null,
        activeViewers: [],
      }

      // Sauvegarder uniquement le clipboard actuel, PAS dans l'historique
      localStorage.setItem("current_clipboard", JSON.stringify(clipboard))
    } else {
      // Clipboard existe déjà : mise à jour localStorage et debounce
      const savedClipboard = localStorage.getItem("current_clipboard")
      if (savedClipboard) {
        const clipboard = JSON.parse(savedClipboard)
        clipboard.text = newText
        clipboard.markdownMode = markdownMode
        clipboard.updatedAt = new Date().toISOString()
        localStorage.setItem("current_clipboard", JSON.stringify(clipboard))

        // AUTO-SAVE après 2 secondes
        debouncedSave()
      }
    }
  }

  const handleClear = () => {
    setClipboardText("")
    setUploadedFiles([])
    setContentType("text")

    const savedClipboard = localStorage.getItem("current_clipboard")
    if (savedClipboard) {
      const clipboard = JSON.parse(savedClipboard)
      clipboard.text = ""
      clipboard.files = []
      clipboard.contentType = "text"
      clipboard.updatedAt = new Date().toISOString()
      localStorage.setItem("current_clipboard", JSON.stringify(clipboard))
      saveToHistory(clipboard)
    }

    toast({
      title: "Clipboard vidé",
      description: "Le contenu a été effacé",
    })
  }

  const handleToggleFavorite = (clipboardId) => {
    const history = localStorage.getItem("clipboard_history")
    if (history) {
      const historyArray = JSON.parse(history)
      const clipboardIndex = historyArray.findIndex((item) => item.id === clipboardId)

      if (clipboardIndex !== -1) {
        historyArray[clipboardIndex].isFavorite = !historyArray[clipboardIndex].isFavorite
        localStorage.setItem("clipboard_history", JSON.stringify(historyArray))
        setClipboardHistory(historyArray)

        if (clipboardId === currentClipboardId) {
          const savedClipboard = localStorage.getItem("current_clipboard")
          if (savedClipboard) {
            const clipboard = JSON.parse(savedClipboard)
            clipboard.isFavorite = historyArray[clipboardIndex].isFavorite
            localStorage.setItem("current_clipboard", JSON.stringify(clipboard))
          }
        }

        toast({
          title: historyArray[clipboardIndex].isFavorite ? "Ajouté aux favoris" : "Retiré des favoris",
          description: historyArray[clipboardIndex].isFavorite
            ? "Ce clipboard est maintenant dans vos favoris"
            : "Ce clipboard a été retiré de vos favoris",
        })
      }
    }
  }

  const handleLoadClipboard = (clipboard) => {
    setClipboardText(clipboard.text || "")
    setClipboardUrl(clipboard.url || "")
    setCurrentClipboardId(clipboard.id || "")
    setClipboardTitle(clipboard.title || "")
    setClipboardPassword(clipboard.password || "")
    setClipboardExpiration(clipboard.expiration || "never")
    setClipboardReadOnly(clipboard.readOnly || false)
    setContentType(clipboard.contentType || "text")
    setUploadedFiles(clipboard.files || [])
    setMarkdownMode(clipboard.markdownMode || false)
    localStorage.setItem("current_clipboard", JSON.stringify(clipboard))
    setShowHistory(false)

    toast({
      title: "Clipboard chargé",
      description: "Le clipboard a été chargé avec succès",
    })
  }

  const handleDeleteClipboard = (clipboardId) => {
    const history = localStorage.getItem("clipboard_history")
    if (history) {
      let historyArray = JSON.parse(history)
      historyArray = historyArray.filter((item) => item.id !== clipboardId)
      localStorage.setItem("clipboard_history", JSON.stringify(historyArray))
      setClipboardHistory(historyArray)

      if (clipboardId === currentClipboardId) {
        generateNewClipboard()
      }

      toast({
        title: "Clipboard supprimé",
        description: "Le clipboard a été supprimé de l'historique",
      })
    }
  }

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(clipboardUrl)
      setCopied(true)
      toast({
        title: "URL copiée",
        description: "L'URL a été copiée dans votre clipboard",
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

  const handleLogout = () => {
    localStorage.removeItem("clipshare_user")
    setUser(null)
    setIsGuest(true)
    setShowAuthNotification(true)
    localStorage.removeItem("auth_notification_dismissed")
    toast({
      title: "Déconnexion réussie",
      description: "Vous êtes maintenant en mode invité",
    })
  }

  const handleGoToLogin = () => {
    router.push("/login")
  }

  const handleDismissNotification = () => {
    setShowAuthNotification(false)
    localStorage.setItem("auth_notification_dismissed", "true")
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

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  const isExpired = (clipboard) => {
    if (!clipboard.expiresAt) return false
    return new Date(clipboard.expiresAt) < new Date()
  }

  const filteredClipboards = clipboardHistory.filter((clipboard) => {
    const matchesSearch =
      clipboard.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clipboard.text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clipboard.id.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesFavorite = !filterFavorites || clipboard.isFavorite

    return matchesSearch && matchesFavorite
  })

  const handleExportTxt = () => {
    const content = clipboardTitle ? `${clipboardTitle}\n\n${clipboardText}` : clipboardText
    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${clipboardTitle || `clipboard-${currentClipboardId}`}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Export réussi",
      description: "Le fichier .txt a été téléchargé",
    })
  }

  const handleExportMarkdown = () => {
    let content = ""
    if (clipboardTitle) {
      content = `# ${clipboardTitle}\n\n${clipboardText}`
    } else {
      content = clipboardText
    }

    const blob = new Blob([content], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${clipboardTitle || `clipboard-${currentClipboardId}`}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Export réussi",
      description: "Le fichier .md a été téléchargé",
    })
  }

  const handleExportPdf = () => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) {
      toast({
        title: "Erreur",
        description: "Impossible d'ouvrir la fenêtre d'impression",
        variant: "destructive",
      })
      return
    }

    const content = clipboardTitle
      ? `<h1>${clipboardTitle}</h1><pre>${clipboardText}</pre>`
      : `<pre>${clipboardText}</pre>`

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${clipboardTitle || `Clipboard ${currentClipboardId}`}</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
            }
            h1 {
              color: #333;
              margin-bottom: 20px;
            }
            pre {
              white-space: pre-wrap;
              word-wrap: break-word;
              font-family: 'Courier New', monospace;
              font-size: 14px;
              line-height: 1.6;
              color: #333;
            }
          </style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.focus()

    setTimeout(() => {
      printWindow.print()
    }, 250)

    toast({
      title: "Export PDF",
      description: "Utilisez la boîte de dialogue d'impression pour sauvegarder en PDF",
    })
  }

  const handleCopyContent = async () => {
    try {
      await navigator.clipboard.writeText(clipboardText)
      toast({
        title: "Contenu copié",
        description: "Le texte a été copié dans votre presse-papier",
      })
    } catch (err) {
      toast({
        title: "Erreur",
        description: "Impossible de copier le contenu",
        variant: "destructive",
      })
    }
  }

  // Function to get clipboard stats
  const getClipboardStats = (clipboardId) => {
    // Vérifier que nous sommes côté client
    if (typeof window === "undefined") {
      return null
    }

    const history = localStorage.getItem("clipboard_history")
    if (history) {
      const historyArray = JSON.parse(history)
      const clipboard = historyArray.find((item) => item.id === clipboardId)
      if (clipboard) {
        return {
          views: clipboard.views || 0,
          lastViewed: clipboard.lastViewed,
          activeViewers: clipboard.activeViewers || [],
          createdAt: clipboard.createdAt,
          updatedAt: clipboard.updatedAt,
        }
      }
    }
    return null
  }

  // Removed the check for !user here as we now handle guest users
  // if (!user) {
  //   return null
  // }

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
                  {isGuest ? "Mode invité" : `Bienvenue, ${user.username.split("@")[0]}`}
                </p>
              </div>
            </div>

            {/* Desktop buttons */}
            <div className="hidden md:flex gap-2">
              <ThemeToggle />
              <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)}>
                <History className="h-4 w-4 mr-2" />
                Historique
              </Button>
              {isGuest ? (
                <Button variant="default" size="sm" onClick={handleGoToLogin}>
                  <LogIn className="h-4 w-4 mr-2" />
                  Connexion
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Déconnexion
                </Button>
              )}
            </div>

            {/* Mobile menu */}
            <div className="flex md:hidden gap-2">
              <ThemeToggle />
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right">
                  <SheetHeader>
                    <SheetTitle>Menu</SheetTitle>
                    <SheetDescription>{isGuest ? "Mode invité" : `Bienvenue, ${user.username.split("@")[0]}`}</SheetDescription>
                  </SheetHeader>
                  <div className="flex flex-col gap-2 mt-6">
                    <Button
                      variant="outline"
                      className="w-full justify-start bg-transparent"
                      onClick={() => {
                        setShowHistory(!showHistory)
                        setMobileMenuOpen(false)
                      }}
                    >
                      <History className="h-4 w-4 mr-2" />
                      Historique
                    </Button>
                    {isGuest ? (
                      <Button
                        variant="default"
                        className="w-full justify-start"
                        onClick={() => {
                          handleGoToLogin()
                          setMobileMenuOpen(false)
                        }}
                      >
                        <LogIn className="h-4 w-4 mr-2" />
                        Connexion
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => {
                          handleLogout()
                          setMobileMenuOpen(false)
                        }}
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Déconnexion
                      </Button>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {isGuest && showAuthNotification && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50">
          <Alert className="bg-card border-primary/50 shadow-lg">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-sm font-medium mb-1">Mode invité</p>
                <p className="text-xs text-muted-foreground">
                  Vos données sont stockées localement. Connectez-vous pour sauvegarder vos clipboards de manière
                  permanente.
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={handleDismissNotification}>
                <X className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4 md:py-8">
        {showHistory ? (
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg md:text-xl">Historique des Clipboards</CardTitle>
                    <CardDescription className="text-sm">Gérez vos clipboards précédents</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowHistory(false)}
                    className="w-full sm:w-auto"
                  >
                    Retour
                  </Button>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-9"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <Button
                    variant={filterFavorites ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterFavorites(!filterFavorites)}
                    className="w-full sm:w-auto"
                  >
                    <Star className={`h-4 w-4 mr-2 ${filterFavorites ? "fill-current" : ""}`} />
                    Favoris
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {filteredClipboards.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">
                      {searchQuery || filterFavorites ? "Aucun résultat trouvé" : "Aucun clipboard dans l'historique"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredClipboards.map((clipboard) => (
                      <div
                        key={clipboard.id}
                        className={`p-3 md:p-4 rounded-lg border ${clipboard.id === currentClipboardId ? "border-primary bg-primary/5" : "border-border bg-card"
                          } ${isExpired(clipboard) ? "opacity-50" : ""}`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="text-sm font-semibold break-all">
                                {clipboard.title || `Clipboard #${clipboard.id}`}
                              </span>
                              {clipboard.isFavorite && (
                                <Star className="h-4 w-4 fill-yellow-500 text-yellow-500 shrink-0" />
                              )}
                              {clipboard.password && <Lock className="h-4 w-4 text-muted-foreground shrink-0" />}
                              {clipboard.readOnly && <Eye className="h-4 w-4 text-muted-foreground shrink-0" />}
                              {clipboard.files && clipboard.files.length > 0 && (
                                <File className="h-4 w-4 text-muted-foreground shrink-0" />
                              )}
                              {clipboard.expiration !== "never" && !isExpired(clipboard) && (
                                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                              )}
                              {isExpired(clipboard) && (
                                <span className="text-xs bg-destructive text-destructive-foreground px-2 py-0.5 rounded shrink-0">
                                  Expiré
                                </span>
                              )}
                              {clipboard.id === currentClipboardId && (
                                <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded shrink-0">
                                  Actuel
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mb-2 break-all">ID: {clipboard.id}</p>
                            <p className="text-xs text-muted-foreground mb-2">
                              Créé le {formatDate(clipboard.createdAt)}
                            </p>
                            <p className="text-xs text-muted-foreground mb-2">
                              {clipboard.views || 0} vue(s)
                              {clipboard.lastViewed && ` • Dernière vue: ${formatDate(clipboard.lastViewed)}`}
                            </p>
                            <p className="text-sm font-mono bg-muted p-2 rounded truncate">
                              {clipboard.text || "(vide)"}
                            </p>
                            {clipboard.files && clipboard.files.length > 0 && (
                              <p className="text-xs text-muted-foreground mt-2">
                                {clipboard.files.length} fichier(s) attaché(s)
                              </p>
                            )}
                          </div>
                          <div className="flex sm:flex-col gap-2 shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleFavorite(clipboard.id)}
                              className="flex-1 sm:flex-none"
                            >
                              <Star
                                className={`h-4 w-4 ${clipboard.isFavorite ? "fill-current text-yellow-500" : ""}`}
                              />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleLoadClipboard(clipboard)}
                              disabled={clipboard.id === currentClipboardId || isExpired(clipboard)}
                              className="flex-1 sm:flex-none"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteClipboard(clipboard.id)}
                              className="flex-1 sm:flex-none"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
            {/* Clipboard Editor */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <CardTitle className="text-lg md:text-xl">Votre Clipboard</CardTitle>
                      <CardDescription className="text-sm">Tapez ou collez votre texte ici</CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="flex-1 sm:flex-none bg-transparent">
                            <Download className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Export</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={handleCopyContent}>
                            <Copy className="h-4 w-4 mr-2" />
                            Copier le contenu
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleExportTxt}>
                            <FileText className="h-4 w-4 mr-2" />
                            Exporter en .txt
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleExportMarkdown}>
                            <FileText className="h-4 w-4 mr-2" />
                            Exporter en .md
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleExportPdf}>
                            <File className="h-4 w-4 mr-2" />
                            Exporter en PDF
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Dialog open={showSecurityDialog} onOpenChange={setShowSecurityDialog}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="flex-1 sm:flex-none bg-transparent">
                            <Shield className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Sécurité</span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-[95vw] sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Paramètres de sécurité</DialogTitle>
                            <DialogDescription className="text-sm">
                              Configurez la protection et l'expiration
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="password" className="text-sm">
                                Mot de passe (optionnel)
                              </Label>
                              <Input
                                id="password"
                                type="password"
                                placeholder="Protégez votre clipboard..."
                                value={clipboardPassword}
                                onChange={(e) => setClipboardPassword(e.target.value)}
                              />
                              <p className="text-xs text-muted-foreground">
                                Les utilisateurs devront entrer ce mot de passe
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="expiration" className="text-sm">
                                Expiration
                              </Label>
                              <Select value={clipboardExpiration} onValueChange={setClipboardExpiration}>
                                <SelectTrigger id="expiration">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="never">Jamais</SelectItem>
                                  <SelectItem value="1">1 heure</SelectItem>
                                  <SelectItem value="24">24 heures</SelectItem>
                                  <SelectItem value="168">7 jours</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id="readonly"
                                checked={clipboardReadOnly}
                                onChange={(e) => setClipboardReadOnly(e.target.checked)}
                                className="h-4 w-4 rounded border-input"
                              />
                              <Label htmlFor="readonly" className="cursor-pointer text-sm">
                                Mode lecture seule
                              </Label>
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setShowSecurityDialog(false)} size="sm">
                              Annuler
                            </Button>
                            <Button onClick={handleSecuritySettings} size="sm">
                              Enregistrer
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClear}
                        className="flex-1 sm:flex-none bg-transparent"
                      >
                        <Trash2 className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Vider</span>
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={generateNewClipboard}
                        className="flex-1 sm:flex-none"
                      >
                        <Plus className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Nouveau</span>
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Input
                      placeholder="Titre du clipboard (optionnel)..."
                      value={clipboardTitle}
                      onChange={handleTitleChange}
                      className="font-semibold"
                    />
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
                        <Upload className="h-4 w-4 mr-1 sm:mr-2" />
                        Fichiers ({uploadedFiles.length})
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="text" className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <Label className="text-sm text-muted-foreground">Mode d'édition</Label>
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
                              className="min-h-[300px] md:min-h-[400px] font-mono text-sm resize-none"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground mb-2 block">Aperçu</Label>
                            <div className="min-h-[300px] md:min-h-[400px] p-4 border rounded-lg bg-muted/30 prose prose-sm dark:prose-invert max-w-none overflow-auto">
                              <ReactMarkdown>{clipboardText || "*Aucun contenu*"}</ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <Textarea
                          placeholder="Commencez à taper ou collez votre texte ici..."
                          value={clipboardText}
                          onChange={handleTextChange}
                          className="min-h-[300px] md:min-h-[400px] font-mono text-sm resize-none"
                        />
                      )}
                    </TabsContent>
                    <TabsContent value="files" className="space-y-4">
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
                          <p className="text-xs text-muted-foreground">Images, PDFs, documents</p>
                        </label>
                      </div>
                      {uploadedFiles.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm">Fichiers téléchargés</Label>
                          <div className="space-y-2">
                            {uploadedFiles.map((file, index) => {
                              // Gérer les deux formats : objet (local) ou string (backend)
                              const isFileObject = typeof file === "object" && file !== null
                              const fileName = isFileObject ? file.name : file.split("/").pop()
                              const fileType = isFileObject ? file.type : ""
                              const fileSize = isFileObject ? file.size : 0
                              const isImage = isFileObject
                                ? fileType.startsWith("image/")
                                : /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName)

                              return (
                                <div
                                  key={index}
                                  className="flex items-center justify-between p-3 border rounded-lg bg-card"
                                >
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    {isImage ? (
                                      <ImageIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                                    ) : (
                                      <File className="h-5 w-5 text-muted-foreground shrink-0" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{fileName}</p>
                                      {fileSize > 0 && (
                                        <p className="text-xs text-muted-foreground">{formatFileSize(fileSize)}</p>
                                      )}
                                    </div>
                                  </div>
                                  <Button variant="ghost" size="sm" onClick={() => handleRemoveFile(index)}>
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm text-muted-foreground">
                    <span>
                      {clipboardText.length} caractères • {uploadedFiles.length} fichier(s)
                    </span>
                    <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                      {clipboardPassword && (
                        <span className="flex items-center gap-1">
                          <Lock className="h-3 w-3" />
                          Protégé
                        </span>
                      )}
                      {clipboardReadOnly && (
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          Lecture seule
                        </span>
                      )}
                      {/* Expiration */}
                      <div>
                        {clipboardExpiration === "never" ? (
                          <span className="flex items-center gap-1">
                            <Infinity className="h-3 w-3" />
                            Jamais expiré
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Expire dans {clipboardExpiration} heure(s)
                          </span>
                        )}
                      </div>
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                        Sync temps réel
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg md:text-xl">URL de Partage</CardTitle>
                  <CardDescription className="text-sm">Partagez cette URL</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <div className="flex-1 p-2 md:p-3 bg-muted rounded-lg text-xs md:text-sm font-mono break-all">
                      {clipboardUrl}
                    </div>
                    <Button variant="outline" size="icon" onClick={handleCopyUrl} className="shrink-0 bg-transparent">
                      {copied ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg md:text-xl">QR Code</CardTitle>
                  <CardDescription className="text-sm">Scannez depuis mobile</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <QRCodeDisplay url={clipboardUrl} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg md:text-xl">Statistiques</CardTitle>
                  <CardDescription className="text-sm">Activité du clipboard</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Vues totales</span>
                      <span className="text-2xl font-bold">{getClipboardStats(currentClipboardId)?.views || 0}</span>
                    </div>
                    {getClipboardStats(currentClipboardId)?.lastViewed && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Dernière vue</span>
                        <span className="text-xs">{formatDate(getClipboardStats(currentClipboardId).lastViewed)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Créé le</span>
                      <span className="text-xs">
                        {getClipboardStats(currentClipboardId)?.createdAt &&
                          formatDate(getClipboardStats(currentClipboardId).createdAt)}
                      </span>
                    </div>
                    {getClipboardStats(currentClipboardId)?.updatedAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Modifié le</span>
                        <span className="text-xs">{formatDate(getClipboardStats(currentClipboardId).updatedAt)}</span>
                      </div>
                    )}
                  </div>
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Viewers actifs</span>
                      <span className="text-sm font-semibold">
                        {getClipboardStats(currentClipboardId)?.activeViewers?.length || 0}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {getClipboardStats(currentClipboardId)?.activeViewers?.length > 0 ? (
                        getClipboardStats(currentClipboardId).activeViewers.map((viewer, index) => (
                          <div
                            key={index}
                            className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold"
                            style={{
                              backgroundColor: viewer.color,
                              color: "#fff",
                            }}
                            title={viewer.name}
                          >
                            {viewer.name.charAt(0).toUpperCase()}
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground">Aucun viewer actif pour le moment</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-base">Astuce</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>Toute personne avec l'URL peut voir et modifier le contenu en temps réel.</p>
                  <p>Créez un nouveau clipboard pour une nouvelle URL unique.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
