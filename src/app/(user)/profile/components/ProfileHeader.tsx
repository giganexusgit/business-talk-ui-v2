'use client'

import { MapPin, Briefcase, X, ZoomIn } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import apiClient from '@/lib/api-client'

export interface ProfileHeaderProps {
  profileData: any;
  connectState: 'connect' | 'pending' | 'incoming' | 'connected';
  loading: boolean;
  onConnect: () => void;
  onAccept?: () => void;
  onDelete?: () => void;
  userId: string;
  isOwnProfile: boolean;
}

export function ProfileHeader({
  profileData,
  connectState,
  loading,
  onConnect,
  onAccept,
  onDelete,
  userId,
  isOwnProfile
}: ProfileHeaderProps) {

  const router = useRouter()
  const [messagingLoading, setMessagingLoading] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [previewType, setPreviewType] = useState<'avatar' | 'cover' | null>(null)
  const [imageLoading, setImageLoading] = useState(false)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const [hoveringConnected, setHoveringConnected] = useState(false)
  const [hoveringPending, setHoveringPending] = useState(false)

  const avatarSrc = profileData.avatar || `https://ui-avatars.com/api/name=${encodeURIComponent(profileData.name || profileData.username || 'User')}`
  const coverSrc = profileData.cover_image || `https://ui-avatars.com/api/name=${encodeURIComponent(profileData.name || profileData.username || 'User')}`

  const closePreview = () => {
    setPreviewImage(null)
    setPreviewType(null)
    setImageLoading(false)
  }

  const openPreview = (type: 'avatar' | 'cover') => {
    setPreviewType(type)
    setPreviewImage(type === 'avatar' ? avatarSrc : coverSrc)
    setImageLoading(true)
  }

  useEffect(() => {
    if (!previewImage) return
    let cancelled = false
    const img = new Image()
    img.src = previewImage
    img.onload = () => {
      if (!cancelled) setImageLoading(false)
    }
    img.onerror = () => {
      if (!cancelled) setImageLoading(false)
    }
    return () => {
      cancelled = true
    }
  }, [previewImage])

  useEffect(() => {
    if (!previewImage) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePreview()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [previewImage])

  useEffect(() => {
    if (!previewImage) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [previewImage])

  const handleMessage = async () => {
    if (messagingLoading) return
    try {
      setMessagingLoading(true)
      const conv = await apiClient.getOrCreateConversation(userId)
      router.push(`/messages?conversationId=${conv.id}`)
    } catch (err) {
      console.error('Open chat error', err)
    } finally {
      setMessagingLoading(false)
    }
  }

  return (
    <>
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6 border">

      {/* COVER */}
      <div className="relative">
        <button
          type="button"
          onClick={() => openPreview('cover')}
          className="group relative block w-full cursor-zoom-in"
          aria-label="Open cover image preview"
        >
          <img
            src={coverSrc}
            alt="Cover"
            className="w-full h-28 sm:h-40 md:h-48 object-cover"
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition-all duration-200 group-hover:bg-black/30">
            <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-gray-800 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              View Cover
            </span>
          </div>
        </button>
      </div>

      <div className="px-4 sm:px-6 pb-5 sm:pb-6">

        <div className="flex flex-wrap items-end gap-3 sm:gap-6 -mt-10 sm:-mt-14 md:-mt-16">

          {/* AVATAR */}
          <button
            type="button"
            onClick={() => openPreview('avatar')}
            className="group relative z-10 cursor-zoom-in rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
            aria-label="Open profile photo preview"
          >
            <img
              src={avatarSrc}
              alt="Avatar"
              className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full border-4 border-white shadow-lg object-cover bg-white transition-transform duration-200 group-hover:scale-[1.03]"
            />
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/0 text-white transition-all duration-200 group-hover:bg-black/35">
              <ZoomIn className="h-5 w-5 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
            </span>
          </button>

          <div className="flex-1 min-w-0 mt-10 sm:mt-12 md:mt-16">
            <h1 className="text-xl sm:text-2xl font-semibold truncate">{profileData.name}</h1>
            <p className="text-gray-500 text-sm sm:text-base truncate">{profileData.title}</p>

            <div className="flex flex-wrap gap-3 text-xs sm:text-sm text-gray-400 mt-2">
              <span className="flex gap-1 items-center">
                <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {profileData.location || 'N/A'}
              </span>

              <span className="flex gap-1 items-center">
                <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {profileData.company || 'N/A'}
              </span>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          {!isOwnProfile && (
            <div className="flex gap-2 sm:gap-3 mt-3 sm:mt-4 w-full sm:w-auto">

              {/* CONNECT / INCOMING ACTIONS */}
              {connectState === 'incoming' ? (
                <>
                  <button
                    onClick={onAccept}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium rounded-lg border border-green-600 bg-green-50 text-green-700 hover:bg-green-100 transition-all duration-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Accepting...' : 'Accept'}
                  </button>
                  <button
                    onClick={onDelete}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium rounded-lg border border-red-600 bg-red-50 text-red-700 hover:bg-red-100 transition-all duration-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Deleting...' : 'Delete'}
                  </button>
                </>
              ) : (
                <button
                  onClick={onConnect}
                  disabled={loading}
                  className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all duration-200 active:scale-95

                    ${
                      connectState === 'connected'
                        ? 'border-green-500 bg-green-50 text-green-700 hover:bg-red-50 hover:border-red-500 hover:text-red-600'
                        : connectState === 'pending'
                        ? 'border-amber-500 bg-amber-50 text-amber-700 hover:bg-red-50 hover:border-red-500 hover:text-red-600'
                        : 'border-black text-black hover:bg-gray-50'
                    }

                    ${loading ? 'opacity-60 cursor-not-allowed' : ''}
                    `}
                  onMouseEnter={() => {
                    if (connectState === 'connected') setHoveringConnected(true)
                    if (connectState === 'pending') setHoveringPending(true)
                  }}
                  onMouseLeave={() => {
                    setHoveringConnected(false)
                    setHoveringPending(false)
                  }}
                >
                  {
                    loading
                      ? 'Loading...'
                      : connectState === 'connected'
                        ? hoveringConnected
                          ? 'Disconnect'
                          : 'Connected'
                        : connectState === 'pending'
                          ? hoveringPending
                            ? 'Cancel Request'
                            : 'Pending'
                          : 'Connect'
                  }
                </button>
              )}

              {/* MESSAGE */}
              <button
                onClick={handleMessage}
                disabled={messagingLoading}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-[#212529] text-[#212529] transition-all duration-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'transparent' }}
                onMouseEnter={(e) => { if (!messagingLoading) e.currentTarget.style.backgroundColor = '#F8F9FA' }}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                {messagingLoading ? 'Opening chat...' : 'Message'}
              </button>

            </div>
          )}

        </div>
      </div>
    </div>
    {previewImage && previewType && (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 transition-opacity duration-300"
        role="dialog"
        aria-modal="true"
        aria-label={previewType === 'avatar' ? 'Profile photo preview dialog' : 'Cover image preview dialog'}
        onClick={closePreview}
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={closePreview}
          className="absolute top-4 right-4 rounded-full bg-white/15 p-2 text-white backdrop-blur transition-all duration-200 hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label="Close image preview"
        >
          <X className="h-6 w-6" />
        </button>

        <div
          className="relative max-h-[90vh] max-w-[95vw] transition-all duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {imageLoading && (
            <div className="absolute inset-0 flex h-[60vh] w-[60vw] min-h-[280px] min-w-[280px] items-center justify-center rounded-xl bg-white/10 animate-pulse">
              <div className="h-10 w-10 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            </div>
          )}
          <img
            src={previewImage}
            alt={previewType === 'avatar' ? 'Profile avatar preview' : 'Profile cover preview'}
            className={`h-[60vh] w-[60vw] min-h-[280px] min-w-[280px] max-h-[90vh] max-w-[95vw] object-contain shadow-2xl transition-all duration-300 ${
              previewType === 'avatar' ? 'rounded-2xl' : 'rounded-xl'
            } ${imageLoading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
            onLoad={() => setImageLoading(false)}
            onError={(e) => {
              const fallback = previewType === 'avatar' ? avatarSrc : coverSrc
              if (e.currentTarget.src !== fallback) {
                e.currentTarget.src = fallback
              }
              setImageLoading(false)
            }}
          />
        </div>
      </div>
    )}
    </>
  )
}