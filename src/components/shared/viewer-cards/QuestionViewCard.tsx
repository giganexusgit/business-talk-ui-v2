'use client'

import { MessageCircle, ThumbsUp, ThumbsDown, Eye, Send, PenLine, Trash2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { ShareModal } from '@/components/shared/ShareModal'
import { ContentData } from '@/hooks/useContentViewer'
import apiClient from '@/lib/api-client'
import { useAccountStatus } from '@/hooks/useRedux'
import { getTimeAgo } from '@/lib/utils'
import ExpandableText from '@/components/common/ExpandableText'
import { HashtagList } from '@/lib/hashtag'

interface Props {
  data: ContentData
}

interface Answer {
  id: string
  authorId: string
  author: { name: string; avatar: string; title: string }
  content: string
  timestamp: string
  likes: number
  dislikes: number
  replies: Answer[]
  parent: any
}

export function QuestionViewCard({ data }: Props) {
  const postId = data.id

  const [isLiked, setIsLiked] = useState(Boolean(data.liked ?? data.myVote === 'up'))
  const [likeCount, setLikeCount] = useState<number>(data.likes || 0)
  const [answersList, setAnswersList] = useState<Answer[]>([])
  const [showAnswers, setShowAnswers] = useState(false)
  const [showAnswerBox, setShowAnswerBox] = useState(false)
  const [answerInput, setAnswerInput] = useState('')
  const [replyInput, setReplyInput] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [likedAnswers, setLikedAnswers] = useState<Set<string>>(new Set())
  const [dislikedAnswers, setDislikedAnswers] = useState<Set<string>>(new Set())
  const [animatingId, setAnimatingId] = useState<string | null>(null)
  const [dislikeAnimatingId, setDislikeAnimatingId] = useState<string | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const [currentUserId, setCurrentUserId] = useState('')

  const { isBanned } = useAccountStatus()

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}')
      setCurrentUserId(u.id || '')
    } catch {}
  }, [])

  // =========================
  // 🧠 MAP + NEST ANSWERS
  // =========================
  const mapApiAnswer = (c: any): Answer => ({
    id: c.id,
    authorId: c.user?.id || '',
    author: {
      name: c.user?.full_name || c.user?.username || 'Unknown',
      avatar:
        c.user?.profile_photo ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(c.user?.full_name || 'User')}&background=E8E8E8&color=212529&size=32`,
      title: c.user?.profession || '',
    },
    content: c.comment || c.content || '',
    timestamp: new Date(Number(c.created_on)).toLocaleString(),
    likes: c.likes || 0,
    dislikes: c.dislikes || 0,
    replies: [],
    parent: c.parent || null,
  })

  const nestAnswers = (flat: any[]): Answer[] => {
    const map: Record<string, Answer> = {}
    const roots: Answer[] = []
    flat.forEach((c) => { map[c.id] = { ...mapApiAnswer(c), replies: [] } })
    flat.forEach((c) => {
      if (c.parent?.id && map[c.parent.id]) {
        map[c.parent.id].replies.push(map[c.id])
      } else {
        roots.push(map[c.id])
      }
    })
    return roots
  }

  // =========================
  // 🔄 FETCH ANSWERS
  // =========================
  useEffect(() => {
    if (!postId) return
    apiClient.getPostComments(postId)
      .then((res) => setAnswersList(nestAnswers(res)))
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId])

  // =========================
  // ❓ LIKE QUESTION
  // =========================
  const handleLikeQuestion = async () => {
    if (isBanned) return
    const wasLiked = isLiked
    setIsLiked(!wasLiked)
    setLikeCount((prev) => Math.max(0, prev + (wasLiked ? -1 : 1)))
    setAnimatingId('question')
    setTimeout(() => setAnimatingId(null), 300)
    try {
      const res = await apiClient.votePost(postId, 'up')
      setLikeCount(res.upvotes ?? likeCount)
      setIsLiked(res.myVote === 'up' || Boolean(res.liked))
    } catch {
      setIsLiked(wasLiked)
      setLikeCount((prev) => Math.max(0, prev + (wasLiked ? 1 : -1)))
    }
  }

  // =========================
  // ➕ POST ANSWER
  // =========================
  const handlePostAnswer = async () => {
    if (!answerInput.trim() || isBanned) return
    try {
      await apiClient.addPostComment(postId, answerInput)
      const updated = await apiClient.getPostComments(postId)
      setAnswersList(nestAnswers(updated))
      setAnswerInput('')
      setShowAnswerBox(false)
      setShowAnswers(true)
    } catch {}
  }

  // =========================
  // 💬 REPLY
  // =========================
  const handleAddReply = async (answerId: string, parentReplyId?: string) => {
    if (!replyInput.trim() || isBanned) return
    try {
      await apiClient.addPostComment(postId, replyInput, parentReplyId || answerId)
      const updated = await apiClient.getPostComments(postId)
      setAnswersList(nestAnswers(updated))
      setReplyInput('')
      setReplyingTo(null)
    } catch {}
  }

  // =========================
  // 👍 VOTE ANSWER
  // =========================
  const updateAnswerVotes = (list: Answer[], targetId: string, upvotes?: number, downvotes?: number): Answer[] =>
    list.map((a) =>
      a.id === targetId
        ? { ...a, ...(upvotes !== undefined ? { likes: upvotes } : {}), ...(downvotes !== undefined ? { dislikes: downvotes } : {}) }
        : { ...a, replies: updateAnswerVotes(a.replies || [], targetId, upvotes, downvotes) }
    )

  const handleVoteAnswer = async (answerId: string, vote: 'up' | 'down') => {
    if (isBanned) return
    if (vote === 'up') {
      setAnimatingId(answerId)
      setTimeout(() => setAnimatingId(null), 300)
      setLikedAnswers((prev) => { const n = new Set(prev); n.has(answerId) ? n.delete(answerId) : n.add(answerId); return n })
      setDislikedAnswers((prev) => { if (!prev.has(answerId)) return prev; const n = new Set(prev); n.delete(answerId); return n })
    } else {
      setDislikeAnimatingId(answerId)
      setTimeout(() => setDislikeAnimatingId(null), 300)
      setDislikedAnswers((prev) => { const n = new Set(prev); n.has(answerId) ? n.delete(answerId) : n.add(answerId); return n })
      setLikedAnswers((prev) => { if (!prev.has(answerId)) return prev; const n = new Set(prev); n.delete(answerId); return n })
    }
    try {
      const res = await apiClient.voteComment(answerId, vote)
      if (res?.upvotes !== undefined || res?.downvotes !== undefined) {
        setAnswersList((prev) => updateAnswerVotes(prev, answerId, res.upvotes, res.downvotes))
      } else {
        const updated = await apiClient.getPostComments(postId)
        setAnswersList(nestAnswers(updated))
      }
    } catch {}
  }

  // =========================
  // 🗑️ DELETE ANSWER
  // =========================
  const removeAnswerRecursive = (list: Answer[], targetId: string): Answer[] =>
    list.filter((a) => String(a.id) !== targetId).map((a) => ({ ...a, replies: removeAnswerRecursive(a.replies || [], targetId) }))

  const handleDeleteAnswer = async (answerId: string) => {
    try {
      await apiClient.deletePostComment(answerId)
      setAnswersList((prev) => removeAnswerRecursive(prev, String(answerId)))
    } catch {}
  }

  // =========================
  // 🔁 RENDER REPLIES
  // =========================
  const renderReplies = (replies: Answer[], rootId: string): React.ReactNode => {
    if (!replies?.length) return null
    return (
      <div className="ml-8 mt-3 space-y-3">
        {replies.map((reply) => (
          <div key={reply.id}>
            <div className="flex gap-2">
              <img src={reply.author.avatar} alt={reply.author.name} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
              <div className="flex-1">
                <div className="bg-gray-100 px-3 py-2 rounded-lg">
                  <p className="text-xs font-semibold">{reply.author.name}</p>
                  <p className="text-xs whitespace-pre-wrap break-words">{reply.content}</p>
                </div>
                <div className="flex gap-3 text-xs mt-1 text-gray-500">
                  <button
                    onClick={() => handleVoteAnswer(reply.id, 'up')}
                    disabled={isBanned}
                    className="flex items-center gap-1 disabled:opacity-50 transition-colors"
                    style={{ color: likedAnswers.has(reply.id) ? '#1d9bf0' : undefined }}
                  >
                    <ThumbsUp className={`w-3.5 h-3.5 transition-all duration-200 ${animatingId === reply.id ? 'scale-150 rotate-12' : ''}`} />
                    {reply.likes}
                  </button>
                  <button
                    onClick={() => handleVoteAnswer(reply.id, 'down')}
                    disabled={isBanned}
                    className={`flex items-center gap-1 disabled:opacity-50 transition-colors ${dislikedAnswers.has(reply.id) ? 'text-red-500' : ''}`}
                  >
                    <ThumbsDown className={`w-3.5 h-3.5 transition-all duration-200 ${dislikeAnimatingId === reply.id ? 'scale-150 -rotate-12' : ''}`} />
                    {reply.dislikes}
                  </button>
                  <button onClick={() => setReplyingTo(reply.id)} disabled={isBanned} className="disabled:opacity-50">Reply</button>
                  {currentUserId && currentUserId === reply.authorId && (
                    <button onClick={() => handleDeleteAnswer(reply.id)} className="text-red-500 hover:text-red-700 flex items-center gap-1">
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
                  placeholder="Write a reply…"
                  className="flex-1 border rounded-full px-3 py-1 text-xs disabled:bg-gray-50 focus:outline-none focus:border-gray-400 transition"
                />
                <button onClick={() => handleAddReply(rootId, reply.id)} disabled={isBanned} className="text-xs font-medium text-blue-600 disabled:opacity-50">Send</button>
              </div>
            )}
            {renderReplies(reply.replies || [], rootId)}
          </div>
        ))}
      </div>
    )
  }

  const rawAuthor = data.author || {}
  const authorName =
    typeof rawAuthor === 'string'
      ? rawAuthor
      : rawAuthor?.full_name || rawAuthor?.name || rawAuthor?.username || ''
  const authorTitle = typeof rawAuthor === 'object' && rawAuthor ? rawAuthor.title || '' : ''
  const avatarSrc =
    (typeof rawAuthor === 'object' && rawAuthor?.avatar) ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName || 'User')}&background=E8E8E8&color=212529&size=48`
  const displayQuestion = String(data.question ?? data.content ?? '')

  return (
    <div className="space-y-4">

      {/* AUTHOR HEADER */}
      <div className="flex items-center gap-3">
          <img
            src={avatarSrc}
            alt={authorName || 'Author'}
            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
          />
          <div>
            <h3 className="font-semibold text-gray-900">{authorName}</h3>
            {authorTitle && <p className="text-sm text-gray-500">{authorTitle}</p>}
            {data.timestamp && <p className="text-xs text-gray-400">{getTimeAgo(data.timestamp)}</p>}
          </div>
      </div>

      {/* QUESTION */}
      <p className="text-gray-900 whitespace-pre-wrap break-words">
        <ExpandableText className="text-gray-900 whitespace-pre-wrap break-words" lines={4}>{displayQuestion}</ExpandableText>
        </p>  {/* text-lg font-semibold  */}

      {/* Tags */}
      {data.tags?.length > 0 && (
        <div>
          <HashtagList tags={data.tags} badgeStyle />
        </div>
      )}

      {/* ACTION BAR */}
      <div className="flex flex-wrap gap-3 border-t border-b py-3 text-sm text-gray-500">
        <button
          onClick={handleLikeQuestion}
          disabled={isBanned}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200 active:scale-90 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 ${
            isLiked ? 'bg-blue-50 text-blue-600 scale-105' : 'hover:bg-blue-50 hover:text-blue-600'
          }`}
        >
          <ThumbsUp className={`w-4 h-4 transition-all duration-200 ${animatingId === 'question' ? 'scale-150 rotate-12' : ''}`} />
          {likeCount}
        </button>

        <button
          onClick={() => setShowAnswers(!showAnswers)}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-gray-50 transition"
        >
          <MessageCircle className="w-4 h-4" /> {answersList.length} Answers
        </button>

        <span className="flex items-center gap-1.5">
          <Eye className="w-4 h-4" /> {data.views || 0}
        </span>

        <button onClick={() => setShowShareModal(true)} className="ml-auto flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-gray-50 transition">
          <Send className="w-4 h-4" />
        </button>
      </div>

      {/* ANSWER INPUT */}
      {!showAnswerBox ? (
        <button
          onClick={() => setShowAnswerBox(true)}
          disabled={isBanned}
          className="w-full border rounded-full py-2.5 flex items-center gap-2 justify-center text-sm text-gray-500 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PenLine className="w-4 h-4" /> Write your answer
        </button>
      ) : (
        <div className="space-y-2">
          <textarea
            value={answerInput}
            onChange={(e) => setAnswerInput(e.target.value)}
            disabled={isBanned}
            rows={3}
            placeholder={isBanned ? 'Your account is restricted' : 'Share your answer…'}
            className="w-full border rounded-xl p-3 text-sm resize-none disabled:bg-gray-50 disabled:cursor-not-allowed focus:outline-none focus:border-gray-400 transition"
          />
          <div className="flex gap-2">
            <button
              onClick={handlePostAnswer}
              disabled={isBanned || !answerInput.trim()}
              className="px-4 py-2 bg-black text-white text-sm rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Post Answer
            </button>
            <button onClick={() => setShowAnswerBox(false)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-full transition">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ANSWERS LIST */}
      {showAnswers && (
        <div className="space-y-4 mt-2">
          {answersList.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No answers yet. Be the first!</p>
          )}
          {answersList.map((answer) => (
            <div key={answer.id} className="bg-gray-50 rounded-xl p-4">
              <div className="flex gap-3 mb-2">
                <img src={answer.author.avatar} alt={answer.author.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">{answer.author.name}</p>
                  {answer.author.title && <p className="text-xs text-gray-400">{answer.author.title}</p>}
                </div>
              </div>

              <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap break-words">{answer.content}</p>

              <div className="flex gap-3 text-sm text-gray-500">
                <button
                  onClick={() => handleVoteAnswer(answer.id, 'up')}
                  disabled={isBanned}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all duration-200 active:scale-90 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
                    likedAnswers.has(answer.id) ? 'bg-blue-50 text-blue-600 scale-105' : 'hover:bg-blue-50 hover:text-blue-600'
                  }`}
                >
                  <ThumbsUp className={`w-4 h-4 transition-all duration-200 ${animatingId === answer.id ? 'scale-150 rotate-12' : ''}`} />
                  Agree ({answer.likes})
                </button>

                <button
                  onClick={() => handleVoteAnswer(answer.id, 'down')}
                  disabled={isBanned}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all duration-200 active:scale-90 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
                    dislikedAnswers.has(answer.id) ? 'bg-red-50 text-red-500 scale-105' : 'hover:bg-red-50 hover:text-red-500'
                  }`}
                >
                  <ThumbsDown className={`w-4 h-4 transition-all duration-200 ${dislikeAnimatingId === answer.id ? 'scale-150 -rotate-12' : ''}`} />
                  Disagree ({answer.dislikes})
                </button>

                <button onClick={() => setReplyingTo(replyingTo === answer.id ? null : answer.id)} disabled={isBanned} className="disabled:opacity-50 hover:text-gray-700 transition">
                  Reply
                </button>

                {currentUserId && currentUserId === answer.authorId && (
                  <button onClick={() => handleDeleteAnswer(answer.id)} className="flex items-center gap-1 text-red-500 hover:text-red-700 ml-auto transition">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                )}
              </div>

              {replyingTo === answer.id && (
                <div className="flex gap-2 mt-3">
                  <input
                    value={replyInput}
                    onChange={(e) => setReplyInput(e.target.value)}
                    disabled={isBanned}
                    placeholder="Write a reply…"
                    className="flex-1 border rounded-full px-3 py-1.5 text-sm disabled:bg-gray-50 focus:outline-none focus:border-gray-400 transition"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddReply(answer.id) }}
                  />
                  <button onClick={() => handleAddReply(answer.id)} disabled={isBanned || !replyInput.trim()} className="px-3 py-1.5 bg-black text-white text-sm rounded-full disabled:opacity-50">
                    Send
                  </button>
                </div>
              )}

              {renderReplies(answer.replies || [], answer.id)}
            </div>
          ))}
        </div>
      )}

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        postContent={displayQuestion}
        contentType="questions"
        contentId={postId}
      />
    </div>
  )
}