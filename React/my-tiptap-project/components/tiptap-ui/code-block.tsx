"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { NodeViewProps } from "@tiptap/react"
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from "@tiptap/react"
import type { Editor as TiptapEditor } from "@tiptap/core"
import type { Node as ProseMirrorNode } from "@tiptap/pm/model"
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight"
import { Button } from "@/components/tiptap-ui-primitive/button"

type CodeBlockTheme = "darcula" | "light"

const CODE_BLOCK_THEMES: Array<{ id: CodeBlockTheme; label: string }> = [
  { id: "darcula", label: "Darcula" },
  { id: "light", label: "Light" },
]

function prettyLanguageLabel(id: string) {
  if (!id) return "Plain text"
  return id
    .split(/[-_]/g)
    .map((p) => (p ? p[0].toUpperCase() + p.slice(1) : p))
    .join(" ")
}

async function copyToClipboard(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const el = document.createElement("textarea")
  el.value = text
  el.style.position = "fixed"
  el.style.left = "-9999px"
  document.body.appendChild(el)
  el.select()
  document.execCommand("copy")
  el.remove()
}

function unwrapDefault<T>(mod: { default?: T } | T): T {
  return (mod as { default?: T }).default ?? (mod as T)
}

async function formatCodeForLanguage(code: string, language: string) {
  const normalized = language.trim().toLowerCase()
  const supported = new Set(["tsx", "jsx", "typescript", "javascript"])
  if (!supported.has(normalized)) return null

  const prettier = await import("prettier/standalone")
  const format = prettier.format
  const [estree, babel, typescript] = await Promise.all([
    import("prettier/plugins/estree"),
    import("prettier/plugins/babel"),
    import("prettier/plugins/typescript"),
  ])

  const plugins = [unwrapDefault(estree), unwrapDefault(babel), unwrapDefault(typescript)]

  if (normalized === "tsx") {
    return format(code, { parser: "typescript", plugins, filepath: "file.tsx" })
  }
  if (normalized === "jsx") {
    return format(code, { parser: "babel", plugins, filepath: "file.jsx" })
  }
  if (normalized === "typescript") {
    return format(code, { parser: "typescript", plugins, filepath: "file.ts" })
  }
  if (normalized === "javascript") {
    return format(code, { parser: "babel", plugins, filepath: "file.js" })
  }

  return null
}

function replaceCodeBlockText(
  editor: TiptapEditor,
  pos: number,
  node: ProseMirrorNode,
  nextText: string
) {
  const { state, view } = editor
  const from = pos + 1
  const to = pos + node.nodeSize - 1
  const tr = state.tr.replaceWith(from, to, state.schema.text(nextText))
  view.dispatch(tr)
}

