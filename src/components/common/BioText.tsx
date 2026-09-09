import React from 'react'

export interface BioTextProps {
  content?: string | null
  text?: string | null
  className?: string
  paragraphClassName?: string
  fallback?: string
  showEmptyFallback?: boolean
}

/**
 * BioText Component
 * 
 * Preserves user-entered bio/about formatting:
 * - Converts escaped '\\n' string representations to actual newlines
 * - Splits double/multiple newlines into distinct paragraph blocks
 * - Uses `whitespace-pre-line` to preserve single newlines within paragraphs
 * - Uses `space-y-3` for clean, readable spacing between paragraphs
 * - Prevents horizontal overflow using `break-words max-w-full`
 */
export function BioText({
  content,
  text,
  className = '',
  paragraphClassName = '',
  fallback = 'No bio available',
  showEmptyFallback = true,
}: BioTextProps) {
  const rawText = content ?? text

  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
    if (!showEmptyFallback) return null
    return (
      <p className={`text-gray-400 italic text-sm font-normal ${className}`}>
        {fallback}
      </p>
    )
  }

  // 1. Normalize escaped '\\n' strings and different OS newline conventions (\r\n, \r)
  const normalizedText = rawText
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')

  // 2. Split on two or more newlines (allowing spaces in between) to form paragraphs
  const rawParagraphs = normalizedText.split(/\n\s*\n+/)

  // 3. Trim individual paragraphs and filter out blank ones
  const paragraphs = rawParagraphs
    .map((p) => p.trim())
    .filter((p) => p.length > 0)

  if (paragraphs.length === 0) {
    if (!showEmptyFallback) return null
    return (
      <p className={`text-gray-400 italic text-sm font-normal ${className}`}>
        {fallback}
      </p>
    )
  }

  return (
    <div className={`space-y-3 max-w-full text-gray-700 leading-relaxed font-normal ${className}`}>
      {paragraphs.map((paragraph, index) => (
        <p
          key={index}
          className={`whitespace-pre-line break-words max-w-full ${paragraphClassName}`}
        >
          {paragraph}
        </p>
      ))}
    </div>
  )
}

export default BioText
