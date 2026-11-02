'use client'

import { useRouter, useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  ArrowLeft,
  ThumbsUp,
  // ThumbsDown,
  MessageCircle,
  Send,
//   CornerDownRight,
} from 'lucide-react'
import apiClient from '@/lib/api-client'
import { MediaGrid, MediaItem } from '@/components/shared/MediaGrid'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { ShareModal } from '@/components/shared/ShareModal'
import RichTextContent from '@/components/common/RichTextContent'

/* ── Types ─────────────────────────────────────────── */
interface Author {
  id: string
  name: string
  avatar: string
  profession: string
}

interface Post {
  id: string
  type: string
  content: string
  image?: string
  video?: string
  media?: MediaItem[]
  author: Author
  createdAt: string
  upvotes: number
  downvotes: number
  tags: string[]
}

interface Comment {
  id: string
  comment: string
  created_on: string
  user: { id: string; full_name?: string; username: string; profile_photo?: string }
  replies?: Comment[]
}

/* ── Helpers ────────────────────────────────────────── */
function timeAgo(value: string | number): string {
  const ms = typeof value === 'number' ? value : Number(value)
  const diff = Date.now() - (ms < 1e12 ? ms * 1000 : ms)
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24); if (d < 30) return `${d}d ago`
  return new Date(ms < 1e12 ? ms * 1000 : ms).toLocaleDateString()
}

