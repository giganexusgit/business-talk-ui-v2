'use client'

import { ThumbsUp, MessageCircle, Send, MoreVertical, Bookmark, Users, EyeOff, Flag } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { ShareModal } from '@/components/shared/ShareModal'
import { useContentViewer, ContentType } from '@/hooks/useContentViewer'

interface FeedPostWithViewerProps {
  id?: string
  author: {
    name: string
    title: string
    avatar: string
  }
  content: string
  image?: string
  video?: string
  timestamp: string
  likes: number
  comments: number
  sends: number
  // Make it optional so it works with existing FeedPost
  onViewerOpen?: (type: ContentType) => void
}

export function FeedPostWithViewer({ 
  id: propId,
  author, 
  content, 
  image, 
  video, 
  timestamp, 
  likes, 
  comments, 
  sends,
  onViewerOpen
}: FeedPostWithViewerProps) {
  const fallbackIdRef = useRef<string | null>(null)
  if (!fallbackIdRef.current) {
    fallbackIdRef.current = 'post_' + Math.random().toString(36).slice(2)
  }
  const id = propId || fallbackIdRef.current
  const { open: openViewer } = useContentViewer()
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(likes)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showActionMenu, setShowActionMenu] = useState(false)
  const actionMenuRef = useRef<HTMLDivElement>(null)

  const handleLike = () => {
    if (liked) {
      setLiked(false)
      setLikeCount(likeCount - 1)
    } else {
      setLiked(true)
      setLikeCount(likeCount + 1)
    }
  }

  // Open content in viewer modal
  const handleOpenViewer = () => {
    const postData = {
      id,
      author,
      content,
      image,
      video,
      timestamp,
      likes: likeCount,
      comments,
      sends
    }
    openViewer('posts', postData)
    onViewerOpen?.('posts')
  }

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        actionMenuRef.current &&
        !actionMenuRef.current.contains(event.target as Node)
      ) {
        setShowActionMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-6 mb-4">
        {/* Post Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <img
              src={author.avatar}
              alt={author.name}
              className="w-12 h-12 rounded-full object-cover"
            />
            <div>
              <h3 className="font-semibold text-gray-900">{author.name}</h3>
              <p className="text-sm text-gray-500">{author.title}</p>
              <p className="text-xs text-gray-400">{timestamp}</p>
            </div>
          </div>

          {/* Action Menu Button */}
          <div className="relative" ref={actionMenuRef}>
            <button
              onClick={() => setShowActionMenu(!showActionMenu)}
              className="text-gray-400 hover:text-gray-600 p-1 transition"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {/* Action Menu Dropdown */}
            {showActionMenu && (
              <div className="absolute right-0 mt-1 bg-white border rounded-lg shadow-lg z-10 px-3 py-2 flex items-center gap-1 whitespace-nowrap">
                <button className="text-gray-700 hover:text-black hover:bg-gray-100 p-2 rounded transition flex items-center gap-1 text-xs" title="Save post">
                  <Bookmark className="w-4 h-4" />
                </button>
                <button className="text-gray-700 hover:text-black hover:bg-gray-100 p-2 rounded transition flex items-center gap-1 text-xs" title="Disconnect">
                  <Users className="w-4 h-4" />
                </button>
                <button className="text-gray-700 hover:text-black hover:bg-gray-100 p-2 rounded transition flex items-center gap-1 text-xs" title="Not interested">
                  <EyeOff className="w-4 h-4" />
                </button>
                <button className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded transition flex items-center gap-1 text-xs" title="Report post">
                  <Flag className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Post Content */}
        <div className="mb-4">
          <p className="text-gray-800 leading-relaxed whitespace-pre-wrap break-words">{content}</p>
        </div>

        {/* Post Image */}
        {image && (
          <div 
            className="mb-4 rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
            onClick={handleOpenViewer}
          >
            <img
              src={image}
              alt="Post content"
              className="w-full h-48 sm:h-80 object-cover"
            />
          </div>
        )}

        {/* Post Video */}
        {video && (
          <div className="mb-4 rounded-xl overflow-hidden">
            <video
              src={video}
              className="w-full h-48 sm:h-80 object-cover"
              controls
            >
              <source src={video} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
          <button
            onClick={handleLike}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              liked
                ? 'bg-gray-100 text-black'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <ThumbsUp className="w-5 h-5" />
            <span className="text-sm font-medium">{likeCount}</span>
          </button>

          <button
            onClick={handleOpenViewer}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50 transition-all cursor-pointer"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm font-medium">{comments}</span>
          </button>

          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50 transition-all ml-auto cursor-pointer"
          >
            <Send className="w-5 h-5" />
            <span className="text-sm font-medium">{sends}</span>
          </button>
        </div>
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        postContent={content}
        contentType="posts"
        contentId={id}
      />
    </>
  )
}
