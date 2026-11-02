'use client'

import { MessageCircle, ThumbsUp, Eye, Send, Trash2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { ShareModal } from '@/components/shared/ShareModal'
import { ContentData } from '@/hooks/useContentViewer'
import { useStoryLike } from '@/hooks/useStoryLike'
import { useStoryComments } from '@/hooks/useStoryComments'
import { useAccountStatus } from '@/hooks/useRedux'
import { getTimeAgo } from '@/lib/utils'
import ExpandableText from '@/components/common/ExpandableText'
import { useRequireAuth } from '@/hooks/useRequireAuth'

interface Props {
  data: ContentData
}

export function StoryViewCard({ data }: Props) {
  const requireAuth = useRequireAuth()
  const storyId = data.id

  const [isLiked, setIsLiked] = useState(Boolean(data.liked))
  const [likeCount, setLikeCount] = useState<number>(data.likes || 0)
  const [showComments, setShowComments] = useState(false)
  const [commentInput, setCommentInput] = useState('')
  const [replyInput, setReplyInput] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const [animatingId, setAnimatingId] = useState<string | null>(null)
  const [commentLikeOverrides, setCommentLikeOverrides] = useState<Record<string, { count: number; liked?: boolean }>>({})
  const [currentUserId, setCurrentUserId] = useState('')

  const { likeStory, isLiking } = useStoryLike(storyId)
  const { comments, addComment, likeComment, isLikingComment, deleteComment } = useStoryComments(storyId)
  const { isBanned } = useAccountStatus()

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}')
      setCurrentUserId(u.id || '')
    } catch {}
  }, [])

  // Reset comment like overrides when server data refreshes
  // Depend on comments length to avoid reacting to new array identities
  useEffect(() => {
    setCommentLikeOverrides({})
  }, [comments?.length])

  // =========================
  // 🧠 NEST COMMENTS
  // =========================
  const nestComments = (flat: any[]) => {
    const map: Record<string, any> = {}
    const roots: any[] = []

    flat.forEach((c) => {
      map[c.id] = {
        id: c.id,
        authorId: c.user?.id || '',
        content: c.content,
        likes: Number(c.likes ?? c.likes_count ?? c.upvotes ?? 0),
        timestamp: new Date(Number(c.created_on)).toLocaleString(),
        author: {
          name: c.user?.full_name || c.user?.username || 'Unknown',
          avatar:
            c.user?.profile_photo ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(c.user?.full_name || 'User')}&background=E8E8E8&color=212529&size=32`,
        },
        coverImage: c.cover_image,
        replies: [],
        parent: c.parent,
      }
    })

    flat.forEach((c) => {
      if (c.parent?.id && map[c.parent.id]) {
        map[c.parent.id].replies.push(map[c.id])
      } else {
        roots.push(map[c.id])
      }
    })

    return roots
  }

  const nestedComments = nestComments(comments)

  // =========================
  // ❤️ LIKE STORY
  // =========================
  const handleLike = async () => {
    if (!requireAuth()) return
    if (isLiking) return
    const wasLiked = isLiked
    setIsLiked(!wasLiked)
    setLikeCount((prev) => Math.max(0, prev + (wasLiked ? -1 : 1)))
    setAnimatingId('story')
    setTimeout(() => setAnimatingId(null), 300)
    try {
      const response = await likeStory()
      const payload = (response as any)?.data ?? response
      if (typeof payload?.liked === 'boolean') setIsLiked(payload.liked)
      if (typeof payload?.likes === 'number') setLikeCount(payload.likes)
      else if (typeof payload?.likes_count === 'number') setLikeCount(payload.likes_count)
    } catch {
      setIsLiked(wasLiked)
      setLikeCount((prev) => Math.max(0, prev + (wasLiked ? 1 : -1)))
    }
  }

  // =========================
  // 💬 COMMENT
  // =========================
  const handleAddComment = () => {
    if (!requireAuth()) return
    if (!commentInput.trim() || isBanned) return
    addComment({ content: commentInput })
    setCommentInput('')
  }

  const handleAddReply = (parentId: string) => {
    if (!requireAuth()) return
    if (!replyInput.trim() || isBanned) return
    addComment({ content: replyInput, parent_id: parentId })
    setReplyInput('')
    setReplyingTo(null)
  }

  // =========================
  // 👍 LIKE COMMENT
  // =========================
  const handleLikeComment = async (commentId: string, currentLikes: number) => {
    if (!requireAuth()) return
    if (isLikingComment) return
    const prev = commentLikeOverrides[commentId]
    const base = prev?.count ?? currentLikes
    setCommentLikeOverrides((old) => ({ ...old, [commentId]: { count: base + 1, liked: true } }))
    setAnimatingId(commentId)
    setTimeout(() => setAnimatingId(null), 300)
    try {
      const response = await likeComment(commentId)
      const payload = (response as any)?.data ?? response
      const nextCount = payload?.likes ?? payload?.likes_count ?? payload?.upvotes
      setCommentLikeOverrides((old) => ({
        ...old,
        [commentId]: {
          count: typeof nextCount === 'number' ? nextCount : old[commentId]?.count ?? base + 1,
          liked: typeof payload?.liked === 'boolean' ? payload.liked : true,
        },
      }))
    } catch {
      setCommentLikeOverrides((old) => {
        const updated = { ...old }
        prev ? (updated[commentId] = prev) : delete updated[commentId]
        return updated
      })
    }
  }

  // =========================
  // 🔁 RENDER REPLIES
  // =========================
  const renderReplies = (replies: any[]): React.ReactNode => {
    if (!replies?.length) return null
    return (
      <div className="ml-8 mt-3 space-y-3">
        {replies.map((reply) => (
          <div key={reply.id}>
            <div className="flex gap-2">
              <img
                src={reply.author.avatar}
                alt={reply.author.name}
                className="w-6 h-6 rounded-full object-cover flex-shrink-0"
              />
              <div className="flex-1">
                <div className="bg-gray-100 px-3 py-2 rounded-lg">
                  <p className="text-xs font-semibold">{reply.author.name}</p>
                  <p className="text-xs whitespace-pre-wrap break-words">{reply.content}</p>
                </div>
                <div className="flex gap-3 text-xs mt-1 text-gray-500">
                  <button
                    onClick={() => handleLikeComment(reply.id, reply.likes)}
                    disabled={isBanned}
                    className="flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    style={{ color: animatingId === reply.id || commentLikeOverrides[reply.id]?.liked ? '#1d9bf0' : undefined }}
                  >
                    <ThumbsUp className={`w-3.5 h-3.5 transition-all duration-200 ${animatingId === reply.id ? 'scale-150 rotate-12' : ''}`} />
                    {commentLikeOverrides[reply.id]?.count ?? reply.likes}
                  </button>
                  <button
                    onClick={() => {
                      if (!requireAuth()) return
                      setReplyingTo(reply.id)
                    }}
                    disabled={isBanned}
                    className="disabled:opacity-50"
                  >
                    Reply
                  </button>
                  {currentUserId && currentUserId === reply.authorId && (
                    <button onClick={() => deleteComment(reply.id)} className="text-red-500 hover:text-red-700 flex items-center gap-1">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            {replyingTo === reply.id && (
              <div className="ml-8 mt-2 flex gap-2">
                <input
                  value={replyInput}
                  onChange={(e) => setReplyInput(e.target.value)}
                  disabled={isBanned}
                  className="flex-1 border rounded-full px-3 py-1 text-xs disabled:bg-gray-50 disabled:cursor-not-allowed"
                  placeholder="Write a reply…"
                />
                <button onClick={() => handleAddReply(reply.id)} disabled={isBanned} className="text-xs font-medium text-blue-600 disabled:opacity-50">
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

  const author = data.author || {}
  const avatarSrc =
    author.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(author.name || 'User')}&background=E8E8E8&color=212529&size=48`

  return (
    <div className="space-y-4">

      {/* AUTHOR HEADER */}
      <div className="flex items-center gap-3">
        <img
          src={avatarSrc}
          alt={author.name || 'Author'}
          className="w-12 h-12 rounded-full object-cover flex-shrink-0"
        />
        <div>
          <h3 className="font-semibold text-gray-900">{author.name}</h3>
          {author.title && <p className="text-sm text-gray-500">{author.title}</p>}
          {data.timestamp && <p className="text-xs text-gray-400">{getTimeAgo(data.timestamp)}</p>}
        </div>
      </div>

      {/* COVER IMAGE */}
      {data.coverImage && (
        <img
          src={data.coverImage}
          alt={data.storyTitle || 'Cover'}
          className="w-full rounded-xl object-cover max-h-64"
        />
      )}

      {/* TITLE + CONTENT */}
      <h2 className="text-xl font-semibold text-gray-900">{data.storyTitle}</h2>
      {data.content && <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap break-words">
        <ExpandableText className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap break-words" lines={4}>{data.content}</ExpandableText>
        </div>}
      {data.excerpt && !data.content && <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap break-words">
        <ExpandableText className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap break-words" lines={4}>{data.excerpt}</ExpandableText>
        </div>}

      {/* ACTION BAR */}
      <div className="flex flex-wrap gap-4 border-t border-b py-3 text-sm text-gray-500">
        <button
          onClick={handleLike}
          disabled={isLiking || isBanned}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
            isLiked ? 'text-blue-600 bg-blue-50' : 'hover:bg-gray-50'
          }`}
        >
          <ThumbsUp
            className={`w-4 h-4 transition-all duration-200 ${animatingId === 'story' ? 'scale-150 rotate-12' : ''} ${isLiked ? 'fill-blue-600' : ''}`}
          />
          {likeCount}
        </button>

        <span className="flex items-center gap-1.5">
          <Eye className="w-4 h-4" /> {data.views || 0}
        </span>

        <button
          onClick={() => {
            if (!requireAuth()) return
            setShowComments(!showComments)
          }}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-gray-50 transition"
        >
          <MessageCircle className="w-4 h-4" /> {nestedComments.length}
        </button>

        <button
          onClick={() => {
            if (!requireAuth()) return
            setShowShareModal(true)
          }}
          className="ml-auto flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-gray-50 transition"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {/* COMMENTS SECTION */}
      {showComments && (
        <div className="space-y-4">
          {/* Comment input */}
          <div className="flex gap-2">
            <input
              value={commentInput}
              onFocus={() => { if (!requireAuth()) return }}
              onChange={(e) => setCommentInput(e.target.value)}
              disabled={isBanned}
              placeholder={isBanned ? 'Your account is restricted' : 'Add a comment…'}
              className="flex-1 border rounded-full px-4 py-2 text-sm disabled:bg-gray-50 disabled:cursor-not-allowed focus:outline-none focus:border-gray-400 transition"
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment() }}
            />
            <button
              onClick={handleAddComment}
              disabled={isBanned || !commentInput.trim()}
              className="px-4 py-2 bg-black text-white text-sm rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Post
            </button>
          </div>

          {/* Comments list */}
          {nestedComments.map((c) => (
            <div key={c.id}>
              <div className="flex gap-2">
                <img
                  src={c.author.avatar}
                  alt={c.author.name}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />
                <div className="flex-1">
                  <div className="bg-gray-100 px-3 py-2 rounded-lg">
                    <p className="text-xs font-semibold text-gray-800">{c.author.name}</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{c.content}</p>
                  </div>
                  <div className="flex gap-3 text-xs mt-1 text-gray-500">
                    <button
                      onClick={() => handleLikeComment(c.id, c.likes)}
                      disabled={isBanned}
                      className="flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      style={{ color: animatingId === c.id || commentLikeOverrides[c.id]?.liked ? '#1d9bf0' : undefined }}
                    >
                      <ThumbsUp className={`w-3.5 h-3.5 transition-all duration-200 ${animatingId === c.id ? 'scale-150 rotate-12' : ''}`} />
                      {commentLikeOverrides[c.id]?.count ?? c.likes}
                    </button>
                    <button
                      onClick={() => {
                        if (!requireAuth()) return
                        setReplyingTo(replyingTo === c.id ? null : c.id)
                      }}
                      disabled={isBanned}
                      className="disabled:opacity-50"
                    >
                      Reply
                    </button>
                    {currentUserId && currentUserId === c.authorId && (
                      <button onClick={() => deleteComment(c.id)} className="text-red-500 hover:text-red-700 flex items-center gap-1">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {replyingTo === c.id && (
                <div className="ml-10 mt-2 flex gap-2">
                  <input
                    value={replyInput}
                    onChange={(e) => setReplyInput(e.target.value)}
                    disabled={isBanned}
                    placeholder="Write a reply…"
                    className="flex-1 border rounded-full px-3 py-1 text-xs disabled:bg-gray-50 disabled:cursor-not-allowed focus:outline-none focus:border-gray-400 transition"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddReply(c.id) }}
                  />
                  <button onClick={() => handleAddReply(c.id)} disabled={isBanned} className="text-xs font-medium text-blue-600 disabled:opacity-50">
                    Send
                  </button>
                </div>
              )}

              {renderReplies(c.replies)}
            </div>
          ))}

          {nestedComments.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No comments yet. Be the first!</p>
          )}
        </div>
      )}

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        postContent={data.content || data.excerpt || ''}
        contentType="stories"
        contentId={storyId}
      />
    </div>
  )
}