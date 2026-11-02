'use client'

import { Play, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

export interface MediaItem {
  url: string
  type: 'image' | 'video'
}

interface MediaGridProps {
  media: MediaItem[]
}

// ── Internal lightbox rendered via portal ───────────────
function MediaLightbox({
  media,
  initialIndex,
  onClose,
}: {
  media: MediaItem[]
  initialIndex: number
  onClose: () => void
}) {
  const [index, setIndex] = useState(initialIndex)
  const item = media[index]

  const goPrev = useCallback(() => setIndex(i => Math.max(0, i - 1)), [])
  const goNext = useCallback(
    () => setIndex(i => Math.min(media.length - 1, i + 1)),
    [media.length]
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === 'ArrowRight') goNext()
      else if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [goPrev, goNext, onClose])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center select-none"
      onClick={onClose}
    >
      {/* Close */}
      <button
        className="absolute top-4 right-4 z-10 text-white bg-gray-500 hover:bg-gray-700 rounded-full p-2 transition-colors"
        onClick={e => { e.stopPropagation(); onClose() }}
        aria-label="Close"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Counter — only when more than 1 item */}
      {media.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 text-white/80 text-sm bg-black/40 px-3 py-1 rounded-full pointer-events-none">
          {index + 1} / {media.length}
        </div>
      )}

      {/* Prev arrow — only when a previous item exists */}
      {index > 0 && (
        <button
          className="absolute left-4 z-10 text-white bg-gray-500 hover:bg-gray-700 rounded-full p-3 transition-colors"
          onClick={e => { e.stopPropagation(); goPrev() }}
          aria-label="Previous"
        >
          <ChevronLeft className="w-7 h-7 bg-gray-500" />
        </button>
      )}

      {/* Next arrow — only when a next item exists */}
      {index < media.length - 1 && (
        <button
          className="absolute right-4 z-10 text-white bg-gray-500 hover:bg-gray-700 rounded-full p-3 transition-colors"
          onClick={e => { e.stopPropagation(); goNext() }}
          aria-label="Next"
        >
          <ChevronRight className="w-7 h-7 bg-gray-500" />
        </button>
      )}

      {/* Media content — click inside does not close */}
      <div
        className="flex items-center justify-center"
        onClick={e => e.stopPropagation()}
      >
        {item.type === 'video' ? (
          <video
            key={item.url}
            src={item.url}
            controls
            autoPlay
            className="max-w-[90vw] max-h-[90vh] rounded-lg"
          />
        ) : (
          <img
            key={item.url}
            src={item.url}
            alt={`Media ${index + 1} of ${media.length}`}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            draggable={false}
          />
        )}
      </div>
    </div>,
    document.body
  )
}

// ── MediaGrid ───────────────────────────────────────────
/**
 * LinkedIn-style media grid:
 *  1  → full-width
 *  2  → side-by-side
 *  3  → 1 large left + 2 stacked right
 *  4  → 2×2 grid
 *  5+ → 2×2 + last cell shows "+N" overlay
 *
 * Clicking any item opens a full-screen lightbox with
 * prev/next navigation and keyboard support.
 */
export function MediaGrid({ media }: MediaGridProps) {
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set())
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const closeLightbox = useCallback(() => setLightboxIndex(null), [])

  const markFailed = (url: string) => {
    setFailedUrls(prev => {
      const next = new Set(prev)
      next.add(url)
      return next
    })
  }

  const validMedia = (media || []).filter(item => !failedUrls.has(item.url))

  if (validMedia.length === 0) return null

  const open = (index: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setLightboxIndex(index)
  }

  const visible = validMedia.slice(0, 4)
  const overflow = validMedia.length > 4 ? validMedia.length - 4 : 0
  const slots = overflow > 0 ? [...visible.slice(0, 3), visible[3]] : visible

  const renderSlot = (item: MediaItem, slotIndex: number, isOverflow: boolean) => (
    <div
      key={slotIndex}
      className="relative w-full h-full overflow-hidden bg-black cursor-pointer group"
      onClick={e => open(slotIndex, e)}
    >
      {item.type === 'video' ? (
        <>
          <video
            src={item.url}
            className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
            muted
            playsInline
            preload="metadata"
            onError={() => markFailed(item.url)}
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/50 rounded-full p-2.5">
              <Play className="w-6 h-6 text-white fill-white" />
            </div>
          </div>
        </>
      ) : (
        <img
          src={item.url}
          alt={`media-${slotIndex + 1}`}
          className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
          onError={() => markFailed(item.url)}
        />
      )}
      {isOverflow && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
          <span className="text-white text-2xl font-bold">+{overflow}</span>
        </div>
      )}
    </div>
  )

  const count = validMedia.length

  return (
    <>
      {/* ── 1 item ── */}
      {count === 1 && (
        <div
          className="rounded-xl overflow-hidden mb-4 cursor-pointer group"
          style={{ maxHeight: 480 }}
          onClick={e => open(0, e)}
        >
          {slots[0].type === 'video' ? (
            <div className="relative bg-black" style={{ maxHeight: 480 }}>
              <video
                src={slots[0].url}
                className="w-full object-cover group-hover:opacity-90 transition-opacity"
                muted
                playsInline
                preload="metadata"
                style={{ maxHeight: 480 }}
                onError={() => markFailed(slots[0].url)}
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-black/50 rounded-full p-3">
                  <Play className="w-8 h-8 text-white fill-white" />
                </div>
              </div>
            </div>
          ) : (
            <img
              src={slots[0].url}
              alt="post media"
              className="w-full object-cover group-hover:opacity-95 transition-opacity"
              style={{ maxHeight: 480 }}
              onError={() => markFailed(slots[0].url)}
            />
          )}
        </div>
      )}

      {/* ── 2 items ── */}
      {count === 2 && (
        <div className="grid grid-cols-2 gap-0.5 rounded-xl overflow-hidden mb-4" style={{ height: 320 }}>
          {slots.map((item, i) => renderSlot(item, i, false))}
        </div>
      )}

      {/* ── 3 items ── */}
      {count === 3 && (
        <div className="grid grid-cols-2 grid-rows-2 gap-0.5 rounded-xl overflow-hidden mb-4" style={{ height: 360 }}>
          <div className="row-span-2">{renderSlot(slots[0], 0, false)}</div>
          {renderSlot(slots[1], 1, false)}
          {renderSlot(slots[2], 2, false)}
        </div>
      )}

      {/* ── 4+ items ── */}
      {count >= 4 && (
        <div className="grid grid-cols-2 grid-rows-2 gap-0.5 rounded-xl overflow-hidden mb-4" style={{ height: 360 }}>
          {renderSlot(slots[0], 0, false)}
          {renderSlot(slots[1], 1, false)}
          {renderSlot(slots[2], 2, false)}
          {renderSlot(slots[3], 3, overflow > 0)}
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <MediaLightbox
          media={validMedia}
          initialIndex={lightboxIndex}
          onClose={closeLightbox}
        />
      )}
    </>
  )
}
