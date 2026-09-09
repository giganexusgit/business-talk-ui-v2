'use client'

import {
  ThumbsUp,
  MessageCircle,
  Send,
  MoreVertical,
  Eye,
  Bookmark,
  UserCheck, 
  UserMinus, 
  UserPlus,
  Flag,
  Trash2,
  Pencil,
  X,
} from 'lucide-react'

import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import ExpandableText from '@/components/common/ExpandableText'
import { useRouter } from 'next/navigation'
import { profileHref } from '@/lib/profile-link'
import { ShareModal } from '@/components/shared/ShareModal'
import { useStoryComments } from '@/hooks/useStoryComments'
import { useStoryLike } from '@/hooks/useStoryLike'
import { useFollow } from '@/hooks/useFollow'
import { useSavedStatus } from '@/hooks/useSavedStatus'
import { useAccountStatus, useAppSelector } from '@/hooks/useRedux'
import { getTimeAgo } from '@/lib/utils'
import { ReportModal } from '../shared/ReportModal'
import { useOpenContent } from '@/hooks/useOpenContent'
import apiClient from '@/lib/api-client'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { parseHashtags, HashtagList } from '@/lib/hashtag'

interface StoryPostProps {
  id?: string
  authorId?: string
  author: {
    name: string
    title: string
    avatar: string
  }
  storyTitle: string
  excerpt: string
  coverImage?: string
  timestamp: string
  likes: number
  liked?: boolean
  comments: number
  views: number
  readTime?: string
  category?: string
  tags?: any
}

