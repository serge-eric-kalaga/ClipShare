"use client"

import '@/styles/editor.css'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
import { Button } from '@/components/ui/button'
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    Strikethrough,
    Code,
    List,
    ListOrdered,
    Quote,
    Undo,
    Redo,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    Highlighter,
    Link as LinkIcon,
    Heading1,
    Heading2,
    Heading3,
    Minus,
} from 'lucide-react'
import { useCallback, useEffect } from 'react'

export default function RichTextEditor({ content, onChange, placeholder }) {
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-primary underline cursor-pointer hover:opacity-80',
                },
            }),
            Image,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            Underline,
            Highlight,
        ],
        content: content || '',
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML())
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[300px] md:min-h-[400px] p-4',
                'data-placeholder': placeholder || 'Commencez à taper...',
            },
        },
    })

    // Mettre à jour le contenu de l'éditeur quand la prop content change (Socket.IO)
    useEffect(() => {
        if (editor && content !== undefined && content !== null) {
            const currentContent = editor.getHTML()
            // Ne mettre à jour que si le contenu est différent pour éviter les boucles
            if (currentContent !== content) {
                editor.commands.setContent(content, false)
            }
        }
    }, [content, editor])

    const setLink = useCallback(() => {
        const previousUrl = editor.getAttributes('link').href
        const url = window.prompt('URL', previousUrl)

        if (url === null) {
            return
        }

        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run()
            return
        }

        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }, [editor])

    const addImage = useCallback(() => {
        const url = window.prompt('URL de l\'image')

        if (url) {
            editor.chain().focus().setImage({ src: url }).run()
        }
    }, [editor])

    if (!editor) {
        return null
    }

    return (
        <div className="border rounded-lg">
            {/* Toolbar */}
            <div className="border-b bg-muted/30 p-2 flex flex-wrap gap-1">
                {/* Text formatting */}
                <div className="flex gap-1 border-r pr-2">
                    <Button
                        variant={editor.isActive('bold') ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        title="Gras (Ctrl+B)"
                    >
                        <Bold className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={editor.isActive('italic') ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        title="Italique (Ctrl+I)"
                    >
                        <Italic className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={editor.isActive('underline') ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        title="Souligné (Ctrl+U)"
                    >
                        <UnderlineIcon className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={editor.isActive('strike') ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => editor.chain().focus().toggleStrike().run()}
                        title="Barré"
                    >
                        <Strikethrough className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={editor.isActive('highlight') ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => editor.chain().focus().toggleHighlight().run()}
                        title="Surligner"
                    >
                        <Highlighter className="h-4 w-4" />
                    </Button>
                </div>

                {/* Headings */}
                <div className="flex gap-1 border-r pr-2">
                    <Button
                        variant={editor.isActive('heading', { level: 1 }) ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                        title="Titre 1"
                    >
                        <Heading1 className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={editor.isActive('heading', { level: 2 }) ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        title="Titre 2"
                    >
                        <Heading2 className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={editor.isActive('heading', { level: 3 }) ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                        title="Titre 3"
                    >
                        <Heading3 className="h-4 w-4" />
                    </Button>
                </div>

                {/* Lists */}
                <div className="flex gap-1 border-r pr-2">
                    <Button
                        variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        title="Liste à puces"
                    >
                        <List className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={editor.isActive('orderedList') ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        title="Liste numérotée"
                    >
                        <ListOrdered className="h-4 w-4" />
                    </Button>
                </div>

                {/* Alignment */}
                <div className="flex gap-1 border-r pr-2">
                    <Button
                        variant={editor.isActive({ textAlign: 'left' }) ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => editor.chain().focus().setTextAlign('left').run()}
                        title="Aligner à gauche"
                    >
                        <AlignLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={editor.isActive({ textAlign: 'center' }) ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => editor.chain().focus().setTextAlign('center').run()}
                        title="Centrer"
                    >
                        <AlignCenter className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={editor.isActive({ textAlign: 'right' }) ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => editor.chain().focus().setTextAlign('right').run()}
                        title="Aligner à droite"
                    >
                        <AlignRight className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={editor.isActive({ textAlign: 'justify' }) ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                        title="Justifier"
                    >
                        <AlignJustify className="h-4 w-4" />
                    </Button>
                </div>

                {/* Other */}
                <div className="flex gap-1 border-r pr-2">
                    <Button
                        variant={editor.isActive('blockquote') ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => editor.chain().focus().toggleBlockquote().run()}
                        title="Citation"
                    >
                        <Quote className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={editor.isActive('code') ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => editor.chain().focus().toggleCode().run()}
                        title="Code inline"
                    >
                        <Code className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().setHorizontalRule().run()}
                        title="Ligne horizontale"
                    >
                        <Minus className="h-4 w-4" />
                    </Button>
                </div>

                {/* Links and Images */}
                <div className="flex gap-1 border-r pr-2">
                    <Button
                        variant={editor.isActive('link') ? 'default' : 'ghost'}
                        size="sm"
                        onClick={setLink}
                        title="Ajouter un lien"
                    >
                        <LinkIcon className="h-4 w-4" />
                    </Button>
                </div>

                {/* Undo/Redo */}
                <div className="flex gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().undo().run()}
                        disabled={!editor.can().undo()}
                        title="Annuler (Ctrl+Z)"
                    >
                        <Undo className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().redo().run()}
                        disabled={!editor.can().redo()}
                        title="Refaire (Ctrl+Y)"
                    >
                        <Redo className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Editor */}
            <EditorContent editor={editor} />
        </div>
    )
}
