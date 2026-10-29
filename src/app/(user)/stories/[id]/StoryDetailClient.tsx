'use client'

import { useRouter, useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  ArrowLeft,
  ThumbsUp,
  MessageCircle,
  Send,
  Clock,
  Eye,
} from 'lucide-react'
import apiClient from '@/lib/api-client'
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

interface Story {
  id: string
  title: string
  content: string
  coverImage?: string
  author: Author
  createdAt: string
  likes: number
  views: number
  tags: string[]
  readTime: string
}

interface Comment {
  id: string
  content: string
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

function estimateReadTime(text: string): string {
  const words = text.trim().split(/\s+/).length
  const mins = Math.max(1, Math.round(words / 200))
  return `${mins} min read`
}

/* ── Comment component ──────────────────────────────── */
function CommentItem({
  comment,
  storyId,
  onReplyAdded,
}: {
  comment: Comment
  storyId: string
  onReplyAdded: (parentId: string, reply: Comment) => void
}) {
  const [showReply, setShowReply] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleReply = async () => {
    if (!replyText.trim()) return
    setSubmitting(true)
    try {
      const data = await apiClient.addBlogComment(storyId, replyText.trim(), comment.id)
      onReplyAdded(comment.id, data)
      setReplyText('')
      setShowReply(false)
    } catch { /* silent */ }
    finally { setSubmitting(false) }
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
          <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: '#F8F9FA', border: '1px solid #E8E8E8' }}>
            <p className="text-sm font-semibold" style={{ color: '#212529' }}>{comment.user.full_name || comment.user.username}</p>
            <p className="text-sm mt-1 leading-relaxed whitespace-pre-wrap break-words" style={{ color: '#3D3D3D' }}>{comment.content}</p>
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

