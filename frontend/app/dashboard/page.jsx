"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import {
  // Clipboard,
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
  Infinity,
  ChevronLeft,
  ChevronRight,
  CalendarIcon,
} from "lucide-react"
import { io as socketIoClient } from "socket.io-client"
import QRCodeDisplay from "@/components/qr-code-display"
import RichTextEditor from "@/components/rich-text-editor"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ReactMarkdown from "react-markdown"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { decryptData } from "@/hooks/functions"
import axios from "axios"

export default function Dashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const [clipboards, setClipboards] = useState([])
  const [selectedClipboard, setSelectedClipboard] = useState(null)
  const [clipboard, setClipboard] = useState(null)
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

  // DEBUG: Log renders and clipboardHistory
  const [searchQuery, setSearchQuery] = useState("")
  const [filterFavorites, setFilterFavorites] = useState(false)
  const [contentType, setContentType] = useState("text")
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [markdownMode, setMarkdownMode] = useState(false)
  const [editorMode, setEditorMode] = useState("rich") // "rich", "markdown", "plain"
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isSynch, setIsSynch] = useState(true)
  const [clipboardCreatedAt, setClipboardCreatedAt] = useState("")
  const [clipboardUpdatedAt, setClipboardUpdatedAt] = useState("")

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [totalItems, setTotalItems] = useState(0) // Total d'éléments depuis l'API

  const [showSecurityDialog, setShowSecurityDialog] = useState(false)
  const [clipboardPassword, setClipboardPassword] = useState("")
  const [clipboardExpiration, setClipboardExpiration] = useState("never")
  const [clipboardReadOnly, setClipboardReadOnly] = useState(false)
  const [showStatsDialog, setShowStatsDialog] = useState(false) // Added state for statistics

  // Ref pour le timer de debounce (auto-save après 2 secondes)
  const saveTimerRef = useRef(null)
  // Track recent save to avoid showing notification for our own changes
  const recentSaveRef = useRef(false)
  // Track if a clipboard creation is in progress
  const isCreatingClipboardRef = useRef(false)

  // Socket.io client ref
  const socketRef = useRef(null)
  // Track the clipboard room we joined to leave later
  const joinedClipboardRef = useRef(null)
  // Socket connection state
  const [socketConnected, setSocketConnected] = useState(false)
  // Track if we just received a socket update to avoid reloading from API
  const recentSocketUpdateRef = useRef(false)
  // Track if user is currently typing to avoid overwriting their changes
  const isTypingRef = useRef(false)

  // Date picker state for expiration
  const [expirationDate, setExpirationDate] = useState(null)
  const [expirationTime, setExpirationTime] = useState("23:59")

  // Fonction pour vérifier si le clipboard actuel est vide
  const isCurrentClipboardEmpty = () => {
    const hasText = clipboardText.trim().length > 0
    const hasFiles = uploadedFiles.length > 0
    return !hasText && !hasFiles
  }

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
        // Normaliser l'ID : ajouter .id si seulement user_id existe
        if (currentUser.user_id && !currentUser.id) {
          currentUser.id = currentUser.user_id
        }
        setUser(currentUser)

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
      // Utilisateur connecté : charger depuis l'API avec pagination
      axios
        .get(`${process.env.NEXT_PUBLIC_API_URL}/clipboards?user_id=${currentUser?.id}&page=${currentPage}&limit=${itemsPerPage}`, {
          headers: { Authorization: `Bearer ${currentUser?.access_token}` },
        })
        .then((response) => {
          const backendClipboards = response.data?.data || []
          const total = response.data?.total || backendClipboards.length
          setTotalItems(total)
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
          toast({
            title: "Erreur",
            description: err?.response?.data?.message || "Une erreur est survenue lors du chargement de l'historique",
            variant: "destructive",
          })
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
      setClipboardReadOnly(clipboard.readOnly || false)
      setContentType(clipboard.contentType || "text")
      setUploadedFiles(clipboard.files || [])
      setMarkdownMode(clipboard.markdownMode || false)
      setClipboardCreatedAt(clipboard.createdAt || "")
      setClipboardUpdatedAt(clipboard.updatedAt || "")

      // Load expiration date and time - check expiresAt, expiration, or expireAt
      const expireAtValue = clipboard.expiresAt || clipboard.expiration || clipboard.expireAt
      if (expireAtValue) {
        const expireDate = new Date(expireAtValue)
        setExpirationDate(expireDate)
        setExpirationTime(
          `${expireDate.getHours().toString().padStart(2, '0')}:${expireDate.getMinutes().toString().padStart(2, '0')}`
        )
        setClipboardExpiration(expireAtValue)
      } else {
        setClipboardExpiration("never")
      }
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
        .get(`${process.env.NEXT_PUBLIC_API_URL}/clipboards?user_id=${user?.id}&page=${currentPage}&limit=${itemsPerPage}`, {
          headers: { Authorization: `Bearer ${user?.access_token}` },
        })
        .then((response) => {
          const backendClipboards = response.data?.data || []
          const total = response.data?.total || backendClipboards.length
          setTotalItems(total)
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

          console.log('[loadClipboardHistory] Loaded from API, replacing state with', mappedClipboards.length, 'items')
          setClipboardHistory(mappedClipboards)
        })
        .catch((err) => {
          console.error("Erreur chargement historique:", err)
          toast({
            title: "Erreur",
            description: err?.response?.data?.message || "Une erreur est survenue lors du chargement de l'historique",
            variant: "destructive",
          })
        })
    } else {
      // Invité : charger depuis localStorage
      const history = localStorage.getItem("clipboard_history")
      if (history) {
        setClipboardHistory(JSON.parse(history))
      }
    }
  }

  // Helper pour mapper une entrée backend vers le format frontend
  const mapBackendClip = (clip) => {
    return {
      id: clip._id ? clip._id.toString() : clip.id,
      url: clip._id ? `${window.location.origin}/clip/${clip._id}` : clip.url,
      text: clip.content || clip.text || "",
      title: clip.title || "Sans titre",
      isFavorite: clip.isFavorite || false,
      password: clip.password || "",
      expiration: clip.expireAt || clip.expiration || null,
      readOnly: clip.readOnly || false,
      contentType: "text",
      files: clip.files || [],
      markdownMode: false,
      createdAt: clip.createdAt,
      updatedAt: clip.updatedAt,
      views: clip.visits || clip.views || 0,
      lastViewed: clip.lastViewed || null,
      activeViewers: clip.activeViewers || [],
    }
  }

  // Socket.io client : connexion et listeners
  useEffect(() => {
    try {
      socketRef.current = socketIoClient(process.env.NEXT_PUBLIC_API_URL || window.location.origin)

      socketRef.current.on('connect', () => {
        console.log('socket connected', socketRef.current.id)
        console.log('user at connection time:', user)
        setSocketConnected(true)

        // Rejoindre la room de l'utilisateur pour recevoir toutes les mises à jour de ses clipboards
        // Note: user might not be loaded yet, will join in separate useEffect below
        if (user?.id) {
          console.log('Joining user room at connection:', user.id)
          socketRef.current.emit('joinUser', { userId: user.id })
        } else {
          console.log('User not loaded yet at connection, will join later')
        }
      })

      socketRef.current.on('disconnect', () => {
        console.log('socket disconnected')
        setSocketConnected(false)
      })

      // Log ALL socket events for debugging
      socketRef.current.onAny((eventName, ...args) => {
        console.log(`[Socket Event Received] ${eventName}`, args)
      })

      socketRef.current.on('clipboard:update', (payload) => {
        console.log('[clipboard:update] Received payload:', payload)
        const clip = payload?.data || payload
        console.log('[clipboard:update] Parsed clip:', clip)
        const mapped = mapBackendClip(clip)
        console.log('[clipboard:update] Mapped clip:', mapped)

        // Mark that we received a socket update
        recentSocketUpdateRef.current = true
        // Reset the flag after a short delay
        setTimeout(() => {
          recentSocketUpdateRef.current = false
        }, 1000)

        // Silent update - no notification needed
        setClipboardHistory((prev) => {
          console.log('[clipboard:update] Current history length:', prev.length)
          const exists = prev.some((c) => c.id === mapped.id)
          console.log('[clipboard:update] Clipboard exists in history:', exists)
          if (exists) {
            // Find the existing item
            const existingItem = prev.find((c) => c.id === mapped.id)
            console.log('[clipboard:update] OLD item text:', existingItem?.text?.substring(0, 50))
            console.log('[clipboard:update] NEW item text:', mapped.text?.substring(0, 50))
            console.log('[clipboard:update] Text changed?', existingItem?.text !== mapped.text)

            // Mettre à jour le clipboard existant - ALWAYS create new array
            const updated = prev.map((c) => (c.id === mapped.id ? { ...mapped } : c))
            console.log('[clipboard:update] Updated history - new array:', updated !== prev)
            return updated
          } else {
            // Ajouter le nouveau clipboard au début de l'historique
            console.log('[clipboard:update] Adding new clipboard to history')
            return [mapped, ...prev]
          }
        })

        // If currently joined to that clipboard, update the editor state
        if (joinedClipboardRef.current && joinedClipboardRef.current === mapped.id) {
          console.log('[clipboard:update] Updating editor for joined clipboard')

          // Ne pas écraser le texte si l'utilisateur est en train de taper
          if (!isTypingRef.current) {
            setClipboardText(mapped.text)
          } else {
            console.log('[clipboard:update] User is typing, skipping text update')
          }

          setClipboardTitle(mapped.title)
          setUploadedFiles(mapped.files || [])
          setClipboardPassword(mapped.password || "")
          setClipboardReadOnly(mapped.readOnly || false)
          setClipboardCreatedAt(mapped.createdAt || "")
          setClipboardUpdatedAt(mapped.updatedAt || "")

          // Update expiration date and time
          if (mapped.expiration) {
            const expireDate = new Date(mapped.expiration)
            setExpirationDate(expireDate)
            setExpirationTime(
              `${expireDate.getHours().toString().padStart(2, '0')}:${expireDate.getMinutes().toString().padStart(2, '0')}`
            )
            setClipboardExpiration(mapped.expiration)
          } else {
            setExpirationDate(null)
            setExpirationTime("23:59")
            setClipboardExpiration("never")
          }
        }
      })

      socketRef.current.on('clipboard:deleted', (payload) => {
        const clipboardId = payload?.clipboardId || payload
        setClipboardHistory((prev) => prev.filter((c) => c.id !== clipboardId))
        if (joinedClipboardRef.current === clipboardId) {
          setClipboardText("")
          setClipboardTitle("")
          setCurrentClipboardId("")
          setUploadedFiles([])
        }
      })

      socketRef.current.on('clipboard:viewers', (data) => {
        console.log('[Dashboard clipboard:viewers] Received data:', data)
        const { clipboardId, active, totalViews } = data || {}
        setClipboardHistory((prev) =>
          prev.map((c) => {
            if (c.id === clipboardId) {
              console.log('[Dashboard clipboard:viewers] Updating clipboard:', clipboardId, 'active:', active)
              return {
                ...c,
                views: totalViews != null ? totalViews : c.views,
                // create placeholder active viewers array so UI can display a count
                activeViewers: Array.from({ length: active || 0 }).map((_, i) => ({ name: `${generateViewerName()}`, gradient: randomGradient() })),
              }
            }
            return c
          })
        )
      })
    } catch (err) {
      console.error('Socket init error', err)
    }

    return () => {
      try {
        if (socketRef.current) {
          // Quitter la room du clipboard actuel si rejoint
          if (joinedClipboardRef.current) {
            socketRef.current.emit('leaveClipboard', { clipboardId: joinedClipboardRef.current })
            joinedClipboardRef.current = null
          }
          // Quitter la room utilisateur
          if (user?.id) {
            socketRef.current.emit('leaveUser', { userId: user.id })
          }
          socketRef.current.disconnect()
        }
      } catch (err) {
        console.error('Socket cleanup error', err)
      }
    }
  }, [user])

  // Rejoindre la room utilisateur quand user est chargé et socket est connecté
  useEffect(() => {
    console.log('[joinUser Effect] user:', user?.id, 'socketConnected:', socketConnected, 'socketRef:', !!socketRef.current)
    if (socketRef.current && socketConnected && user?.id) {
      console.log('User loaded, joining user room:', user.id)
      socketRef.current.emit('joinUser', { userId: user.id })
    }
  }, [user, socketConnected])

  // Fonction pour sauvegarder automatiquement après 2 secondes de pause
  const debouncedSave = useCallback(() => {
    // Indiquer que des modifications sont en attente de synchronisation
    setIsSynch(false)

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }

    saveTimerRef.current = setTimeout(() => {
      const savedClipboard = localStorage.getItem("current_clipboard")
      if (savedClipboard) {
        const clipboard = JSON.parse(savedClipboard)
        saveToHistory(clipboard)
        // Une fois sauvegardé sur le serveur, marquer comme synchronisé
        setIsSynch(true)
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
          const createdAt = saved?.createdAt || new Date().toISOString()
          const updatedAt = saved?.updatedAt || new Date().toISOString()

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
          setClipboardCreatedAt(createdAt)
          setClipboardUpdatedAt(updatedAt)

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
            createdAt: createdAt,
            updatedAt: updatedAt,
            views: saved?.visits || 0,
            lastViewed: null,
            activeViewers: [],
          }

          localStorage.setItem("current_clipboard", JSON.stringify(clipboard))
          loadClipboardHistory()

          // Join socket room for the newly created clipboard
          try {
            if (socketRef.current && id) {
              // leave previous if any
              if (joinedClipboardRef.current && joinedClipboardRef.current !== id) {
                socketRef.current.emit('leaveClipboard', { clipboardId: joinedClipboardRef.current })
              }
              socketRef.current.emit('joinClipboard', { clipboardId: id })
              joinedClipboardRef.current = id
            }
          } catch (err) {
            console.error('Socket join error after create', err)
          }

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
      // Invité : créer sur le serveur SANS authentification
      const payload = {
        title: "Sans titre",
        content: "",
        files: [],
        password: null,
        expireAt: null,
        readOnly: false,
      }

      axios
        .post(`${process.env.NEXT_PUBLIC_API_URL}/clipboards`, payload)
        .then((response) => {
          const saved = response.data?.data || response.data
          const id = saved?._id
          const url = `${window.location.origin}/clip/${id}`
          const createdAt = saved?.createdAt || new Date().toISOString()
          const updatedAt = saved?.updatedAt || new Date().toISOString()

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
          setClipboardCreatedAt(createdAt)
          setClipboardUpdatedAt(updatedAt)

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
            createdAt: createdAt,
            updatedAt: updatedAt,
            views: saved?.visits || 0,
            lastViewed: null,
            activeViewers: [],
          }

          localStorage.setItem("current_clipboard", JSON.stringify(clipboard))

          const history = localStorage.getItem("clipboard_history")
          const historyArray = history ? JSON.parse(history) : []
          historyArray.unshift(clipboard)
          localStorage.setItem("clipboard_history", JSON.stringify(historyArray))
          setClipboardHistory(historyArray)

          // Join socket room for the newly created clipboard (guest flow)
          try {
            if (socketRef.current && id) {
              if (joinedClipboardRef.current && joinedClipboardRef.current !== id) {
                socketRef.current.emit('leaveClipboard', { clipboardId: joinedClipboardRef.current })
              }
              socketRef.current.emit('joinClipboard', { clipboardId: id })
              joinedClipboardRef.current = id
            }
          } catch (err) {
            console.error('Socket join error after create (guest)', err)
          }

          toast({
            title: "Nouveau clipboard créé",
            description: "Connectez-vous pour accéder à tous vos clipboards",
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
    }
  }

  const saveToHistory = (clipboard) => {
    // Vérifier si c'est un clipboard local (créé par un invité ou avec préfixe local_)
    // OU si l'ID n'est pas un ObjectId valide (pas 24 caractères hexadécimaux)
    // OU si l'ID est null (clipboard temporaire)
    const isLocalClipboard = !clipboard.id || clipboard.id.startsWith("local_") || !/^[a-f0-9]{24}$/i.test(clipboard.id)

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
      const config = user ? {
        headers: { Authorization: `Bearer ${user?.access_token}` },
      } : {}

      axios
        .post(`${process.env.NEXT_PUBLIC_API_URL}/clipboards`, payload, config)
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

          if (user) {
            loadClipboardHistory()
          }
        })
        .catch((err) => {
          console.error("Erreur création clipboard:", err)
        })
      return // Important: sortir ici pour ne pas continuer
    }

    // Clipboard avec ID valide : MISE À JOUR sur le serveur (invité ou connecté)
    const payload = {
      title: clipboard.title || "Sans titre",
      content: clipboard.text || "",
      files: clipboard.files || [], // Les fichiers font partie du contenu, pas de la sécurité
      _id: clipboard.id,
    }

    // Si l'utilisateur est connecté ou si c'est son clipboard (sans propriétaire),
    // on envoie aussi les champs de sécurité
    if (user || !clipboard.owner) {
      payload.password = clipboard.password || null
      payload.expireAt = clipboard.expiresAt || null
      payload.readOnly = clipboard.readOnly || false
    }

    // MISE À JOUR : _id en query parameter ET dans le body
    const updateUrl = `${process.env.NEXT_PUBLIC_API_URL}/clipboards?_id=${clipboard.id}`
    const config = user ? {
      headers: { Authorization: `Bearer ${user?.access_token}` },
    } : {}

    axios
      .post(updateUrl, payload, config)
      .then((response) => {
        if (user) {
          // Si connecté, recharger depuis le serveur
          loadClipboardHistory()
        } else {
          // Si invité, mettre à jour localStorage
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
      })
      .catch((err) => {
        console.error("Erreur mise à jour clipboard:", err)
        localStorage.removeItem("current_clipboard")
        toast({
          title: "Erreur",
          description: err?.response?.data?.message || "Une erreur est survenue lors de la sauvegarde",
          variant: "destructive",
        })
      })
  }

  function generateViewerName() {
    const adjectives = ["Curious", "Silent", "Anonymous", "Stealthy", "Inquisitive", "Wandering", "Observant", "Quiet", "Cautious", "Watchful", "Sly", "Clever", "Swift", "Brave", "Fierce", "Nimble", "Wise", "Bold"]
    const nouns = ["Fox", "Owl", "Cat", "Wolf", "Eagle", "Hawk", "Tiger", "Panther", "Lion", "Bear", "Shark", "Dolphin", "Raven", "Dragon", "Griffin", "Unicorn", "Phoenix", "Leopard", "Cheetah", "Jaguar", "Cougar"]
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
    const noun = nouns[Math.floor(Math.random() * nouns.length)]
    return `${adjective} ${noun}`
  }

  function randomGradient() {
    const colors = [
      'from-pink-500 to-yellow-500',
      'from-purple-500 to-indigo-500',
      'from-green-400 to-blue-500',
      'from-red-400 to-pink-500',
      'from-yellow-400 to-red-500',
      'from-blue-400 to-purple-500',
      'from-teal-400 to-cyan-500',
      'from-gray-400 to-black',
      'from-indigo-400 to-purple-500',
      'from-emerald-400 to-teal-500',
      'from-rose-400 to-pink-500',
      'from-fuchsia-400 to-purple-500',
      'from-violet-400 to-indigo-500',
      'from-sky-400 to-blue-500',
      'from-lime-400 to-green-500',
      'from-amber-400 to-yellow-500',
      'from-cyan-400 to-sky-500',
      'from-pink-400 to-rose-500',
      'from-purple-400 to-fuchsia-500',
      'from-blue-400 to-indigo-500',
      'from-green-400 to-emerald-500',
      'from-red-400 to-amber-500',
    ]
    return colors[Math.floor(Math.random() * colors.length)]
  }


  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files)

    // Si on a un clipboard avec ID valide (pas local_), utiliser l'API de upload
    if (currentClipboardId && !currentClipboardId.startsWith("local_") && /^[a-f0-9]{24}$/i.test(currentClipboardId)) {
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
            `${process.env.NEXT_PUBLIC_API_URL}/clipboards/file?clipboardId=${currentClipboardId}`,
            formData,
            config
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
            description: error.response?.data?.message || `Impossible de télécharger ${file.name}`,
            variant: "destructive",
          })
        }
      }
      if (user) {
        loadClipboardHistory()
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
      clipboard.readOnly = clipboardReadOnly
      clipboard.updatedAt = new Date().toISOString()

      // Calculate expireAt from date + time picker
      if (expirationDate) {
        const [hours, minutes] = expirationTime.split(':')
        const expireDateTime = new Date(expirationDate)
        expireDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)
        clipboard.expiresAt = expireDateTime.toISOString()
        clipboard.expiration = expireDateTime.toISOString()
        setClipboardExpiration(expireDateTime.toISOString())
      } else {
        clipboard.expiresAt = null
        clipboard.expiration = null
        setClipboardExpiration("never")
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
      const newUpdatedAt = new Date().toISOString()
      clipboard.updatedAt = newUpdatedAt
      setClipboardUpdatedAt(newUpdatedAt)
      localStorage.setItem("current_clipboard", JSON.stringify(clipboard))

      // AUTO-SAVE après 2 secondes
      debouncedSave()
    }
  }

  const handleTextChange = (e) => {
    const newText = e.target.value
    setClipboardText(newText)

    // Marquer que l'utilisateur est en train de taper
    isTypingRef.current = true

    // Réinitialiser après 3 secondes d'inactivité
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }

    const typingTimeout = setTimeout(() => {
      isTypingRef.current = false
    }, 3000)

    const savedClipboard = localStorage.getItem("current_clipboard")

    if (savedClipboard) {
      // Clipboard existe déjà : mise à jour localStorage et debounce
      const clipboard = JSON.parse(savedClipboard)
      clipboard.text = newText
      clipboard.markdownMode = markdownMode
      const newUpdatedAt = new Date().toISOString()
      clipboard.updatedAt = newUpdatedAt
      setClipboardUpdatedAt(newUpdatedAt)
      localStorage.setItem("current_clipboard", JSON.stringify(clipboard))

      // AUTO-SAVE après 2 secondes
      debouncedSave()
    } else if (!currentClipboardId) {
      // Créer un clipboard local temporaire
      const createdAt = new Date().toISOString()
      const clipboard = {
        id: null, // Sera défini après création sur le serveur
        url: null,
        text: newText,
        title: clipboardTitle || "Sans titre",
        isFavorite: false,
        password: "",
        expiration: null,
        readOnly: false,
        contentType: "text",
        files: [],
        markdownMode: markdownMode,
        createdAt: createdAt,
        updatedAt: createdAt,
        views: 0,
        lastViewed: null,
        activeViewers: [],
      }

      localStorage.setItem("current_clipboard", JSON.stringify(clipboard))
      setClipboardCreatedAt(createdAt)
      setClipboardUpdatedAt(createdAt)

      // AUTO-SAVE après 2 secondes (créera sur le serveur)
      debouncedSave()
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

  const handleToggleFavorite = async (clipboardId) => {
    // Si clipboard backend (ObjectId valide), utiliser l'API (connecté ou invité)
    if (/^[a-f0-9]{24}$/i.test(clipboardId)) {
      try {
        const config = user ? {
          headers: { Authorization: `Bearer ${user.access_token}` },
        } : {}

        const response = await axios.patch(
          `${process.env.NEXT_PUBLIC_API_URL}/clipboards/${clipboardId}/favorite`,
          {},
          config
        )

        const updatedClipboard = response.data?.data || response.data

        toast({
          title: updatedClipboard.isFavorite ? "Ajouté aux favoris" : "Retiré des favoris",
          description: response.data?.message || (updatedClipboard.isFavorite
            ? "Ce clipboard est maintenant dans vos favoris"
            : "Ce clipboard a été retiré de vos favoris"),
        })

        // Recharger l'historique pour refléter le changement
        if (user) {
          loadClipboardHistory()
        } else {
          // Pour les invités, mettre à jour localStorage
          const history = localStorage.getItem("clipboard_history")
          if (history) {
            const historyArray = JSON.parse(history)
            const clipboardIndex = historyArray.findIndex((item) => item.id === clipboardId)

            if (clipboardIndex !== -1) {
              historyArray[clipboardIndex].isFavorite = updatedClipboard.isFavorite
              localStorage.setItem("clipboard_history", JSON.stringify(historyArray))
              setClipboardHistory(historyArray)

              if (clipboardId === currentClipboardId) {
                const savedClipboard = localStorage.getItem("current_clipboard")
                if (savedClipboard) {
                  const clipboard = JSON.parse(savedClipboard)
                  clipboard.isFavorite = updatedClipboard.isFavorite
                  localStorage.setItem("current_clipboard", JSON.stringify(clipboard))
                }
              }
            }
          }
        }
      } catch (error) {
        console.error("Erreur toggle favorite:", error)
        toast({
          title: "Erreur",
          description: "Impossible de mettre à jour le statut favori",
          variant: "destructive",
        })
      }
    } else {
      // Clipboard local (ne devrait plus arriver) : utiliser localStorage uniquement
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
  }

  const handleLoadClipboard = (clipboard) => {
    setClipboardText(clipboard.text || "")
    setClipboardUrl(clipboard.url || "")
    setCurrentClipboardId(clipboard.id || "")
    setClipboardTitle(clipboard.title || "")
    setClipboardPassword(clipboard.password || "")
    setClipboardReadOnly(clipboard.readOnly || false)
    setContentType(clipboard.contentType || "text")
    setUploadedFiles(clipboard.files || [])
    setMarkdownMode(clipboard.markdownMode || false)
    setClipboardCreatedAt(clipboard.createdAt || "")
    setClipboardUpdatedAt(clipboard.updatedAt || "")

    // Load expiration date and time - check expiresAt, expiration, or expireAt
    const expireAtValue = clipboard.expiresAt || clipboard.expiration || clipboard.expireAt
    if (expireAtValue) {
      const expireDate = new Date(expireAtValue)
      setExpirationDate(expireDate)
      setExpirationTime(
        `${expireDate.getHours().toString().padStart(2, '0')}:${expireDate.getMinutes().toString().padStart(2, '0')}`
      )
      setClipboardExpiration(expireAtValue)
    } else {
      setExpirationDate(null)
      setExpirationTime("23:59")
      setClipboardExpiration("never")
    }

    localStorage.setItem("current_clipboard", JSON.stringify(clipboard))
    // Manage socket rooms: leave previous clipboard room and join the new one
    try {
      const prev = joinedClipboardRef.current
      const newId = clipboard.id || (clipboard._id ? clipboard._id.toString() : null)
      if (socketRef.current) {
        if (prev && prev !== newId) {
          socketRef.current.emit('leaveClipboard', { clipboardId: prev })
        }
        if (newId) {
          socketRef.current.emit('joinClipboard', { clipboardId: newId })
          joinedClipboardRef.current = newId
        }
      }
    } catch (err) {
      console.error('Error managing socket room on load', err)
    }

    setShowHistory(false)

    // toast({
    //   title: "Clipboard chargé",
    //   description: "Le clipboard a été chargé avec succès",
    // })
  }

  const handleDeleteClipboard = async (clipboardId) => {
    // Vérifier si c'est un clipboard avec ID valide (pas local_)
    if (clipboardId && !clipboardId.startsWith("local_") && /^[a-f0-9]{24}$/i.test(clipboardId)) {
      // Clipboard backend : supprimer via API
      try {
        const config = user ? {
          headers: { Authorization: `Bearer ${user.access_token}` },
        } : {}

        await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/clipboards/${clipboardId}`, config).catch((err) => {
          toast({
            title: "Erreur",
            description: err?.response?.data?.message || "Impossible de supprimer le clipboard",
            variant: "destructive",
          })
          return;
        })

        // Le supprimer aussi dans l'historique local si présent
        const history = localStorage.getItem("clipboard_history")
        if (history) {
          let historyArray = JSON.parse(history)
          historyArray = historyArray.filter((item) => item.id !== clipboardId)
          localStorage.setItem("clipboard_history", JSON.stringify(historyArray))
        }

        // Mettre à jour l'interface
        setClipboardHistory((prev) => prev.filter((item) => item.id !== clipboardId))

        // Si c'est le clipboard actuel, en créer un nouveau
        if (clipboardId === currentClipboardId) {
          generateNewClipboard()
        }

        // Quitter la room socket si on était dedans
        try {
          if (socketRef.current && joinedClipboardRef.current === clipboardId) {
            socketRef.current.emit('leaveClipboard', { clipboardId })
            joinedClipboardRef.current = null
          }
        } catch (err) {
          console.error('Error leaving clipboard room on delete', err)
        }

        toast({
          title: "Clipboard supprimé",
          description: "Le clipboard et ses fichiers ont été supprimés définitivement",
        })

        // Recharger l'historique si connecté
        if (user) {
          loadClipboardHistory()
        }
      } catch (error) {
        console.error("Erreur suppression clipboard:", error)
        toast({
          title: "Erreur",
          description: error.response?.data?.message || "Impossible de supprimer le clipboard",
          variant: "destructive",
        })
      }
    } else {
      // Clipboard local : supprimer uniquement du localStorage
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
          description: "Le clipboard a été supprimé de l'historique local",
        })
      }
    }
  }

  const handleCopyUrl = async () => {
    try {
      // Vérifier si l'API Clipboard est disponible
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(clipboardUrl)
        setCopied(true)
        toast({
          title: "URL copiée",
          description: "L'URL a été copiée dans votre clipboard",
        })
        setTimeout(() => setCopied(false), 2000)
      } else {
        // Fallback pour navigateurs anciens ou contextes non sécurisés
        const textArea = document.createElement("textarea")
        textArea.value = clipboardUrl
        textArea.style.position = "fixed"
        textArea.style.left = "-999999px"
        textArea.style.top = "-999999px"
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()

        try {
          document.execCommand('copy')
          setCopied(true)
          toast({
            title: "URL copiée",
            description: "L'URL a été copiée dans votre clipboard",
          })
          setTimeout(() => setCopied(false), 2000)
        } catch (err) {
          console.error("Erreur execCommand:", err)
          toast({
            title: "Erreur",
            description: "Impossible de copier l'URL. Veuillez la copier manuellement.",
            variant: "destructive",
          })
        } finally {
          document.body.removeChild(textArea)
        }
      }
    } catch (err) {
      console.error("Erreur copie URL:", err)
      toast({
        title: "Erreur",
        description: "Impossible de copier l'URL. Veuillez la copier manuellement.",
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
    localStorage.removeItem("current_clipboard")

    // Recharger l'historique depuis localStorage (données locales)
    const history = localStorage.getItem("clipboard_history")
    if (history) {
      setClipboardHistory(JSON.parse(history))
    } else {
      setClipboardHistory([])
    }

    // Leave socket room if any
    try {
      if (socketRef.current && joinedClipboardRef.current) {
        socketRef.current.emit('leaveClipboard', { clipboardId: joinedClipboardRef.current })
        joinedClipboardRef.current = null
      }
    } catch (err) {
      console.error('Socket leave error on logout', err)
    }

    toast({
      title: "Déconnexion réussie",
      description: <span className="text-muted-foreground text-red-600">Vous êtes maintenant en mode invité</span>,
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

  // Pagination logic - différent pour API vs localStorage
  let totalPages, currentClipboards, displayTotal

  if (!isGuest && user) {
    // Utilisateur connecté : pagination côté serveur
    totalPages = Math.ceil(totalItems / itemsPerPage)
    currentClipboards = filteredClipboards // L'API renvoie déjà la page demandée
    displayTotal = totalItems
  } else {
    // Invité : pagination côté client
    totalPages = Math.ceil(filteredClipboards.length / itemsPerPage)
    const indexOfLastItem = currentPage * itemsPerPage
    const indexOfFirstItem = indexOfLastItem - itemsPerPage
    currentClipboards = filteredClipboards.slice(indexOfFirstItem, indexOfLastItem)
    displayTotal = filteredClipboards.length
  }

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterFavorites])

  // Reload data when page changes for connected users
  useEffect(() => {
    if (!isGuest && user) {
      // Don't reload if we just received a socket update
      if (recentSocketUpdateRef.current) {
        console.log('[Pagination useEffect] Skipping reload - recent socket update')
        recentSocketUpdateRef.current = false
        return
      }
      console.log('[Pagination useEffect] Loading page', currentPage)
      loadClipboardHistory()
    }
  }, [currentPage])

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber)
  }

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
      // Vérifier si l'API Clipboard est disponible
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(clipboardText)
        toast({
          title: "Contenu copié",
          description: "Le texte a été copié dans votre presse-papier",
        })
      } else {
        // Fallback pour navigateurs anciens ou contextes non sécurisés
        const textArea = document.createElement("textarea")
        textArea.value = clipboardText
        textArea.style.position = "fixed"
        textArea.style.left = "-999999px"
        textArea.style.top = "-999999px"
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()

        try {
          document.execCommand('copy')
          toast({
            title: "Contenu copié",
            description: "Le texte a été copié dans votre presse-papier",
          })
        } catch (err) {
          console.error("Erreur execCommand:", err)
          toast({
            title: "Erreur",
            description: "Impossible de copier le contenu. Veuillez le copier manuellement.",
            variant: "destructive",
          })
        } finally {
          document.body.removeChild(textArea)
        }
      }
    } catch (err) {
      console.error("Erreur copie contenu:", err)
      toast({
        title: "Erreur",
        description: "Impossible de copier le contenu. Veuillez le copier manuellement.",
        variant: "destructive",
      })
    }
  }

  // Function to get clipboard stats - now uses state instead of localStorage for real-time updates
  const getClipboardStats = (clipboardId) => {
    // Vérifier que nous sommes côté client
    if (typeof window === "undefined") {
      return null
    }

    // Chercher dans clipboardHistory (state) pour obtenir les stats en temps réel
    const clipboard = clipboardHistory.find((item) => item.id === clipboardId)
    if (clipboard) {
      return {
        views: clipboard.views || 0,
        lastViewed: clipboard.lastViewed,
        activeViewers: clipboard.activeViewers || [],
        createdAt: clipboard.createdAt,
        updatedAt: clipboard.updatedAt,
      }
    }

    // Fallback: vérifier le clipboard actuel dans localStorage
    const currentClipboard = localStorage.getItem("current_clipboard")
    if (currentClipboard) {
      const clip = JSON.parse(currentClipboard)
      if (clip.id === clipboardId) {
        return {
          views: clip.views || 0,
          lastViewed: clip.lastViewed,
          activeViewers: clip.activeViewers || [],
          createdAt: clip.createdAt,
          updatedAt: clip.updatedAt,
        }
      }
    }
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="rounded-xl flex items-center justify-center">
                <img src="logo.png" alt="ClipShare" width={70} height={70} />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold">ClipShare</h1>
                <p className={"text-xs text-muted-foreground hidden sm:block" + (isGuest ? " text-red-600" : "")}>
                  {isGuest ? "Mode invité" : `Bienvenue, ${user.username.split("@")[0]}`}
                </p>
              </div>
            </div>

            {/* Desktop buttons */}
            <div className="hidden md:flex gap-2">
              <ThemeToggle />
              <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)}>
                <History className="h-4 w-4 mr-2" />
                Historique ({displayTotal})
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
                    <SheetDescription className={isGuest ? "text-red-600" : ""}>{isGuest ? "Mode invité" : `Bienvenue, ${user.username.split("@")[0]}`}</SheetDescription>
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
                      Historique ({displayTotal})
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
                <p className={"text-sm font-medium mb-1" + (isGuest ? " text-red-600" : "")}>Mode invité</p>
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
                    <CardTitle className="text-lg md:text-xl">
                      Historique des Clipboards ({displayTotal})
                    </CardTitle>
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
                    {currentClipboards.map((clipboard) => (
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
                              {clipboard?.isFavorite && (
                                <Star className="h-4 w-4 shrink-0 star-favorite" />
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
                              {clipboard.activeViewers && clipboard.activeViewers.length > 0 && (
                                <span className="ml-2 text-green-600">
                                  • {clipboard.activeViewers.length - 1} en ligne
                                </span>
                              )}
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
                              title={clipboard.isFavorite === true ? "Retirer des favoris" : "Ajouter aux favoris"}
                            >
                              {clipboard.isFavorite === true ? (
                                <Star className="h-4 w-4 star-favorite" />
                              ) : (
                                <Star className="h-4 w-4" />
                              )}
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

                {/* Pagination */}
                {displayTotal > itemsPerPage && (
                  <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
                    <div className="text-sm text-muted-foreground">
                      Page {currentPage} sur {totalPages} ({displayTotal} élément{displayTotal > 1 ? 's' : ''})
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span className="hidden sm:inline ml-1">Précédent</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        <span className="hidden sm:inline mr-1">Suivant</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
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
                                Date d'expiration
                              </Label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    id="expiration"
                                    variant="outline"
                                    className="w-full justify-start text-left font-normal"
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {expirationDate ? (
                                      new Date(expirationDate).toLocaleDateString("fr-FR", {
                                        day: "2-digit",
                                        month: "long",
                                        year: "numeric",
                                      })
                                    ) : (
                                      <span className="text-muted-foreground">Pas d'expiration</span>
                                    )}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={expirationDate}
                                    onSelect={setExpirationDate}
                                    // disabled={
                                    //   (date) => date < new Date()
                                    // }
                                    initialFocus
                                  />
                                  {expirationDate && (
                                    <div className="p-3 border-t">
                                      <Label htmlFor="time" className="text-xs mb-1 block">
                                        Heure
                                      </Label>
                                      <Input
                                        id="time"
                                        type="time"
                                        value={expirationTime}
                                        onChange={(e) => setExpirationTime(e.target.value)}
                                        className="w-full"
                                      />
                                      <div className="flex gap-2 mt-2">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="flex-1"
                                          onClick={() => {
                                            setExpirationDate(null)
                                            setExpirationTime("23:59")
                                          }}
                                        >
                                          <X className="h-3 w-3 mr-1" />
                                          Effacer
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </PopoverContent>
                              </Popover>
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
                        disabled={isCurrentClipboardEmpty()}
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
                      {editorMode === "rich" ? (
                        <RichTextEditor
                          content={clipboardText}
                          onChange={(html) => {
                            // Marquer que l'utilisateur est en train de taper
                            isTypingRef.current = true

                            // Réinitialiser après 3 secondes d'inactivité
                            setTimeout(() => {
                              isTypingRef.current = false
                            }, 3000)

                            setClipboardText(html)
                            const savedClipboard = localStorage.getItem("current_clipboard")

                            if (savedClipboard) {
                              const clipboard = JSON.parse(savedClipboard)
                              clipboard.text = html
                              const newUpdatedAt = new Date().toISOString()
                              clipboard.updatedAt = newUpdatedAt
                              setClipboardUpdatedAt(newUpdatedAt)
                              localStorage.setItem("current_clipboard", JSON.stringify(clipboard))
                              debouncedSave()
                            } else if (!currentClipboardId) {
                              // Créer un clipboard local temporaire
                              const createdAt = new Date().toISOString()
                              const clipboard = {
                                id: null, // Sera défini après création sur le serveur
                                url: null,
                                text: html,
                                title: clipboardTitle || "Sans titre",
                                isFavorite: false,
                                password: "",
                                expiration: null,
                                readOnly: false,
                                contentType: "text",
                                files: [],
                                markdownMode: false,
                                createdAt: createdAt,
                                updatedAt: createdAt,
                                views: 0,
                                lastViewed: null,
                                activeViewers: [],
                              }

                              localStorage.setItem("current_clipboard", JSON.stringify(clipboard))
                              setClipboardCreatedAt(createdAt)
                              setClipboardUpdatedAt(createdAt)

                              // AUTO-SAVE après 2 secondes (créera sur le serveur)
                              debouncedSave()
                            }
                          }}
                          placeholder="Commencez à taper ou collez votre texte ici..."
                        />
                      ) : editorMode === "markdown" ? (
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
                            Expire le {formatDate(clipboardExpiration)}
                          </span>
                        )}
                      </div>
                      <span className="flex items-center gap-2">
                        <span className={"h-2 w-2 rounded-full animate-pulse " + (isSynch ? "bg-green-500" : "bg-orange-500")} />
                        {isSynch ? "Synchronisé" : "Non synchronisé"}
                      </span>
                      {socketConnected && (
                        <span className="flex items-center gap-2 text-green-600">
                          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                          Temps réel actif
                        </span>
                      )}
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
                        {clipboardCreatedAt ? formatDate(clipboardCreatedAt) : "N/A"}
                      </span>
                    </div>
                    {clipboardUpdatedAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Modifié le</span>
                        <span className="text-xs">{formatDate(clipboardUpdatedAt)}</span>
                      </div>
                    )}
                  </div>
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground flex items-center gap-2">
                        Viewers actifs
                        {getClipboardStats(currentClipboardId)?.activeViewers?.length > 0 && (
                          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        )}
                      </span>
                      <span className="text-sm font-semibold text-green-600">
                        {getClipboardStats(currentClipboardId)?.activeViewers?.length || 0}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {getClipboardStats(currentClipboardId)?.activeViewers?.length > 0 ? (
                        getClipboardStats(currentClipboardId).activeViewers.map((viewer, index) => (
                          <div
                            key={index}
                            className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold bg-gradient-to-br ${viewer.gradient || 'from-blue-500 to-purple-500'} text-white shadow-md`}
                            title={viewer.name || `${generateViewerName()}`}
                          >
                            {(viewer.name || `${generateViewerName()}`).charAt(0).toUpperCase()}
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