export function StoryPost({
  id = '',
  authorId = '',
  author,
  storyTitle,
  excerpt,
  coverImage,
  timestamp,
  likes,
  liked = false,
  views,
  category,
  tags,
}: StoryPostProps) {
  const router = useRouter()
  const { openStory } = useOpenContent()

  const displayTags = parseHashtags(
    tags && parseHashtags(tags).length > 0
      ? tags
      : (category || (storyTitle + ' ' + excerpt))
  )

  const [showShareModal, setShowShareModal] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [commentInput, setCommentInput] = useState('')
  const [replyInput, setReplyInput] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [showActionMenu, setShowActionMenu] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const actionMenuRef = useRef<HTMLDivElement>(null)
  const [animatingId, setAnimatingId] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState('')
  const [isDeleted, setIsDeleted] = useState(false)
  const [isLiked, setIsLiked] = useState(liked)
  const [likeCount, setLikeCount] = useState(likes || 0)
  const [commentLikeOverrides, setCommentLikeOverrides] = useState<Record<string, { count: number; liked?: boolean }>>({})
  const [deleteToast, setDeleteToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const queryClient = useQueryClient()
  const [displayTitle, setDisplayTitle] = useState(storyTitle || '')
  const [displayExcerpt, setDisplayExcerpt] = useState(excerpt || '')
  const [displayCoverImage, setDisplayCoverImage] = useState(coverImage || '')

  const [showEditModal, setShowEditModal] = useState(false)
  const [editTitle, setEditTitle] = useState(displayTitle)
  const [editExcerpt, setEditExcerpt] = useState(displayExcerpt)
  const [editVisibility, setEditVisibility] = useState<'PUBLIC' | 'CONNECTIONS' | 'PRIVATE'>('PUBLIC')
  const [editExpiry, setEditExpiry] = useState<'24h' | '48h' | 'never'>('24h')
  const [newCoverFile, setNewCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(displayCoverImage)
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')

  useEffect(() => {
    setDisplayTitle(storyTitle || '')
    setDisplayExcerpt(excerpt || '')
    setDisplayCoverImage(coverImage || '')
  }, [storyTitle, excerpt, coverImage, id])

  const showDeleteToast = (message: string, type: 'success' | 'error') => {
    setDeleteToast({ message, type })
    setTimeout(() => setDeleteToast(null), 3000)
  }

  const handleEditStory = async () => {
    if (!id || (!editTitle.trim() && !editExcerpt.trim())) {
      setEditError('Title or content cannot be empty.')
      return
    }

    setEditLoading(true)
    setEditError('')

    try {
      const formData = new FormData()
      formData.append('title', editTitle)
      formData.append('content', editExcerpt)
      formData.append('type', 'STORY')
      formData.append('visibility', editVisibility)
      formData.append('expiry', editExpiry)
      if (newCoverFile) {
        formData.append('cover_image', newCoverFile)
      }

      const res = await apiClient.updateBlog(id, formData)
      const updated = res?.data?.data || res?.data

      setDisplayTitle(editTitle)
      setDisplayExcerpt(editExcerpt)
      if (newCoverFile) {
        setDisplayCoverImage(URL.createObjectURL(newCoverFile))
      } else if (coverPreview === null) {
        setDisplayCoverImage('')
      } else if (updated?.cover_image) {
        setDisplayCoverImage(updated.cover_image)
      }

      await queryClient.invalidateQueries({ queryKey: ['blogs'] })
      await queryClient.invalidateQueries({ queryKey: ['stories'] })
      await queryClient.invalidateQueries({ queryKey: ['feed'] })
      setShowEditModal(false)
      showDeleteToast('Story updated successfully', 'success')
    } catch (err: any) {
      setEditError(err?.response?.data?.message || 'Failed to update story.')
    } finally {
      setEditLoading(false)
    }
  }
  const reduxUser = useAppSelector((state: any) => state.auth.user)

  // ✅ HOOKS (STANDARDIZED)
  const { comments, addComment, likeComment, isLikingComment, deleteComment } = useStoryComments(id)
  const { likeStory, isLiking } = useStoryLike(id)
  const { state: followState, follow, unfollow } = useFollow(authorId)
  const { isBanned } = useAccountStatus()
  const { isSaved, toggle: toggleSave, showToast: showSavedToast } = useSavedStatus(id || undefined, 'blog')
  const requireAuth = useRequireAuth()

  useEffect(() => {
    const handleClickOutside = (e: any) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target)) {
        setShowActionMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (reduxUser?.id) {
      setCurrentUserId(String(reduxUser.id))
    } else {
      try {
        const u = JSON.parse(localStorage.getItem('user') || '{}')
        setCurrentUserId(String(u.id || ''))
      } catch {}
    }
  }, [reduxUser])

  useEffect(() => {
    setLikeCount(likes || 0)
  }, [likes])

  useEffect(() => {
    setIsLiked(Boolean(liked))
  }, [liked])

  useEffect(() => {
    // Fresh server comments should replace temporary local overrides.
    setCommentLikeOverrides({})
  }, [comments])

  // =========================
  // 🧠 NEST COMMENTS
  // =========================
  const nestComments = (comments: any[]) => {
    const map: Record<string, any> = {}
    const roots: any[] = []

    comments.forEach((c) => {
      map[c.id] = {
        id: c.id,
        authorId: String(c.user?.id || ''),
        content: c.content,
        likes: Number(c.likes ?? c.likes_count ?? c.upvotes ?? 0),
        timestamp: new Date(Number(c.created_on)).toLocaleString(),
        author: {
          name:
            c.user?.full_name ||
            c.user?.username ||
            'Unknown',
          avatar: c.user?.profile_photo || `https://ui-avatars.com/api/name=${encodeURIComponent(c.user?.full_name || 'User')}`,
        },
        replies: [],
        parent: c.parent,
      }
    })

    comments.forEach((c) => {
      if (c.parent && c.parent.id && map[c.parent.id]) {
        map[c.parent.id].replies.push(map[c.id])
      } else {
        roots.push(map[c.id])
      }
    })

    return roots
  }

  const nestedComments = nestComments(comments)

  // =========================
  // 🔖 SAVE STORY — handled by useSavedStatus hook
  // =========================
  const handleSave = async () => {
    if (!requireAuth()) return
    await toggleSave(() => setShowActionMenu(false))
  }

  // =========================
  // ❤️ LIKE STORY
  // =========================
  const handleLike = async () => {
    if (!requireAuth()) return
    if (!id || isLiking) return

    const wasLiked = isLiked
    setIsLiked(!wasLiked)
    setLikeCount((prev) => Math.max(0, prev + (wasLiked ? -1 : 1)))

    setAnimatingId('story')
    setTimeout(() => setAnimatingId(null), 300)

    try {
      const response = await likeStory()
      const payload = (response as any)?.data ?? response

      if (typeof payload?.liked === 'boolean') {
        setIsLiked(payload.liked)
      }

      if (typeof payload?.likes === 'number') {
        setLikeCount(payload.likes)
      } else if (typeof payload?.likes_count === 'number') {
        setLikeCount(payload.likes_count)
      }
    } catch {
      // Revert optimistic update when request fails.
      setIsLiked(wasLiked)
      setLikeCount((prev) => Math.max(0, prev + (wasLiked ? 1 : -1)))
    }
  }

  // =========================
  // 💬 ADD COMMENT
  // =========================
  const handleAddComment = () => {
    if (!requireAuth()) return
    if (!commentInput.trim() || isBanned) return

    addComment({ content: commentInput })
    setCommentInput('')
  }

  // =========================
  // 🔁 ADD REPLY
  // =========================
  const handleAddReply = (parentId: string) => {
    if (!requireAuth()) return
    if (!replyInput.trim() || isBanned) return

    addComment({
      content: replyInput,
      parent_id: parentId,
    })

    setReplyInput('')
    setReplyingTo(null)
  }

  // =========================
  // 👍 LIKE COMMENT
  // =========================
  const handleLikeComment = async (id: string, currentLikes: number) => {
    if (!requireAuth()) return
    if (!id || isLikingComment) return

    const prev = commentLikeOverrides[id]
    const optimisticBase = prev?.count ?? currentLikes

    setCommentLikeOverrides((old) => ({
      ...old,
      [id]: {
        count: optimisticBase + 1,
        liked: true,
      },
    }))

    setAnimatingId(id)
    setTimeout(() => setAnimatingId(null), 300)

    try {
      const response = await likeComment(id)
      const payload = (response as any)?.data ?? response
      const nextCount = payload?.likes ?? payload?.likes_count ?? payload?.upvotes

      setCommentLikeOverrides((old) => ({
        ...old,
        [id]: {
          count: typeof nextCount === 'number' ? nextCount : old[id]?.count ?? optimisticBase + 1,
          liked: typeof payload?.liked === 'boolean' ? payload.liked : true,
        },
      }))
    } catch {
      setCommentLikeOverrides((old) => {
        const updated = { ...old }
        if (prev) {
          updated[id] = prev
        } else {
          delete updated[id]
        }
        return updated
      })
    }
  }

  // Delete this story (only shown to author)
  const handleDeleteStory = async () => {
    if (!window.confirm('Delete this story? This cannot be undone.')) return
    try {
      await apiClient.deleteBlog(id)
      setIsDeleted(true)
      showDeleteToast('Story deleted successfully', 'success')
    } catch (err: any) {
      const status = err?.response?.status
      if (status === 403) {
        showDeleteToast('You can only delete your own content', 'error')
      } else if (status === 401) {
        showDeleteToast('Session expired. Please log in again.', 'error')
      } else {
        showDeleteToast(err?.response?.data?.message || 'Failed to delete story', 'error')
      }
    }
  }

  // Delete a blog comment (only shown to comment author)
  const handleDeleteComment = (commentId: string) => {
    deleteComment(commentId)
    showDeleteToast('Comment deleted', 'success')
  }

  // =========================
  // 🔁 RENDER REPLIES
  // =========================
  const renderReplies = (replies: any[]) => {
    if (!replies?.length) return null

    return (
      <div className="ml-8 mt-3 space-y-3">
        {replies.map((reply) => (
          <div key={reply.id}>
            <div className="flex gap-2">
              <img
                src={reply.author.avatar || `https://ui-avatars.com/api/name=${encodeURIComponent(reply.author.name || 'User')}`}
                alt={reply.author.name}
                className="w-6 h-6 rounded-full"
              />
              <div className="flex-1">
                <div className="bg-gray-100 px-3 py-2 rounded-lg">
                  <p className="text-xs font-semibold">
                    {reply.author.name}
                  </p>
                  <p className="text-xs whitespace-pre-wrap break-words">{reply.content}</p>
                </div>

                <div className="flex gap-3 text-xs mt-1">
                  <button
                    onClick={() => handleLikeComment(reply.id, reply.likes)}
                    disabled={isBanned}
                    className="flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ color: animatingId === reply.id || commentLikeOverrides[reply.id]?.liked ? '#1d9bf0' : undefined }}
                  >
                    <ThumbsUp
                        className={`w-5 h-5 transition-all duration-200 ${
                          animatingId === reply.id ? 'scale-150 rotate-12' : ''
                        }`}
                      />
                    {commentLikeOverrides[reply.id]?.count ?? reply.likes}
                  </button>

                  <button
                    onClick={() =>
                      setReplyingTo(reply.id)
                    }
                    disabled={isBanned}
                    className="disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Reply
                  </button>
                  {currentUserId && currentUserId === reply.authorId && (
                    <button
                      onClick={() => handleDeleteComment(reply.id)}
                      className="flex items-center gap-1 text-red-500 hover:text-red-700 transition-colors"
                      title="Delete comment"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {replyingTo === reply.id && (
              <div className="ml-8 mt-2 flex gap-2 items-center">
                <input
                  value={replyInput}
                  onChange={(e) =>
                    setReplyInput(e.target.value)
                  }
                  disabled={isBanned}
                  placeholder="Write a reply..."
                  className="flex-1 min-w-0 border border-gray-200 rounded-full px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-black disabled:bg-gray-50 disabled:cursor-not-allowed"
                  autoFocus
                />
                <button
                  onClick={() =>
                    handleAddReply(reply.id)
                  }
                  disabled={isBanned}
                  className="shrink-0 px-4 py-2 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-400 disabled:bg-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
            )}

            {renderReplies(reply.replies)}
          </div>
        ))}
      </div>
    )
  }

  // =========================
  // UI
  // =========================
  // If no story data, show fallback UI
  if (!id && !storyTitle && !excerpt && !coverImage) {
    return (
      <div className="bg-white rounded-2xl border p-6 mb-4 flex flex-col items-center justify-center text-center">
        <span className="text-lg font-semibold text-gray-700 mb-2">No stories to display</span>
        <span className="text-sm text-gray-500 mb-4">Please share a story to get started!</span>
        <button
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#212529] text-white hover:bg-[#3D3D3D] transition-all duration-200"
          onClick={() => router.push('/?tab=stories&compose=1')}
        >
          Share a Story
        </button>
      </div>
    );
  }
  return (
    <>
      {/* Delete toast */}
      {deleteToast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 text-white text-sm font-medium px-5 py-3 rounded-full shadow-xl ${
          deleteToast.type === 'success' ? 'bg-gray-900' : 'bg-red-600'
        }`}>
          {deleteToast.message}
        </div>
      )}
      {/* Instagram-style saved toast */}
      {showSavedToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-full shadow-xl">
          <Bookmark className="w-4 h-4 fill-white" />
          Saved to your collection
        </div>
      )}
      {isDeleted ? null : (
      <div className="bg-white rounded-2xl border p-3 sm:p-6 mb-4">

        {/* HEADER */}
        <div className="flex justify-between mb-4">
          <div
            className="flex gap-3 cursor-pointer"
            onClick={() => authorId && router.push(profileHref(authorId, author.name))}
          >
            <img
              src={author.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(author.name)}&background=E8E8E8&color=212529&size=48`}
              alt={author.name}
              className="w-12 h-12 rounded-full"
            />
            <div>
              <h3 className="font-semibold hover:underline">
                {author.name}
              </h3>
              <p className="text-sm text-gray-500">
                {author.title}
              </p>
              <p className="text-xs text-gray-400">
                {getTimeAgo(timestamp)}
              </p>
            </div>
          </div>
          <div ref={actionMenuRef} className="relative">
            <button onClick={() => setShowActionMenu(!showActionMenu)}>
              <MoreVertical />
            </button>

            {showActionMenu && (
              <div className="absolute right-0 bg-white border rounded shadow p-2 flex gap-1">
                <button
                  onClick={handleSave}
                  className="group p-2 rounded transition-all duration-200 flex items-center gap-1 text-xs hover:bg-gray-100 hover:gap-2"
                  title={isSaved ? 'Unsave' : 'Save post'}
                  style={{ color: isSaved ? '#1d9bf0' : '#374151' }}
                >
                  {/* Bookmark Icon */}
                  <Bookmark
                    className={`w-4 h-4 transition-all duration-200 ${
                      isSaved ? 'fill-[#1d9bf0]' : ''
                    }`}
                  />

                  {/* Text (only on hover) */}
                  <span className="max-w-0 overflow-hidden group-hover:max-w-[80px] transition-all duration-200 whitespace-nowrap">
                    {isSaved ? 'Unsave' : 'Save'}
                  </span>
                </button>
                <button
                  onClick={followState === 'connected' ? unfollow : follow}
                  disabled={isBanned}
                  className="group p-2 rounded transition flex items-center gap-1 text-xs hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ color: '#374151' }}
                  title={
                    followState === 'connected'
                      ? 'Disconnect'
                      : followState === 'pending'
                      ? 'Requested'
                      : 'Connect'
                  }
                >
                  {/* Icon based on state */}
                  {followState === 'connected' ? (
                    <UserCheck className="w-4 h-4" />
                  ) : followState === 'pending' ? (
                    <UserMinus className="w-4 h-4" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}

                  {/* Text appears only on hover */}
                  <span className="max-w-0 overflow-hidden group-hover:max-w-[80px] transition-all duration-200 whitespace-nowrap">
                    {followState === 'connected'
                      ? 'Disconnect'
                      : followState === 'pending'
                      ? 'Requested'
                      : 'Connect'}
                  </span>
                </button>
                <button
                  onClick={() => {
                    setShowReportModal(true)
                    setShowActionMenu(false)
                  }}
                  title='Report'
                  className="group flex items-center gap-1 text-red-600 hover:bg-gray-100 px-2 py-1 rounded transition-all duration-200 hover:gap-2"
                >
                  <Flag className="w-4 h-4" />

                  <span className="max-w-0 overflow-hidden group-hover:max-w-[80px] transition-all duration-200 whitespace-nowrap">
                    Report
                  </span>
                </button>
                {currentUserId && currentUserId === authorId && (
                  <>
                    <button
                      onClick={() => {
                        setEditTitle(displayTitle)
                        setEditExcerpt(displayExcerpt)
                        setCoverPreview(displayCoverImage)
                        setNewCoverFile(null)
                        setEditError('')
                        setShowEditModal(true)
                        setShowActionMenu(false)
                      }}
                      title='Edit story'
                      className="group flex items-center gap-1 text-gray-700 hover:bg-gray-100 px-2 py-1 rounded transition-all duration-200 hover:gap-2"
                    >
                      <Pencil className="w-4 h-4 text-gray-600" />
                      <span className="max-w-0 overflow-hidden group-hover:max-w-[80px] transition-all duration-200 whitespace-nowrap">
                        Edit
                      </span>
                    </button>
                    <button
                      onClick={handleDeleteStory}
                      title='Delete story'
                      className="group flex items-center gap-1 text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-all duration-200 hover:gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="max-w-0 overflow-hidden group-hover:max-w-[80px] transition-all duration-200 whitespace-nowrap">
                        Delete
                      </span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* IMAGE */}
        {displayCoverImage && (
          <img
            src={displayCoverImage}
            alt={displayTitle}
            className="rounded-xl mb-4 cursor-pointer hover:opacity-90 transition-opacity max-h-96 w-full object-cover"
            onClick={() => {
              if (!id) return
              const storyData = {
                id,
                author,
                authorId,
                storyTitle: displayTitle,
                excerpt: displayExcerpt,
                coverImage: displayCoverImage,
                timestamp,
                likes: likeCount,
                liked: isLiked,
                comments: nestedComments.length,
                views,
              }
              openStory(storyData)
            }}
          />
        )}

        {/* CONTENT */}
        <h2
          className="font-semibold text-gray-800 cursor-pointer hover:underline"  
          onClick={() => {
            if (!id) return
            const storyData = {
              id,
              author,
              authorId,
              storyTitle: displayTitle,
              excerpt: displayExcerpt,
              coverImage: displayCoverImage,
              timestamp,
              likes: likeCount,
              liked: isLiked,
              comments: nestedComments.length,
              views,
            }
            openStory(storyData)
          }}
        >
          {displayTitle}
        </h2>

        <ExpandableText className="text-sm text-gray-600 whitespace-pre-wrap break-words" lines={4}>{displayExcerpt}</ExpandableText>  {/* add font-blod/semibold if you want a bit bold text for question */}

        {/* Hashtags */}
        {displayTags.length > 0 && (
          <div className="mt-3">
            <HashtagList tags={displayTags} badgeStyle />
          </div>
        )}

        {/* ACTION BAR */}
        <div className="flex flex-wrap gap-3 mt-4 border-y py-3">

          <button
            onClick={handleLike}
            disabled={isLiking || isBanned}
            className="flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ color: isLiked ? '#1d9bf0' : undefined }}
          >
            <ThumbsUp
              className={`w-5 h-5 transition-all duration-200 ${
                animatingId === 'story' ? 'scale-150 rotate-12' : ''
              } ${isLiked ? 'fill-[#1d9bf0]' : ''}`}
            />
            {likeCount}
          </button>

          <div>
            <Eye className="w-4 h-4 inline" /> {views}
          </div>

          <button
            onClick={() =>
              setShowComments(!showComments)
            }
          >
            <MessageCircle className="w-4 h-4 inline" />{' '}
            {nestedComments.length}
          </button>

          <button
            onClick={() => setShowShareModal(true)}
            className="ml-auto"
          >
            <Send />
          </button>
        </div>

        {/* COMMENTS */}
        {showComments && (
          <div className="mt-4 space-y-3">

            <div className="flex gap-2 items-center">
              <img
                src={reduxUser?.profile_photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(reduxUser?.full_name || 'User')}&background=E8E8E8&color=212529&size=32`}
                className="w-8 h-8 rounded-full object-cover shrink-0"
                alt="You"
              />
              <div className="flex-1 flex gap-2 min-w-0">
                <input
                  value={commentInput}
                  onChange={(e) =>
                    setCommentInput(e.target.value)
                  }
                  disabled={isBanned}
                  placeholder={isBanned ? 'Your account is restricted' : 'Add a comment...'}
                  className="flex-1 min-w-0 px-3 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-black disabled:bg-gray-50 disabled:cursor-not-allowed"
                />
                <button onClick={handleAddComment} disabled={isBanned} className="shrink-0 px-4 py-2 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-400 disabled:bg-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  Post
                </button>
              </div>
            </div>

            {nestedComments.map((c) => (
              <div key={c.id} className="flex gap-2">
                <img
                  src={c.author.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.author.name || 'User')}&background=E8E8E8&color=212529`}
                  alt={c.author.name || 'User'}
                  className="w-6 h-6 rounded-full object-cover flex-shrink-0 mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-xs font-semibold text-gray-900">{c.author.name}</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{c.content}</p>
                  </div>

                  <div className="flex gap-3 mt-1 px-1 text-xs text-gray-500">
                    <button
                      onClick={() =>
                        handleLikeComment(c.id, c.likes)
                      }
                      disabled={isBanned}
                      style={{ color: animatingId === c.id || commentLikeOverrides[c.id]?.liked ? '#1d9bf0' : undefined }}
                      className="flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ThumbsUp
                            className={`w-4 h-4 transition-all duration-200 ${
                              animatingId === c.id ? 'scale-150 rotate-12' : ''
                            }`}
                          /> {commentLikeOverrides[c.id]?.count ?? c.likes}
                    </button>

                    <button
                      onClick={() =>
                        setReplyingTo(c.id)
                      }
                      disabled={isBanned}
                      className="disabled:opacity-50 disabled:cursor-not-allowed hover:text-blue-600"
                    >
                      Reply
                    </button>

                    {currentUserId && currentUserId === c.authorId && (
                      <button
                        onClick={() => handleDeleteComment(c.id)}
                        className="flex items-center gap-1 text-red-500 hover:text-red-700 transition-colors"
                        title="Delete comment"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {replyingTo === c.id && (
                    <div className="flex gap-2 mt-2 items-center">
                      <input
                        value={replyInput}
                        onChange={(e) =>
                          setReplyInput(
                            e.target.value
                          )
                        }
                        disabled={isBanned}
                        placeholder="Write a reply..."
                        className="flex-1 min-w-0 text-xs border border-gray-200 rounded-full px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-black disabled:bg-gray-50 disabled:cursor-not-allowed"
                        autoFocus
                      />
                      <button
                        onClick={() =>
                          handleAddReply(c.id)
                        }
                        disabled={isBanned}
                        className="shrink-0 px-4 py-2 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-400 disabled:bg-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Send
                      </button>
                    </div>
                  )}

                  {renderReplies(c.replies)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Edit Story</h3>
              <button onClick={() => setShowEditModal(false)} className="rounded-full p-2 text-gray-500 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 max-h-[80vh] overflow-y-auto pr-1">
              {editError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {editError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Story Title / Caption</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="Enter story title or caption..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Content / Details</label>
                <textarea
                  value={editExcerpt}
                  onChange={(e) => setEditExcerpt(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="Write your story details..."
                />
              </div>

              {/* Cover Image Controls */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
                <label className="block text-xs font-semibold text-gray-700">Cover Image</label>
                {coverPreview ? (
                  <div className="relative inline-block">
                    <img src={coverPreview} alt="Cover Preview" className="h-32 w-full max-w-sm rounded-lg object-cover" />
                    <button
                      type="button"
                      onClick={() => { setCoverPreview(null); setNewCoverFile(null) }}
                      className="absolute -right-2 -top-2 rounded-full bg-red-600 p-1 text-white hover:bg-red-700 transition"
                      title="Remove Cover Image"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          const file = e.target.files[0]
                          setNewCoverFile(file)
                          setCoverPreview(URL.createObjectURL(file))
                        }
                      }}
                      className="block w-full text-xs text-gray-500"
                    />
                  </div>
                )}
              </div>

              {/* Visibility & Expiry Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Visibility</label>
                  <select
                    value={editVisibility}
                    onChange={(e: any) => setEditVisibility(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    <option value="PUBLIC">Public (Everyone)</option>
                    <option value="CONNECTIONS">Connections Only</option>
                    <option value="PRIVATE">Private (Only Me)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Expiry Settings</label>
                  <select
                    value={editExpiry}
                    onChange={(e: any) => setEditExpiry(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    <option value="24h">24 Hours</option>
                    <option value="48h">48 Hours</option>
                    <option value="never">Never Expire</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleEditStory}
                  disabled={editLoading || (!editTitle.trim() && !editExcerpt.trim())}
                  className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        postContent={displayExcerpt}
        contentType="stories"
        contentId={id}
      />

      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        contentId={id}
        contentType="blog"
      />
    </>
  )
}