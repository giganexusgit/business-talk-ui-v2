import React from 'react'
import Link from 'next/link'

/**
 * Normalizes a hashtag string:
 * - Converts to lower case
 * - Strips leading '#'
 * - Strips quotes, brackets, trailing punctuation
 *
 * Example:
 * '#Business,' -> 'business'
 * '#BUSINESS'  -> 'business'
 * '["#business"]' -> 'business'
 */
export function normalizeHashtag(tag: string): string {
  if (!tag) return ''
  return String(tag)
    .trim()
    .replace(/^#+/, '')
    .replace(/^["'\[]+|["'\]]+$/g, '')
    .replace(/[.,!?:;]+$/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Parses raw input (string, array, JSON string, or array of strings)
 * and returns an array of unique normalized hashtag strings without raw JSON/array syntax.
 *
 * Handles inputs like:
 * - '["#business #familybusiness #leadership"]'
 * - ['#business', '#leadership']
 * - '#business #familybusiness'
 * - 'business, familybusiness'
 */
export function parseHashtags(input: any): string[] {
  if (!input) return []

  let rawString = ''

  if (Array.isArray(input)) {
    rawString = input.map((item) => String(item ?? '')).join(' ')
  } else if (typeof input === 'object') {
    try {
      rawString = JSON.stringify(input)
    } catch {
      rawString = String(input)
    }
  } else {
    rawString = String(input)
  }

  const trimmed = rawString.trim()

  // Attempt to parse JSON stringified array if present
  if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        rawString = parsed.map((item) => String(item ?? '')).join(' ')
      } else if (typeof parsed === 'string') {
        rawString = parsed
      }
    } catch {
      // Ignore JSON parse failure and proceed with raw string
    }
  }

  const tags: string[] = []

  // Extract explicit #hashtags first
  const hashtagMatches = rawString.match(/#([\p{L}\p{N}_-]+)/gu)
  if (hashtagMatches && hashtagMatches.length > 0) {
    hashtagMatches.forEach((match) => {
      const norm = normalizeHashtag(match)
      if (norm && !tags.includes(norm)) {
        tags.push(norm)
      }
    })
  } else {
    // Split by spaces or commas if no '#' symbols are present
    const tokens = rawString.split(/[\s,]+/)
    tokens.forEach((token) => {
      const norm = normalizeHashtag(token)
      if (norm && norm.length > 1 && !tags.includes(norm)) {
        tags.push(norm)
      }
    })
  }

  return tags
}

export interface HashtagLinkProps {
  tag: string
  className?: string
}

export function HashtagLink({ tag, className }: HashtagLinkProps) {
  const norm = normalizeHashtag(tag)
  if (!norm) return null

  return (
    <Link
      href={`/hashtags/${encodeURIComponent(norm)}`}
      onClick={(e) => e.stopPropagation()}
      className={
        className ||
        'inline-flex items-center text-blue-600 font-semibold hover:text-blue-800 hover:underline transition-colors'
      }
    >
      #{norm}
    </Link>
  )
}

export interface HashtagListProps {
  tags: any
  className?: string
  badgeStyle?: boolean
  maxDisplay?: number
}

export function HashtagList({ tags, className = '', badgeStyle = false, maxDisplay }: HashtagListProps) {
  const parsed = parseHashtags(tags)
  if (parsed.length === 0) return null

  const displayTags = maxDisplay ? parsed.slice(0, maxDisplay) : parsed

  return (
    <div className={`flex flex-wrap gap-1.5 items-center ${className}`}>
      {displayTags.map((tag) => (
        <Link
          key={tag}
          href={`/hashtags/${encodeURIComponent(tag)}`}
          onClick={(e) => e.stopPropagation()}
          className={
            badgeStyle
              ? 'px-2.5 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-900 transition-colors'
              : 'text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors'
          }
        >
          #{tag}
        </Link>
      ))}
    </div>
  )
}