          {showReply && (
            <div className="mt-2 flex gap-2 pl-2">
              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                rows={2}
                placeholder="Write a reply..."
                className="flex-1 px-3 py-2 rounded-xl text-sm resize-none focus:outline-none"
                style={{ border: '1px solid #E8E8E8', backgroundColor: '#F8F9FA', color: '#212529' }}
              />
              <button
                onClick={handleReply}
                disabled={submitting || !replyText.trim()}
                className="self-end px-4 py-2 rounded-xl text-white text-sm disabled:opacity-50"
                style={{ backgroundColor: '#212529' }}
              >
                {submitting ? '...' : <Send className="w-4 h-4" />}
              </button>
            </div>
          )}

          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 ml-4 pl-4 space-y-3" style={{ borderLeft: '2px solid #E8E8E8' }}>
              {comment.replies.map(reply => (
                <CommentItem key={reply.id} comment={reply} storyId={storyId} onReplyAdded={onReplyAdded} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Main Page ──────────────────────────────────────── */
export default function StoryDetailPage() {
  const router = useRouter()
  const params = useParams()
  const storyId = params.id as string

  const [story, setStory] = useState<Story | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [likeCount, setLikeCount] = useState(0)
  const [isLiked, setIsLiked] = useState(false)

  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const requireAuth = useRequireAuth()

  /* fetch story (blog with type=STORY) */
  useEffect(() => {
    if (!storyId) return
    const load = async () => {
      try {
        const res = await apiClient.getBlogById(storyId)
        const d = res.data
        const text = d.content || ''
        const formatted: Story = {
          id: d.id,
          title: d.title || '',
          content: text,
          coverImage: d.cover_image && d.cover_image.startsWith('http') ? d.cover_image : undefined,
          author: {
            id: d.user?.id || '',
            name: d.user?.full_name || d.user?.username ,
            avatar: d.user?.profile_photo || '',
            profession: d.user?.profession || '',
          },
          createdAt: d.created_on || '',
          likes: Number(d.likes) || 0,
          views: Number(d.views) || 0,
          tags: (d.tags || []).map((t: any) => (typeof t === 'string' ? t : t.name)),
          readTime: estimateReadTime(text),
        }
        setStory(formatted)
        setLikeCount(formatted.likes)
        if (d.myVote !== undefined && d.myVote !== null) {
          if (typeof d.myVote === 'string') setIsLiked(d.myVote.toLowerCase() === 'up')
          else setIsLiked(Boolean(d.liked))
        } else if (typeof d.liked !== 'undefined') {
          setIsLiked(Boolean(d.liked))
        }
      } catch (err: any) {
        if (err?.response?.status === 404) setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [storyId])

  /* fetch comments */
  useEffect(() => {
    if (!storyId) return
    const load = async () => {
      try {
        const data = await apiClient.getBlogComments(storyId)
        setComments(Array.isArray(data) ? data : data?.data || [])
      } catch { /* silent */ }
    }
    load()
  }, [storyId])

  const handleLike = async () => {
    if (!requireAuth()) return
    if (!story) return
    try {
      const res = await apiClient.likeBlog(story.id)
      const data: any = res?.data ?? res
      if (data?.likes !== undefined) setLikeCount(data.likes)
      if (data?.myVote === null || data?.myVote === undefined) setIsLiked(false)
      else if (typeof data.myVote === 'string') setIsLiked(data.myVote.toLowerCase() === 'up')
      else setIsLiked(Boolean(data?.liked))
    } catch (err) {
      console.error(err)
      return
    }
  }

  const handleAddComment = async () => {
    if (!requireAuth()) return
    if (!commentText.trim() || !story) return
    setCommentSubmitting(true)
    try {
      const data = await apiClient.addBlogComment(story.id, commentText.trim())
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
      <div className="w-8 h-8 rounded-full border-4 animate-spin" style={{ borderColor: '#E8E8E8', borderTopColor: '#212529' }} />
    </div>
  )

  if (notFound || !story) return (
    <div className="p-6 min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: '#F8F9FA' }}>
      <p className="text-lg font-semibold" style={{ color: '#212529' }}>Story not found</p>
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm" style={{ color: '#1976D2' }}>
        <ArrowLeft className="w-4 h-4" /> Go back
      </button>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F9FA' }}>

      {/* Cover image (full-width)
      {story.coverImage && (
        <div className="w-full overflow-hidden relative">
          <img src={story.coverImage} alt={story.title} className="w-full h-72 md:h-96 object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.55))' }} />
        </div>
      )} */}

      <div className="p-3 sm:p-6">
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

          {/* Cover image (full-width) */}
          {story.coverImage && (
            <div className="w-full overflow-hidden relative mb-6 h-48 sm:h-64 md:h-80 rounded-xl">
              <img src={story.coverImage} alt={story.title} className="w-full h-full object-cover rounded-xl" />
              <div className="absolute inset-0 rounded-xl" style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.55))' }} />
            </div>
          )}

          {/* Story card */}
          <div className="bg-white rounded-2xl border p-6" style={{ border: '1px solid #E8E8E8' }}>
            {/* Title */}
            <h1 className="text-2xl font-bold mb-4 leading-tight whitespace-pre-wrap break-words" style={{ color: '#212529' }}>
              {story.title}
            </h1>

            {/* Author + meta row */}
            <div className="flex items-center gap-3 mb-5 pb-5" style={{ borderBottom: '1px solid #F0F0F0' }}>
              <img
                src={story.author.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(story.author.name)}&background=E8E8E8&color=212529&size=48`}
                alt={story.author.name}
                className="w-11 h-11 rounded-full object-cover"
              />
              <div className="flex-1">
                <p className="font-semibold text-sm" style={{ color: '#212529' }}>{story.author.name}</p>
                {story.author.profession && (
                  <p className="text-xs" style={{ color: '#5F6368' }}>{story.author.profession}</p>
                )}
              </div>
              <div className="flex items-center flex-wrap gap-2 text-xs" style={{ color: '#9E9E9E' }}>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {story.readTime}
                </span>
                <span>{timeAgo(story.createdAt)}</span>
              </div>
            </div>

            {/* Content */}
            <RichTextContent className="prose max-w-none text-base leading-relaxed whitespace-pre-wrap mb-5 break-words" style={{ color: '#212529' }} html={story.content} />

            {/* Tags */}
            {story.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-5">
                {story.tags.map(tag => (
                  <span key={tag} className="text-xs px-3 py-1 rounded-full font-medium"
                    style={{ backgroundColor: '#FFF8E1', color: '#F57F17' }}>
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Like + views row */}
            <div className="flex items-center flex-wrap gap-3 pt-4" style={{ borderTop: '1px solid #F0F0F0' }}>
              <button
                  onClick={handleLike}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{ backgroundColor: isLiked ? '#FFEBEE' : '#F8F9FA', color: isLiked ? '#E53935' : '#5F6368' }}
                >
                  <ThumbsUp className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                  {likeCount}
                </button>
              <div className="flex items-center gap-2 text-sm" style={{ color: '#5F6368' }}>
                <Eye className="w-4 h-4" /> {story.views}
              </div>
              <div className="flex items-center gap-2 text-sm" style={{ color: '#5F6368' }}>
                <MessageCircle className="w-4 h-4" /> {comments.length}
              </div>

              {/* ================== SHARE BUTTON ================== */}
                      <button
                        onClick={() => setShowShareModal(true)}
                        className="ml-auto"
                      >
                        <Send />
                      </button>
            </div>
          </div>

          {/* Comment input */}
          <div className="bg-white rounded-2xl border p-5" style={{ border: '1px solid #E8E8E8' }}>
            <p className="text-sm font-semibold mb-3" style={{ color: '#212529' }}>Leave a comment</p>
            <div className="flex flex-col gap-3">
              <textarea
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                rows={3}
                placeholder="Share your thoughts on this story..."
                className="w-full px-4 py-3 rounded-xl text-sm resize-none focus:outline-none focus:ring-2"
                style={{ border: '1px solid #E8E8E8', backgroundColor: '#F8F9FA', color: '#212529' }}
                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAddComment() }}
              />
              <div className="flex justify-end">
                <button
                  onClick={handleAddComment}
                  disabled={commentSubmitting || !commentText.trim()}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition-all"
                  style={{ backgroundColor: '#212529' }}
                  onMouseEnter={e => { if (!commentSubmitting && commentText.trim()) e.currentTarget.style.backgroundColor = '#3D3D3D' }}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#212529')}
                >
                  <Send className="w-4 h-4" />
                  {commentSubmitting ? 'Posting...' : 'Post Comment'}
                </button>
              </div>
            </div>
          </div>

          {/* Comments list */}
          {comments.length > 0 && (
            <div className="bg-white rounded-2xl border p-5 space-y-5" style={{ border: '1px solid #E8E8E8' }}>
              <p className="text-sm font-semibold" style={{ color: '#212529' }}>
                {comments.length} Comment{comments.length !== 1 ? 's' : ''}
              </p>
              {comments.map(c => (
                <CommentItem key={c.id} comment={c} storyId={story.id} onReplyAdded={handleReplyAdded} />
              ))}
            </div>
          )}

        </div>
      </div>

      <ShareModal
              isOpen={showShareModal}
              onClose={() => setShowShareModal(false)}
              postContent={story.content}
              contentType="stories"
              contentId={story.id}
            />
    </div>
  )
}