export function createCodeBlockWithUI(lowlight: {
  listLanguages: () => string[]
}) {
  function CodeBlockNodeView({ node, updateAttributes, editor, getPos }: NodeViewProps) {
    const currentLanguage = (node.attrs.language as string | null) ?? null
    const theme = ((node.attrs.theme as CodeBlockTheme | undefined) ?? "darcula") satisfies CodeBlockTheme
    const collapsed = Boolean((node.attrs.collapsed as boolean | undefined) ?? true)
    const [copied, setCopied] = useState(false)
    const lineCount = Math.max(1, node.textContent.split("\n").length)
    const formatRequestRef = useRef(0)
    const isLong = lineCount > 12

    const languages = useMemo(() => {
      const list = lowlight.listLanguages()
      const unique = Array.from(new Set([...list, "tsx", "jsx"])).sort((a, b) =>
        a.localeCompare(b)
      )
      return ["plaintext", ...unique]
    }, [])

    useEffect(() => {
      if (!copied) return
      const t = window.setTimeout(() => setCopied(false), 1200)
      return () => window.clearTimeout(t)
    }, [copied])

    const applyLanguage = async (next: string) => {
      const normalized = next === "plaintext" ? null : next
      updateAttributes({ language: normalized })

      if (!normalized) return
      if (!["tsx", "jsx", "typescript", "javascript"].includes(normalized)) return

      const pos = typeof getPos === "function" ? getPos() : null
      if (typeof pos !== "number") return

      const requestId = (formatRequestRef.current += 1)
      const original = node.textContent
      try {
        const formatted = await formatCodeForLanguage(original, normalized)
        if (formatRequestRef.current !== requestId) return
        if (!formatted || formatted === original) return
        replaceCodeBlockText(editor, pos, node, formatted.replace(/\n$/, ""))
      } catch {
        return
      }
    }

    return (
      <NodeViewWrapper
        className={
          collapsed && isLong ? "tiptap-codeblock is-collapsed" : "tiptap-codeblock"
        }
        data-theme={theme}
      >
        <div className="tiptap-codeblock__header" contentEditable={false}>
          <div className="tiptap-codeblock__header-left">
            <select
              className="tiptap-codeblock__select"
              value={currentLanguage ?? "plaintext"}
              onChange={(e) => void applyLanguage(e.target.value)}
            >
              {languages.map((lang) => (
                <option key={lang} value={lang}>
                  {prettyLanguageLabel(lang === "plaintext" ? "" : lang)}
                </option>
              ))}
            </select>

            <select
              className="tiptap-codeblock__select"
              value={theme}
              onChange={(e) => updateAttributes({ theme: e.target.value })}
            >
              {CODE_BLOCK_THEMES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="tiptap-codeblock__header-left">
            {isLong ? (
              <Button
                type="button"
                data-style="ghost"
                tooltip={collapsed ? "展开" : "收起"}
                onClick={() => updateAttributes({ collapsed: !collapsed })}
              >
                <span className="tiptap-button-text">{collapsed ? "展开" : "收起"}</span>
              </Button>
            ) : null}
            <Button
              type="button"
              data-style="ghost"
              tooltip={copied ? "已复制" : "复制代码"}
              onClick={async () => {
                await copyToClipboard(node.textContent)
                setCopied(true)
              }}
            >
              <span className="tiptap-button-text">{copied ? "Copied" : "Copy"}</span>
            </Button>
          </div>
        </div>

        <div
          className={
            collapsed && isLong
              ? "tiptap-codeblock__scroll tiptap-codeblock__scroll--collapsed"
              : "tiptap-codeblock__scroll"
          }
        >
          <div className="tiptap-codeblock__gutter" contentEditable={false}>
            {Array.from({ length: lineCount }).map((_, i) => (
              <div key={i} className="tiptap-codeblock__gutter-line">
                {i + 1}
              </div>
            ))}
          </div>
          <pre className="tiptap-codeblock__pre" data-theme={theme}>
            <NodeViewContent
              as={"code" as never}
              className="tiptap-codeblock__content hljs"
            />
          </pre>
        </div>
      </NodeViewWrapper>
    )
  }

  return CodeBlockLowlight.extend({
    addAttributes() {
      return {
        ...this.parent?.(),
        theme: {
          default: "darcula",
          parseHTML: (element) => element.getAttribute("data-theme") ?? "darcula",
          renderHTML: (attributes) => {
            return { "data-theme": attributes.theme }
          },
        },
        collapsed: {
          default: true,
          parseHTML: (element) => element.getAttribute("data-collapsed") !== "false",
          renderHTML: (attributes) => {
            return { "data-collapsed": attributes.collapsed ? "true" : "false" }
          },
        },
      }
    },
    addNodeView() {
      return ReactNodeViewRenderer(CodeBlockNodeView)
    },
    addKeyboardShortcuts() {
      return {
        Enter: () => {
          if (!this.editor.isActive("codeBlock")) return false
          this.editor.commands.insertContent("\n")
          return true
        },
        Tab: () => {
          if (!this.editor.isActive("codeBlock")) return false
          this.editor.commands.insertContent("\t")
          return true
        },
        "Shift-Tab": () => {
          if (!this.editor.isActive("codeBlock")) return false
          const { from, empty } = this.editor.state.selection
          if (empty && from > 1) {
            const prev = this.editor.state.doc.textBetween(from - 1, from, "\n", "\n")
            if (prev === "\t") {
              this.editor.commands.deleteRange({ from: from - 1, to: from })
              return true
            }
          }
          return true
        },
      }
    },
  })
}

