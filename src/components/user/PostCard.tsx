'use client'

import { useState, useRef, useEffect } from 'react'
import { ThumbsUp, MessageCircle, Send, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { profileHref } from '@/lib/profile-link'
import { ShareModal } from '@/components/shared/ShareModal'
import apiClient from '@/lib/api-client'

const MOCK_COMMENTS = [
  {
    id: 1,
    author: { name: 'John Doe', avatar: '/avatar.png', title: 'CEO' },
    content: 'Great insights! This is very helpful.',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    likes: 5,
    replies: [
      {
        id: 2,
        author: { name: 'Jane Smith', avatar: '/avatar.png', title: 'Manager' },
        content: 'I completely agree with you!',
        created_at: new Date(Date.now() - 1800000).toISOString(),
        likes: 2,
      },
    ],
  },
  {
    id: 3,
    author: { name: 'Mike Johnson', avatar: '/avatar.png', title: 'Developer' },
    content: 'Thanks for sharing this valuable information.',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    likes: 8,
    replies: [],
  },
]

export default function PostCard({ post }: any) {
  const [showActionMenu, setShowActionMenu] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [currentUserId, setCurrentUserId] = useState('')
  const [isDeleted, setIsDeleted] = useState(false)
  const [replyingTo, setReplyingTo] = useState<number | null>(null)
  const [commentInput, setCommentInput] = useState('')
  const [replyInput, setReplyInput] = useState('')
  const [commentsList, setCommentsList] = useState(MOCK_COMMENTS)
  const actionMenuRef = useRef<HTMLDivElement>(null)

  const postAuthorId = post?.author?.id || ''

  const handleAddComment = () => {
    if (commentInput.trim()) {
      const newComment = {
        id: Math.max(...commentsList.map(c => c.id), 0) + 1,
        author: { name: 'You', avatar: '/avatar.png', title: 'Your Title' },
        content: commentInput,
        created_at: new Date().toISOString(),
        likes: 0,
        replies: [],
      }
      setCommentsList([...commentsList, newComment])
      setCommentInput('')
    }
  }

  const handleAddReply = (commentId: number) => {
    if (replyInput.trim()) {
      setCommentsList(
        commentsList.map(comment => {
          if (comment.id === commentId) {
            return {
              ...comment,
              replies: [
                ...comment.replies,
                {
                  id: Math.max(...comment.replies.map(r => r.id), 0) + 1,
                  author: { name: 'You', avatar: '/avatar.png', title: 'Your Title' },
                  content: replyInput,
                  created_at: new Date().toISOString(),
                  likes: 0,
                }
              ]
            }
          }
          return comment
        })
      )
      setReplyInput('')
      setReplyingTo(null)
    }
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

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      setCurrentUserId(user.id || '')
    } catch {
      setCurrentUserId('')
    }
  }, [])

  const handleDeletePost = async () => {
    if (!post?.id) return
    if (!window.confirm('Delete this post? This cannot be undone.')) return

    try {
      await apiClient.deletePost(post.id)
      setIsDeleted(true)
      setShowActionMenu(false)
    } catch {
      console.error('Failed to delete post')
    }
  }

  return (
    <>
      {isDeleted ? null : (
      <div className="bg-white border rounded-xl p-4 shadow-sm">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex gap-3">
            <Link href={postAuthorId ? profileHref(postAuthorId, post.author?.name) : '#'} className="shrink-0">
              <img
                src={post.author?.avatar || '/avatar.png'}
                className="w-10 h-10 rounded-full object-cover hover:opacity-80 transition-opacity"
                alt={post.author?.name || 'User Avatar'}
              />
            </Link>
            <div>
              <Link href={postAuthorId ? profileHref(postAuthorId, post.author?.name) : '#'} className="font-semibold text-[#212529] text-sm hover:underline">
                {post.author?.name}
              </Link>
              <p className="text-xs text-gray-500">
                {post.author?.title || 'Professional'} •{' '}
                {new Date(post.created_at).toLocaleTimeString()}
              </p>
            </div>
          </div>

          {/* Action Menu Button */}
          <div className="relative" ref={actionMenuRef}>
            <button
              onClick={() => setShowActionMenu(!showActionMenu)}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              ⋮
            </button>

            {/* Action Menu Dropdown */}
            {showActionMenu && (
              <div className="absolute right-0 mt-1 w-48 bg-white border rounded-lg shadow-lg z-10">
                <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 border-b">
                  💾 Save post
                </button>
                {(!currentUserId || currentUserId !== postAuthorId) && (
                  <>
                    <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 border-b">
                      👥 Disconnect
                    </button>
                    <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 border-b">
                      👁️ Not interested
                    </button>
                    <button className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                      🚩 Report post
                    </button>
                  </>
                )}
                {currentUserId && currentUserId === postAuthorId && (
                  <button
                    onClick={handleDeletePost}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 border-t flex items-center gap-2"
                  >
                    <Trash2 size={14} /> Delete post
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <p className="text-sm text-[#212529] mb-3 whitespace-pre-wrap break-words">{post.content}</p>

        {/* Image/Video */}
        {post.image && (
          <img
            src={post.image}
            className="w-full h-48 sm:h-64 object-cover rounded-lg mb-3"
            alt={post.content || 'Post Image'}
          />
        )}

        {/* Actions */}
        <div className="flex items-center justify-between text-gray-500 text-sm pt-2 border-t">
          <div className="flex gap-5">
            <button className="flex items-center gap-1 hover:text-[#212529]">
              <ThumbsUp size={16} /> {post.likes_count || 0}
            </button>
            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-1 hover:text-[#212529]"
            >
              <MessageCircle size={16} /> {post.comments_count || 0}
            </button>
          </div>

          <button
            onClick={() => {
              console.log('Share button clicked - opening modal')
              setShowShareModal(true)
            }}
            className="flex items-center gap-1 hover:text-[#212529] cursor-pointer transition hover:text-blue-600"
          >
            <Send size={16} /> Share
          </button>
        </div>

      {/* Comments Section */}
      {showComments && (
        <div className="mt-4 pt-4 border-t">
          <h3 className="font-semibold text-sm text-[#212529] mb-3">
            Comments ({post.comments_count || 0})
          </h3>

          {/* Add Comment Input */}
          <div className="flex gap-2 mb-4 pb-4 border-b">
            <img
              src="/avatar.png"
              className="w-8 h-8 rounded-full object-cover"
              alt="Your avatar"
            />
            <input
              type="text"
              placeholder="Add a comment..."
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
              className="flex-1 text-sm border rounded-full px-3 py-2 focus:outline-none focus:border-blue-500"
            />
            <button 
              onClick={handleAddComment}
              className="text-blue-600 hover:text-blue-700 px-3 py-2 rounded-full hover:bg-blue-50 transition">
              <Send size={18} />
            </button>
          </div>

          {/* Comments List */}
          <div className="space-y-4">
            {commentsList.map((comment) => (
              <div key={comment.id}>
                {/* Comment */}
                <div className="flex gap-2">
                  <img
                    src={comment.author.avatar}
                    className="w-8 h-8 rounded-full object-cover"
                    alt={comment.author.name}
                  />
                  <div className="flex-1">
                    <div className="bg-gray-100 rounded-lg px-3 py-2">
                      <p className="font-semibold text-xs text-[#212529]">
                        {comment.author.name}
                      </p>
                      <p className="text-xs text-gray-700 text-[#212529] whitespace-pre-wrap break-words">
                        {comment.content}
                      </p>
                    </div>
                    <div className="flex gap-3 mt-1 px-3 text-xs text-gray-500">
                      <button className="hover:text-blue-600">Like</button>
                      <button
                        onClick={() =>
                          setReplyingTo(
                            replyingTo === comment.id ? null : comment.id
                          )
                        }
                        className="hover:text-blue-600"
                      >
                        Reply
                      </button>
                      <span>
                        {new Date(comment.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="mt-3 ml-8 space-y-3">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="flex gap-2">
                        <img
                          src={reply.author.avatar}
                          className="w-7 h-7 rounded-full object-cover"
                          alt={reply.author.name}
                        />
                        <div className="flex-1">
                          <div className="bg-gray-100 rounded-lg px-3 py-2">
                            <p className="font-semibold text-xs text-[#212529]">
                              {reply.author.name}
                            </p>
                            <p className="text-xs text-gray-700 text-[#212529] whitespace-pre-wrap break-words">
                              {reply.content}
                            </p>
                          </div>
                          <div className="flex gap-3 mt-1 px-3 text-xs text-gray-500">
                            <button className="hover:text-blue-600">Like</button>
                            <button
                              onClick={() =>
                                setReplyingTo(
                                  replyingTo === reply.id ? null : reply.id
                                )
                              }
                              className="hover:text-blue-600"
                            >
                              Reply
                            </button>
                            <span>
                              {new Date(reply.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Input */}
                {replyingTo === comment.id && (
                  <div className="flex gap-2 mt-3 ml-8">
                    <img
                      src="/avatar.png"
                      className="w-7 h-7 rounded-full object-cover"
                      alt="Your avatar"
                    />
                    <input
                      type="text"
                      placeholder="Write a reply..."
                      value={replyInput}
                      onChange={(e) => setReplyInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddReply(comment.id)}
                      className="flex-1 text-xs border rounded-full px-3 py-1.5 focus:outline-none focus:border-blue-500"
                      autoFocus
                    />
                    <button 
                      onClick={() => handleAddReply(comment.id)}
                      className="text-blue-600 hover:text-blue-700 px-2 py-1.5 rounded-full hover:bg-blue-50 transition">
                      <Send size={16} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
      )}

    {/* Share Modal - Using reusable component */}
    <ShareModal
      isOpen={showShareModal}
      onClose={() => setShowShareModal(false)}
      postContent={post.content}
      contentType="posts"
      contentId={post.id || Date.now().toString()}
    />
    </>
  )
}