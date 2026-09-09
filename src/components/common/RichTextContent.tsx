'use client'

import DOMPurify from 'dompurify'
import { CSSProperties } from 'react'

export function decodeHTMLEntities(text: string): string {
  if (!text) return ''
  const str = String(text)
  if (!/&[a-z0-9#]+;/i.test(str)) return str

  if (typeof window !== 'undefined') {
    const doc = new DOMParser().parseFromString(str, 'text/html')
    return doc.body.textContent || str
  }

  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
}

export function renderHashtagsWithLinks(text: string): string {
  const decoded = decodeHTMLEntities(text)
  const input = String(decoded ?? '').trim()
  if (!input) return ''

  const parts = input.split(/(<[^>]+>)/g)
  let inAnchor = false

  return parts
    .map((part) => {
      if (!part) return ''

      if (/^<[^>]+>$/i.test(part)) {
        if (/^<a\b/i.test(part)) {
          inAnchor = true
        } else if (/^<\/a>/i.test(part)) {
          inAnchor = false
        }
        return part
      }

      if (inAnchor) {
        return part
      }

      return part.replace(/#([\p{L}\p{N}_-]+)/gu, (_match, tag) => {
        const normalized = tag.toLowerCase()
        const href = `/hashtags/${encodeURIComponent(normalized)}`
        return `<a href="${href}" class="text-blue-600 font-semibold hover:text-blue-800 hover:underline">#${tag}</a>`
      })
    })
    .join('')
}

interface Props {
  html?: string | null
  className?: string
  style?: CSSProperties
}

export default function RichTextContent({
  html,
  className = '',
  style,
}: Props) {
  const cleanHtml = DOMPurify.sanitize(
    renderHashtagsWithLinks(html || ''),
    { ADD_ATTR: ['target'] }
  )

  return (
    <div
      className={`rich-text-content break-words ${className}`}
      style={style}
      dangerouslySetInnerHTML={{
        __html: cleanHtml,
      }}
    />
  )
}