/* ── Comment component ──────────────────────────────── */
function CommentItem({
  comment,
  postId,
  onReplyAdded,
}: {
  comment: Comment
  postId: string
  onReplyAdded: (parentId: string, reply: Comment) => void
}) {
  const [showReply, setShowReply] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleReply = async () => {
    if (!replyText.trim()) return
    setSubmitting(true)
    try {
      const data = await apiClient.addPostComment(postId, replyText.trim(), comment.id)
      onReplyAdded(comment.id, data)
      setReplyText('')
      setShowReply(false)
    } catch {
      // silent
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="flex gap-3">
        <img
          src={comment.user.profile_photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user.full_name || comment.user.username)}&background=E8E8E8&color=212529&size=40`}
          alt={comment.user.full_name || comment.user.username}
          className="w-9 h-9 rounded-full object-cover shrink-0"
        />
        <div className="flex-1">
          <div className="bg-gray-50 rounded-2xl px-4 py-3" style={{ border: '1px solid #E8E8E8' }}>
            <p className="text-sm font-semibold" style={{ color: '#212529' }}>{comment.user.full_name || comment.user.username}</p>
            <p className="text-sm mt-0.5 whitespace-pre-wrap break-words" style={{ color: '#3D3D3D' }}>{comment.comment}</p>
          </div>
          <div className="flex items-center gap-4 mt-1 px-2">
            <span className="text-xs" style={{ color: '#5F6368' }}>{timeAgo(comment.created_on)}</span>
            <button
              className="text-xs font-medium transition-colors"
              style={{ color: '#5F6368' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#1976D2')}
              onMouseLeave={e => (e.currentTarget.style.color = '#5F6368')}
              onClick={() => setShowReply(v => !v)}
            >
              Reply
            </button>
          </div>

          {/* Reply box */}
          {showReply && (
            <div className="mt-2 flex gap-2 pl-2">
              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                rows={2}
                placeholder="Write a reply..."
                className="flex-1 px-3 py-2 rounded-xl text-sm resize-none focus:outline-none focus:ring-2"
                style={{ border: '1px solid #E8E8E8', backgroundColor: '#F8F9FA', color: '#212529' }}
              />
              <button
                onClick={handleReply}
                disabled={submitting || !replyText.trim()}
                className="self-end px-4 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
                style={{ backgroundColor: '#212529' }}
              >
                {submitting ? '...' : <Send className="w-4 h-4" />}
              </button>
            </div>
          )}

          {/* Nested replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 ml-4 pl-4 space-y-3" style={{ borderLeft: '2px solid #E8E8E8' }}>
              {comment.replies.map(reply => (
                <CommentItem key={reply.id} comment={reply} postId={postId} onReplyAdded={onReplyAdded} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Main Page ──────────────────────────────────────── */
export default function PostDetailPage() {
  const router = useRouter()
  const params = useParams()
  const postId = params.id as string

  const [post, setPost] = useState<Post | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // const [downvoted, setDownvoted] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  // const [downvotes, setDownvotes] = useState(0)

  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const requireAuth = useRequireAuth()

  /* fetch post */
  useEffect(() => {
    if (!postId) return
    const load = async () => {
      try {
        const res = await apiClient.getPostById(postId)
        const d = res.data

        if (d.type === 'QUESTION') {
          router.replace(`/questions/${postId}`)
          return
        }

        const formatted: Post = {
          id: d.id,
          type: d.type || 'POST',
          content: d.content,
          image: d.image && d.image.startsWith('http') ? d.image : undefined,
          media: (d.media || []).map((m: any) => ({ url: m.url, type: m.type as 'image' | 'video' })),
          author: {
            id: d.user?.id || '',
            name: d.user?.full_name || d.user?.username ,
            avatar: d.user?.profile_photo || '',
            profession: d.user?.profession || '',
          },
          createdAt: d.created_on || '',
          upvotes: Number(d.upvotes) || 0,
          downvotes: Number(d.downvotes) || 0,
          tags: (d.tags || []).map((t: any) => (typeof t === 'string' ? t : t.name)),
        }
        setPost(formatted)
        setLikeCount(formatted.upvotes)
        if (d.myVote !== undefined && d.myVote !== null) {
          if (typeof d.myVote === 'string') setIsLiked(d.myVote.toLowerCase() === 'up')
          else setIsLiked(Boolean(d.liked))
        } else if (typeof d.liked !== 'undefined') {
          setIsLiked(Boolean(d.liked))
        }
        // setDownvotes(formatted.downvotes)
      } catch (err: any) {
        if (err?.response?.status === 404) setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [postId, router])
  useEffect(() => {
    if (!postId) return
    const load = async () => {
      try {
        const data = await apiClient.getPostComments(postId)
        setComments(Array.isArray(data) ? data : data?.data || [])
      } catch { /* silent */ }
    }
    load()
  }, [postId])

  const handleVote = async (dir: 'up' | 'down') => {
    if (!requireAuth()) return
    if (!post) return
    try {
      const res = await apiClient.votePost(post.id, dir)
      const data: any = res?.data ?? res
      if (data?.upvotes !== undefined) {
        setLikeCount(data.upvotes)
      }
      if (data?.myVote === null || data?.myVote === undefined) setIsLiked(false)
      else if (typeof data.myVote === 'string') setIsLiked(data.myVote.toLowerCase() === 'up')
      else setIsLiked(Boolean(data?.liked))
    } catch (err: any) {
        console.error(err)

        return
      }
    }

  const handleAddComment = async () => {
    if (!requireAuth()) return
    if (!commentText.trim() || !post) return
    setCommentSubmitting(true)
    try {
      const data = await apiClient.addPostComment(post.id, commentText.trim())
      setComments(prev => [data, ...prev])
      setCommentText('')
    } catch { /* silent */ }
    finally { setCommentSubmitting(false) }
  }

  const handleReplyAdded = (parentId: string, reply: Comment) => {
    if (!requireAuth()) return
    const addReply = (list: Comment[]): Comment[] =>
      list.map(c =>
        c.id === parentId
          ? { ...c, replies: [...(c.replies || []), reply] }
          : { ...c, replies: c.replies ? addReply(c.replies) : [] }
      )
    setComments(prev => addReply(prev))
  }

  if (loading) return (
    <div className="p-6 min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F9FA' }}>
      <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: '#212529', borderTopColor: 'transparent' }} />
    </div>
  )

  if (notFound || !post) return (
    <div className="p-6 min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: '#F8F9FA' }}>
      <p className="text-lg font-semibold" style={{ color: '#212529' }}>Post not found</p>
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm" style={{ color: '#1976D2' }}>
        <ArrowLeft className="w-4 h-4" /> Go back
      </button>
    </div>
  )

  return (
    <div className="p-6 min-h-screen" style={{ backgroundColor: '#F8F9FA' }}>
      <div className="max-w-2xl mx-auto space-y-4">

        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm font-medium transition-colors mb-2"
          style={{ color: '#5F6368' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#212529')}
          onMouseLeave={e => (e.currentTarget.style.color = '#5F6368')}
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Post card */}
        <div className="bg-white rounded-2xl border p-6" style={{ border: '1px solid #E8E8E8' }}>
          {/* Author */}
          <div className="flex items-start gap-3 mb-4">
            <img
              src={post.author.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author.name)}&background=E8E8E8&color=212529&size=48`}
              alt={post.author.name}
              className="w-12 h-12 rounded-full object-cover"
            />
            <div>
              <p className="font-semibold" style={{ color: '#212529' }}>{post.author.name}</p>
              {post.author.profession && (
                <p className="text-sm" style={{ color: '#5F6368' }}>{post.author.profession}</p>
              )}
              <p className="text-xs mt-0.5" style={{ color: '#9E9E9E' }}>{timeAgo(post.createdAt)}</p>
            </div>
          </div>

          {/* Content */}
          <RichTextContent className="text-base leading-relaxed whitespace-pre-wrap break-words mb-4" style={{ color: '#212529' }} html={post.content} />

          {/* Media */}
          {(() => {
            const mediaItems: MediaItem[] = post.media && post.media.length > 0
              ? post.media
              : [
                  ...(post.image ? [{ url: post.image, type: 'image' as const }] : []),
                  ...(post.video ? [{ url: post.video, type: 'video' as const }] : []),
                ]
            return mediaItems.length > 0 ? <MediaGrid media={mediaItems} /> : null
          })()}

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags.map(tag => (
                <span key={tag} className="text-xs px-3 py-1 rounded-full font-medium"
                  style={{ backgroundColor: '#E3F2FD', color: '#1976D2' }}>
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Vote row */}
          <div className="flex items-center gap-4 pt-4" style={{ borderTop: '1px solid #F0F0F0' }}>
            <button
              onClick={() => handleVote('up')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{ backgroundColor: isLiked ? '#E3F2FD' : '#F8F9FA', color: isLiked ? '#1976D2' : '#5F6368' }}
            >
              <ThumbsUp className="w-4 h-4" /> {likeCount}
            </button>
            {/* <button
              onClick={() => handleVote('down')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{ backgroundColor: downvoted ? '#FFF3E0' : '#F8F9FA', color: downvoted ? '#E65100' : '#5F6368' }}
            >
              <ThumbsDown className="w-4 h-4" /> {downvotes}
            </button> */}
            {/* ================== SHARE BUTTON ================== */}
                    <button
                      onClick={() => setShowShareModal(true)}
                      className="ml-auto"
                    >
                      <Send />
                    </button>
            <div className="flex items-center gap-2 px-4 py-2 text-sm" style={{ color: '#5F6368' }}>
              <MessageCircle className="w-4 h-4" /> {comments.length}
            </div>
          </div>
        </div>

        {/* Comment input */}
        <div className="bg-white rounded-2xl border p-5" style={{ border: '1px solid #E8E8E8' }}>
          <p className="text-sm font-semibold mb-3" style={{ color: '#212529' }}>Leave a comment</p>
          <div className="flex gap-3">
            <textarea
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              rows={3}
              placeholder="Write your comment..."
              className="flex-1 px-4 py-3 rounded-xl text-sm resize-none focus:outline-none focus:ring-2"
              style={{ border: '1px solid #E8E8E8', backgroundColor: '#F8F9FA', color: '#212529' }}
              onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAddComment() }}
            />
          </div>
          <div className="flex justify-end mt-3">
            <button
              onClick={handleAddComment}
              disabled={commentSubmitting || !commentText.trim()}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition-all"
              style={{ backgroundColor: '#212529' }}
              onMouseEnter={e => { if (!commentSubmitting && commentText.trim()) e.currentTarget.style.backgroundColor = '#3D3D3D' }}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#212529')}
            >
              <Send className="w-4 h-4" /> {commentSubmitting ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        </div>

        {/* Comments list */}
        {comments.length > 0 && (
          <div className="bg-white rounded-2xl border p-5 space-y-5" style={{ border: '1px solid #E8E8E8' }}>
            <p className="text-sm font-semibold" style={{ color: '#212529' }}>
              {comments.length} Comment{comments.length !== 1 ? 's' : ''}
            </p>
            {comments.map(c => (
              <CommentItem key={c.id} comment={c} postId={post.id} onReplyAdded={handleReplyAdded} />
            ))}
          </div>
        )}

      </div>

      {/* Share Modal */}
            <ShareModal
              isOpen={showShareModal}
              onClose={() => setShowShareModal(false)}
              postContent={post.content}
              contentType="posts"
              contentId={post.id}
            />
    </div>
  )
}
