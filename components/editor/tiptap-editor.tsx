"use client"

import { useEffect } from "react"
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { EditorToolbar } from "@/components/editor/toolbar"

export function TiptapEditor({
  content,
  editable,
  onChange,
}: {
  content: JSONContent
  editable: boolean
  onChange: (content: JSONContent) => void
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    editable,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "tiptap",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON())
    },
  })

  useEffect(() => {
    if (editor && editor.isEditable !== editable) {
      editor.setEditable(editable)
    }
  }, [editor, editable])

  if (!editor) return null

  return (
    <div className="rounded-lg border bg-card">
      {editable && <EditorToolbar editor={editor} />}
      <div className="px-6 py-4">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
