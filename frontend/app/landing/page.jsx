"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
    Clipboard,
    Lock,
    Star,
    Search,
    FileText,
    Users,
    Download,
    Eye,
    Zap,
    Shield,
    Globe,
    Smartphone,
    ArrowRight,
    CheckCircle2,
} from "lucide-react"

export default function LandingPage() {
    const [stats, setStats] = useState({
        users: 0,
        clipboards: 0,
        dailyVisits: 0,
        countries: 0,
    })

    // Animation des statistiques au chargement
    useEffect(() => {
        const animateValue = (start, end, duration, setter) => {
            const range = end - start
            const increment = range / (duration / 16)
            let current = start

            const timer = setInterval(() => {
                current += increment
                if (current >= end) {
                    setter(end)
                    clearInterval(timer)
                } else {
                    setter(Math.floor(current))
                }
            }, 16)
        }

        animateValue(0, 15420, 2000, (val) => setStats((prev) => ({ ...prev, users: val })))
        animateValue(0, 48392, 2000, (val) => setStats((prev) => ({ ...prev, clipboards: val })))
        animateValue(0, 3847, 2000, (val) => setStats((prev) => ({ ...prev, dailyVisits: val })))
        animateValue(0, 67, 2000, (val) => setStats((prev) => ({ ...prev, countries: val })))
    }, [])

    const features = [
        {
            icon: Clipboard,
            title: "Partage Instantané",
            description: "Créez et partagez vos clipboards en un clic avec une URL unique et un QR code.",
        },
        {
            icon: Lock,
            title: "Sécurité Avancée",
            description:
                "Protection par mot de passe, expiration automatique et mode lecture seule pour vos données sensibles.",
        },
        {
            icon: Star,
            title: "Favoris & Organisation",
            description: "Marquez vos clipboards importants, ajoutez des titres personnalisés et organisez votre contenu.",
        },
        {
            icon: Search,
            title: "Recherche Puissante",
            description: "Trouvez rapidement vos clipboards grâce à la recherche par titre, contenu ou date.",
        },
        {
            icon: FileText,
            title: "Support Multi-formats",
            description: "Partagez du texte, des images, des PDFs avec support Markdown et formatage riche.",
        },
        {
            icon: Users,
            title: "Collaboration Temps Réel",
            description: "Voyez qui consulte vos clipboards en direct avec des avatars et statistiques de vues.",
        },
        {
            icon: Download,
            title: "Export Flexible",
            description: "Exportez vos clipboards en .txt, .md ou PDF en un seul clic.",
        },
        {
            icon: Eye,
            title: "Mode Clair/Sombre",
            description: "Interface adaptative avec thème clair et sombre pour votre confort visuel.",
        },
        {
            icon: Smartphone,
            title: "100% Responsive",
            description: "Accédez à vos clipboards depuis n'importe quel appareil : mobile, tablette ou desktop.",
        },
    ]

    const benefits = [
        "Aucune installation requise",
        "Synchronisation instantanée",
        "Interface intuitive et moderne",
        "Données sécurisées localement",
        "Gratuit et sans publicité",
        "Support multi-langues",
    ]

    return (
        <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted">
            {/* Header */}
            <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                            <Clipboard className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xl font-bold">ClipShare</span>
                    </div>
                    <nav className="hidden md:flex items-center gap-6">
                        <a href="#features" className="text-sm hover:text-primary transition-colors">
                            Fonctionnalités
                        </a>
                        <a href="#stats" className="text-sm hover:text-primary transition-colors">
                            Statistiques
                        </a>
                        <a href="#benefits" className="text-sm hover:text-primary transition-colors">
                            Avantages
                        </a>
                    </nav>
                    <div className="flex items-center gap-3">
                        <Link href="/login">
                            <Button variant="ghost" size="sm">
                                Connexion
                            </Button>
                        </Link>
                        <Link href="/">
                            <Button size="sm" className="bg-gradient-to-r from-primary to-purple-600">
                                Commencer
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="container mx-auto px-4 py-20 md:py-32">
                <div className="max-w-4xl mx-auto text-center space-y-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                        <Zap className="w-4 h-4" />
                        Partage de clipboard en temps réel
                    </div>

                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-balance">
                        Partagez vos clipboards
                        <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">
                            instantanément
                        </span>
                    </h1>

                    <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto text-pretty">
                        La solution moderne pour partager du texte, des fichiers et du contenu entre vos appareils et avec votre
                        équipe. Simple, rapide et sécurisé.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                        <Link href="/">
                            <Button size="lg" className="bg-gradient-to-r from-primary to-purple-600 text-lg px-8">
                                Essayer gratuitement
                                <ArrowRight className="w-5 h-5 ml-2" />
                            </Button>
                        </Link>
                        <Button size="lg" variant="outline" className="text-lg px-8 bg-transparent">
                            <Globe className="w-5 h-5 mr-2" />
                            Voir la démo
                        </Button>
                    </div>

                    {/* Preview Image Placeholder */}
                    <div className="mt-16 rounded-xl border bg-card shadow-2xl overflow-hidden">
                        <div className="aspect-video bg-gradient-to-br from-primary/20 via-purple-500/20 to-background flex items-center justify-center">
                            <div className="text-center space-y-4">
                                <Clipboard className="w-20 h-20 mx-auto text-primary/50" />
                                <p className="text-muted-foreground">Interface de l'application</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section id="stats" className="py-20 bg-muted/50">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
                        <div className="text-center space-y-2">
                            <div className="text-4xl md:text-5xl font-bold text-primary">{stats.users.toLocaleString()}+</div>
                            <div className="text-sm text-muted-foreground">Utilisateurs actifs</div>
                        </div>
                        <div className="text-center space-y-2">
                            <div className="text-4xl md:text-5xl font-bold text-primary">{stats.clipboards.toLocaleString()}+</div>
                            <div className="text-sm text-muted-foreground">Clipboards créés</div>
                        </div>
                        <div className="text-center space-y-2">
                            <div className="text-4xl md:text-5xl font-bold text-primary">{stats.dailyVisits.toLocaleString()}+</div>
                            <div className="text-sm text-muted-foreground">Visites journalières</div>
                        </div>
                        <div className="text-center space-y-2">
                            <div className="text-4xl md:text-5xl font-bold text-primary">{stats.countries}+</div>
                            <div className="text-sm text-muted-foreground">Pays</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-20">
                <div className="container mx-auto px-4">
                    <div className="text-center space-y-4 mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-balance">
                            Toutes les fonctionnalités dont vous avez besoin
                        </h2>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
                            Une suite complète d'outils pour gérer, partager et sécuriser vos clipboards
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                        {features.map((feature, index) => (
                            <Card key={index} className="p-6 hover:shadow-lg transition-shadow border-2 hover:border-primary/50">
                                <div className="space-y-4">
                                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <feature.icon className="w-6 h-6 text-primary" />
                                    </div>
                                    <h3 className="text-xl font-semibold">{feature.title}</h3>
                                    <p className="text-muted-foreground text-pretty">{feature.description}</p>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Benefits Section */}
            <section id="benefits" className="py-20 bg-muted/50">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto">
                        <div className="text-center space-y-4 mb-12">
                            <h2 className="text-3xl md:text-4xl font-bold text-balance">Pourquoi choisir ClipShare ?</h2>
                            <p className="text-lg text-muted-foreground text-pretty">Une solution pensée pour votre productivité</p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            {benefits.map((benefit, index) => (
                                <div key={index} className="flex items-center gap-3 p-4 rounded-lg bg-background border">
                                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                                    <span className="font-medium">{benefit}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Security Section */}
            <section className="py-20">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto">
                        <Card className="p-8 md:p-12 bg-gradient-to-br from-primary/5 to-purple-500/5 border-2">
                            <div className="flex flex-col md:flex-row items-center gap-8">
                                <div className="flex-shrink-0">
                                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Shield className="w-10 h-10 text-primary" />
                                    </div>
                                </div>
                                <div className="space-y-4 text-center md:text-left">
                                    <h3 className="text-2xl md:text-3xl font-bold">Vos données sont en sécurité</h3>
                                    <p className="text-muted-foreground text-pretty">
                                        Nous prenons la sécurité au sérieux. Vos clipboards sont stockés localement et peuvent être protégés
                                        par mot de passe. Aucune donnée n'est partagée sans votre consentement explicite.
                                    </p>
                                    <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                                        <div className="px-3 py-1 rounded-full bg-background text-sm font-medium">Chiffrement local</div>
                                        <div className="px-3 py-1 rounded-full bg-background text-sm font-medium">
                                            Protection par mot de passe
                                        </div>
                                        <div className="px-3 py-1 rounded-full bg-background text-sm font-medium">
                                            Expiration automatique
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-gradient-to-r from-primary to-purple-600">
                <div className="container mx-auto px-4">
                    <div className="max-w-3xl mx-auto text-center space-y-8 text-white">
                        <h2 className="text-3xl md:text-4xl font-bold text-balance">
                            Prêt à simplifier votre partage de contenu ?
                        </h2>
                        <p className="text-lg text-white/90 text-pretty">
                            Rejoignez des milliers d'utilisateurs qui font confiance à ClipShare pour partager leurs clipboards en
                            toute sécurité.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link href="/">
                                <Button size="lg" variant="secondary" className="text-lg px-8">
                                    Commencer gratuitement
                                    <ArrowRight className="w-5 h-5 ml-2" />
                                </Button>
                            </Link>
                            <Link href="/login">
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="text-lg px-8 bg-white/10 border-white/20 text-white hover:bg-white/20"
                                >
                                    Se connecter
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t py-12 bg-background">
                <div className="container mx-auto px-4">
                    <div className="grid md:grid-cols-4 gap-8 mb-8">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                                    <Clipboard className="w-5 h-5 text-white" />
                                </div>
                                <span className="font-bold">ClipShare</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                La solution moderne pour partager vos clipboards en temps réel.
                            </p>
                        </div>

                        <div>
                            <h4 className="font-semibold mb-4">Produit</h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li>
                                    <a href="#features" className="hover:text-primary transition-colors">
                                        Fonctionnalités
                                    </a>
                                </li>
                                <li>
                                    <a href="#stats" className="hover:text-primary transition-colors">
                                        Statistiques
                                    </a>
                                </li>
                                <li>
                                    <a href="#" className="hover:text-primary transition-colors">
                                        Tarifs
                                    </a>
                                </li>
                                <li>
                                    <a href="#" className="hover:text-primary transition-colors">
                                        Changelog
                                    </a>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-semibold mb-4">Ressources</h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li>
                                    <a href="#" className="hover:text-primary transition-colors">
                                        Documentation
                                    </a>
                                </li>
                                <li>
                                    <a href="#" className="hover:text-primary transition-colors">
                                        Guide
                                    </a>
                                </li>
                                <li>
                                    <a href="#" className="hover:text-primary transition-colors">
                                        API
                                    </a>
                                </li>
                                <li>
                                    <a href="#" className="hover:text-primary transition-colors">
                                        Support
                                    </a>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-semibold mb-4">Légal</h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li>
                                    <a href="#" className="hover:text-primary transition-colors">
                                        Confidentialité
                                    </a>
                                </li>
                                <li>
                                    <a href="#" className="hover:text-primary transition-colors">
                                        Conditions
                                    </a>
                                </li>
                                <li>
                                    <a href="#" className="hover:text-primary transition-colors">
                                        Cookies
                                    </a>
                                </li>
                                <li>
                                    <a href="#" className="hover:text-primary transition-colors">
                                        Licences
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="pt-8 border-t text-center text-sm text-muted-foreground">
                        <p>© 2025 ClipShare. Tous droits réservés.</p>
                    </div>
                </div>
            </footer>
        </div>
    )
}
