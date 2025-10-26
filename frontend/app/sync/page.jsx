"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { Clipboard, Loader2, Check, X, CloudUpload } from "lucide-react"
import { decryptData } from "@/hooks/functions"
import axios from "axios"

export default function SyncPage() {
    const router = useRouter()
    const { toast } = useToast()
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(false)
    const [localClipboards, setLocalClipboards] = useState([])
    const [wantToSync, setWantToSync] = useState(true)

    useEffect(() => {
        // Vérifier si l'utilisateur est connecté
        const userData = localStorage.getItem("clipshare_user")
        if (!userData) {
            router.push("/login")
            return
        }

        const loadClipboards = async () => {
            try {
                const decryptedData = decryptData(userData)
                if (!decryptedData) {
                    router.push("/login")
                    return
                }
                const currentUser = JSON.parse(decryptedData)
                setUser(currentUser)

                // Charger les clipboards locaux
                const history = localStorage.getItem("clipboard_history")
                if (history) {
                    const clipboards = JSON.parse(history)
                    console.log("📋 Clipboards locaux:", clipboards)

                    // Filtrer pour ne garder que les IDs valides
                    const clipboardIds = clipboards
                        .filter(clip => clip.id && !clip.id.startsWith("local_") && /^[a-f0-9]{24}$/i.test(clip.id))
                        .map(clip => clip.id)

                    console.log("🔍 IDs à vérifier:", clipboardIds)

                    if (clipboardIds.length === 0) {
                        console.log("➡️ Aucun ID valide, redirection vers dashboard")
                        router.push("/dashboard")
                        return
                    }

                    // Demander au serveur quels clipboards peuvent être synchronisés
                    try {
                        const response = await axios.post(
                            `${process.env.NEXT_PUBLIC_API_URL}/clipboards/sync/check`,
                            { clipboardIds },
                            {
                                headers: { Authorization: `Bearer ${currentUser?.access_token}` },
                            }
                        )
                        const syncableIds = response.data?.data || []
                        console.log("✅ Clipboards synchronisables:", syncableIds)

                        // Filtrer les clipboards locaux pour ne garder que ceux qui sont synchronisables
                        const validClipboards = clipboards.filter(clip => syncableIds.includes(clip.id))

                        console.log("📊 Clipboards à afficher:", validClipboards)
                        setLocalClipboards(validClipboards)

                        // Si aucun clipboard à synchroniser, rediriger vers le dashboard
                        if (validClipboards.length === 0) {
                            console.log("➡️ Aucun clipboard à synchroniser, redirection vers dashboard")
                            router.push("/dashboard")
                        }
                    } catch (error) {
                        console.error("❌ Erreur vérification clipboards:", error)
                        // En cas d'erreur, rediriger vers le dashboard
                        router.push("/dashboard")
                    }
                }
            } catch (error) {
                console.error("Error loading user data:", error)
                router.push("/login")
            }
        }

        loadClipboards()
    }, [router])

    const handleSync = async () => {
        if (!wantToSync || localClipboards.length === 0) {
            // Ne pas synchroniser, aller directement au dashboard
            router.push("/dashboard")
            return
        }

        setLoading(true)

        try {
            // Récupérer tous les IDs des clipboards locaux
            const clipboardIds = localClipboards.map(clip => clip.id)

            if (clipboardIds.length === 0) {
                router.push("/dashboard")
                return
            }

            // Appeler l'API de synchronisation
            await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/clipboards/sync`,
                { clipboardIds },
                {
                    headers: { Authorization: `Bearer ${user?.access_token}` },
                }
            )

            toast({
                title: "Synchronisation réussie",
                description: `${clipboardIds.length} clipboard(s) synchronisé(s) avec succès`,
            })

            // Vider le clipboard local après synchronisation
            localStorage.setItem("clipboard_history", JSON.stringify([]))

            // Rediriger vers le dashboard
            router.push("/dashboard")
        } catch (error) {
            console.error("Error syncing clipboards:", error)
            toast({
                title: "Erreur de synchronisation",
                description: error.response?.data?.message || "Une erreur est survenue lors de la synchronisation",
                variant: "destructive",
            })
            setLoading(false)
        }
    }

    const handleSkip = () => {
        router.push("/dashboard")
    }

    if (!user) {
        return null
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center space-y-2">
                    <div className="flex justify-center mb-4">
                        <div className="h-16 w-16 rounded-2xl flex items-center justify-center">
                            <img src="logo.png" alt="ClipShare" width={70} height={70} />
                        </div>
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight text-balance">Synchronisation</h1>
                    <p className="text-muted-foreground text-pretty">
                        Synchronisez vos clipboards locaux avec votre compte
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Clipboards locaux détectés</CardTitle>
                        <CardDescription>
                            {localClipboards.length > 0
                                ? `Nous avons trouvé ${localClipboards.length} clipboard(s) créé(s) en mode invité`
                                : "Aucun clipboard local trouvé"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {localClipboards.length > 0 && (
                            <>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="sync"
                                        checked={wantToSync}
                                        onCheckedChange={setWantToSync}
                                    />
                                    <label
                                        htmlFor="sync"
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                    >
                                        Synchroniser mes clipboards avec mon compte
                                    </label>
                                </div>

                                {wantToSync && (
                                    <div className="rounded-lg bg-muted p-4 space-y-2">
                                        <div className="flex items-center gap-2 text-sm">
                                            <CloudUpload className="h-4 w-4 text-primary" />
                                            <span className="font-medium">
                                                {localClipboards.length} clipboard(s) seront synchronisé(s)
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Vos clipboards seront associés à votre compte et accessibles depuis tous vos appareils.
                                        </p>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                    <CardFooter className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={handleSkip}
                            disabled={loading}
                            className="flex-1"
                        >
                            <X className="mr-2 h-4 w-4" />
                            Passer
                        </Button>
                        <Button
                            onClick={handleSync}
                            disabled={loading}
                            className="flex-1"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Synchronisation...
                                </>
                            ) : (
                                <>
                                    <Check className="mr-2 h-4 w-4" />
                                    {wantToSync && localClipboards.length > 0 ? "Synchroniser" : "Continuer"}
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    )
}
