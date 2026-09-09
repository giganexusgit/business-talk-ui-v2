'use client'

import { useRouter } from 'next/navigation'
import { profileHref } from '@/lib/profile-link'
import { ThumbsUp, MessageCircle, Send, MoreVertical, Bookmark, Flag, UserCheck, UserMinus, UserPlus, Trash2, Pencil, X } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { ShareModal } from '@/components/shared/ShareModal'
import { useQueryClient } from '@tanstack/react-query'
import { useOpenContent } from '@/hooks/useOpenContent'
import apiClient from '@/lib/api-client'
import { ReportModal } from '@/components/shared/ReportModal'
import { useFollow } from '@/hooks/useFollow'
import { useSavedStatus } from '@/hooks/useSavedStatus'
import { useAccountStatus, useAppSelector } from '@/hooks/useRedux'
import { getTimeAgo } from '@/lib/utils'
import { MediaGrid, MediaItem } from '@/components/shared/MediaGrid'
import ExpandableText from '@/components/common/ExpandableText'
import { useRequireAuth } from '@/hooks/useRequireAuth'

interface FeedPostProps {
  id?: string
  authorId?: string
  author: {
    name: string
    title: string
    avatar: string
  }
  groupId?: string
  group?: {
    name: string
  }
  content: string
  image?: string
  video?: string
  media?: MediaItem[]
  tags?: any
  hashtags?: any
  timestamp: string
  likes: number
  liked?: boolean
  dislikes?: number
  comments: number
  sends?: number
}

export function FeedPost({ id = Date.now().toString(), authorId = '', author, groupId, group, content, image, video, media = [], timestamp, likes, liked = false, comments, sends = 0 }: FeedPostProps) {
  const router = useRouter()
  const reduxUser = useAppSelector((state: any) => state.auth.user)
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; avatar: string }>({ id: '', name: 'You', avatar: '' })

  const [isLiked, setIsLiked] = useState(liked)
  const [likeCount, setLikeCount] = useState(likes)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showActionMenu, setShowActionMenu] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [commentInput, setCommentInput] = useState('')
  const [replyInput, setReplyInput] = useState('')
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set())
  const [commentsList, setCommentsList] = useState<any[]>([])
  // forceUpdate removed (was unused)
  const actionMenuRef = useRef<HTMLDivElement>(null)
  const { openPost } = useOpenContent()
  const { state: followState, follow, unfollow } = useFollow(authorId)
  const { isSaved, toggle: toggleSave, showToast: showSavedToast } = useSavedStatus(id, 'post')
  const { isBanned } = useAccountStatus()
  const [commentCount, setCommentCount] = useState(comments || 0)
  const [showReportModal, setShowReportModal] = useState(false)
  const [animatingId, setAnimatingId] = useState<string | null>(null)
  const [isDeleted, setIsDeleted] = useState(false)
  const [deleteToast, setDeleteToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [displayContent, setDisplayContent] = useState(content)
  const initialMediaItems: MediaItem[] = media && media.length > 0
    ? media
    : [
        ...(image ? [{ url: image, type: 'image' as const }] : []),
        ...(video ? [{ url: video, type: 'video' as const }] : []),
      ]
  const [displayMedia, setDisplayMedia] = useState<MediaItem[]>(initialMediaItems)
  const [editContent, setEditContent] = useState(content)
  const [existingMedia, setExistingMedia] = useState<MediaItem[]>(initialMediaItems)
  const [selectedEditFiles, setSelectedEditFiles] = useState<File[]>([])
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')

  const removeExistingMedia = (index: number) => {
    setExistingMedia((prev) => prev.filter((_, i) => i !== index))
  }
  const requireAuth = useRequireAuth()
  const queryClient = useQueryClient()

  //
  // FETCH COMMENT COUNT
  //

  useEffect(() => {
    if (reduxUser?.id) {
      setCurrentUser({
        id: String(reduxUser.id),
        name: reduxUser.username || reduxUser.full_name || 'You',
        avatar: reduxUser.profile_photo || '',
      })
    } else {
      try {
        const u = JSON.parse(localStorage.getItem('user') || '{}')
        setCurrentUser({ id: String(u.id || ''), name: u.username || u.full_name || 'You', avatar: u.profile_photo || '' })
      } catch {}
    }
  }, [reduxUser])

  useEffect(() => {
    setIsLiked(Boolean(liked))
  }, [liked])

  useEffect(() => {
    setDisplayContent(content)
    const items: MediaItem[] = media && media.length > 0
      ? media
      : [
          ...(image ? [{ url: image, type: 'image' as const }] : []),
          ...(video ? [{ url: video, type: 'video' as const }] : []),
        ]
    setDisplayMedia(items)
    setEditContent(content)
    setSelectedEditFiles([])
  }, [content, id, image, video, media])

  useEffect(() => {
    const fetchCommentsCount = async () => {
      if (!id) return

      try {
        const res = await apiClient.getPostComments(id)

        // ✅ API is FLAT → just count length
        setCommentCount((res || []).length)
      } catch (err) {
        console.error('Failed to fetch comment count')
      }
    }

    fetchCommentsCount()
  }, [id])

  // Helper function to recursively render infinite nested replies
  // Helper to generate a unique key for each reply based on its ancestry
  const renderNestedReplies = (replies: any[], parentId: number, parentReplyId?: number, ancestry: Array<number> = []): JSX.Element => {
    if (!replies || replies.length === 0) return <></>

    return (
      <div className="mt-3 ml-8 space-y-3">
        {replies.map((nestedReply) => {
          const newAncestry = [...ancestry, nestedReply.id]
          const replyPath = newAncestry.join('-')
          return (
            <div key={replyPath}>
              <div className="flex gap-2">
                <img
                  src={nestedReply.author.avatar}
                  className="w-6 h-6 rounded-full object-cover"
                  alt={nestedReply.author.name}
                />
                <div className="flex-1">
                    <div className="bg-gray-100 rounded-lg px-3 py-2">
                    <p className="font-semibold text-xs text-gray-900">{nestedReply.author.name}</p>
                    <p className="text-xs text-gray-700 whitespace-pre-wrap break-words">{nestedReply.content}</p>
                  </div>
                  <div className="flex gap-3 mt-1 px-3 text-xs text-gray-500">
                    <button 
                      onClick={() => handleLikeComment(nestedReply.id, parentReplyId || parentId, replyPath)}
                      className="hover:opacity-70 transition-all font-medium flex items-center gap-1"
                      style={{ color: likedComments.has(replyPath) ? '#1d9bf0' : '#5F6368' }}>
                      <ThumbsUp
                        className={`w-5 h-5 transition-all duration-200 ${
                          animatingId === replyPath ? 'scale-150 rotate-12' : ''
                        }`}
                      />
                      <span>{nestedReply.likes}</span>
                    </button>
                    <button 
                      onClick={() => setReplyingTo(replyingTo === `reply-${nestedReply.id}` ? null : `reply-${nestedReply.id}`)}
                      className="flex items-center gap-1 
                        transition-all duration-200
                        hover:scale-110 active:scale-90 hover:text-blue-600">
                      Reply
                    </button>
                    {currentUser.id && currentUser.id === nestedReply.authorId && (
                          <button
                            onClick={() => handleDeleteComment(nestedReply.id)}
                            className="hover:text-red-600 flex items-center gap-1"
                            title="Delete comment"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                  </div>
                </div>
              </div>

              {/* Reply to Nested Reply Input */}
              {replyingTo === `reply-${nestedReply.id}` && (
                <div className="flex gap-2 mt-2 ml-8 items-center pb-3">
                  <img
                    src={nestedReply.author?.profile_photo || `https://ui-avatars.com/api/name=${encodeURIComponent(nestedReply.author?.name)}`}
                    className="w-6 h-6 rounded-full object-cover shrink-0"
                    alt={nestedReply.author?.name || 'User'}
                  />
                  <input
                    type="text"
                    placeholder="Write a reply..."
                    value={replyInput}
                    onChange={(e) => setReplyInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddReply(parentId, nestedReply.id)}
                    className="flex-1 min-w-0 text-xs border border-gray-200 rounded-full px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-black"
                    autoFocus
                  />
                  <button
                    onClick={() => handleAddReply(parentId, nestedReply.id)}
                    className="shrink-0 px-4 py-2 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-400 disabled:bg-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Send
                  </button>
                </div>
              )}

              {/* Recursively render deeper nested replies */}
              {nestedReply.replies && nestedReply.replies.length > 0 && 
                renderNestedReplies(nestedReply.replies, parentId, nestedReply.id, newAncestry)
              }
            </div>
          )
        })}
      </div>
    )
  }

  // Recursively update like count at any depth in the comment tree
  const updateLikesRecursive = (list: any[], commentId: number, newLikes: number): any[] =>
    list.map(c =>
      c.id === commentId
        ? { ...c, likes: newLikes }
        : { ...c, replies: updateLikesRecursive(c.replies || [], commentId, newLikes) }
    )

  // Like/Unlike a comment or reply using API
  const handleLikeComment = async (commentId: number, parentId?: number, replyPath?: string) => {
    const itemId = replyPath || (parentId ? `${parentId}-reply-${commentId}` : `comment-${commentId}`)
    const isLiked = likedComments.has(itemId)
    const newLikedComments = new Set(likedComments)

    if (!requireAuth()) return

    setAnimatingId(itemId)
    setTimeout(() => setAnimatingId(null), 300)

    try {
      const res = await apiClient.voteComment(commentId.toString(), 'up')
      if (isLiked) {
        newLikedComments.delete(itemId)
      } else {
        newLikedComments.add(itemId)
      }
      setLikedComments(newLikedComments)
      setCommentsList(prev => updateLikesRecursive(prev, commentId, res.upvotes))
    } catch (err) {
      // fallback: do nothing or show error
    }
  }

  // Like/Unlike post using API
  const handleLike = async () => {
    if (isBanned) return
    if (!requireAuth()) return
    setAnimatingId('post')
    setTimeout(() => setAnimatingId(null), 300)

    try {
      // Call vote API (toggle UP)
      const postId = id?.toString() || ''
      const res = await apiClient.votePost(postId, 'up')
      // API returns updated vote counts and user's vote
      const { upvotes, myVote } = res
      setLikeCount(upvotes)
      // Prefer myVote when available; null/undefined means the vote was removed.
      if (myVote === null || myVote === undefined) {
        setIsLiked(false)
      } else if (typeof myVote === 'string') {
        setIsLiked(myVote.toLowerCase() === 'up')
      } else {
        setIsLiked(Boolean(res.liked))
      }
    } catch (err) {
      // fallback to optimistic UI
      if (isLiked) {
        setIsLiked(false)
        setLikeCount(likeCount - 1)
      } else {
        setIsLiked(true)
        setLikeCount(likeCount + 1)
      }
    }
  }

  const handleSave = async () => {
    if (!requireAuth()) return
    await toggleSave(() => setShowActionMenu(false))
  }

  const handleOpenViewer = () => {
    const postData = {
      id,
      author,
      authorId,
      content,
      image,
      video,
      media,
      timestamp,
      likes: likeCount,
      liked: isLiked,
      comments: commentCount,
      sends
    }
    openPost(postData)
  }

  // Add comment using API
  const handleAddComment = async () => {
    if (!requireAuth()) return
    if (!commentInput.trim() || isBanned) return
    try {
      const postId = id?.toString() || ''
      const res = await apiClient.addPostComment(postId, commentInput)
      // Map API response to UI structure
      const newComment = mapApiCommentToUi(res)
      setCommentsList([...commentsList, newComment])
      setCommentCount(prev => prev + 1) // ✅ ADD THIS
      setCommentInput('')
    } catch (err) {
      // fallback: do nothing or show error
    }
  }

  // Helper to get all reply ids recursively
  const getAllReplyIds = (comments: any[]): number[] => {
    let ids: number[] = []
    for (const comment of comments) {
      ids.push(comment.id)
      if (comment.replies && comment.replies.length > 0) {
        ids = ids.concat(getAllReplyIds(comment.replies))
      }
    }
    return ids
  }

  // Add reply using API
  const handleAddReply = async (commentId: number, parentReplyId?: number) => {
    if (!requireAuth()) return
    if (!replyInput.trim() || isBanned) return
    try {
      const postId = id?.toString() || ''
      await apiClient.addPostComment(postId, replyInput, parentReplyId ? parentReplyId.toString() : commentId.toString())
      setCommentCount(prev => prev + 1) // ✅ ADD THIS
      setReplyInput('')
      setReplyingTo(null)
      // Refetch comments for latest state
      const updatedComments = await apiClient.getPostComments(postId)
      setCommentsList(nestComments(updatedComments))
      setCommentCount(updatedComments.length) // ✅ IMPORTANT
    } catch (err) {
      // fallback: do nothing or show error
    }
  }

  // Fetch comments from API when comments section is opened
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

  // Helper to map API comment to UI comment structure
  const mapApiCommentToUi = (apiComment: any) => ({
    id: apiComment.id,
    authorId: String(apiComment.user?.id || ''),
    author: {
      name: apiComment.user?.full_name || 'Unknown',
      avatar: apiComment.user?.profile_photo || `https://ui-avatars.com/api/name=${encodeURIComponent(apiComment.user?.full_name || 'User')}`,
      title: apiComment.user?.profession || '',
    },
    content: apiComment.comment,
    created_at: apiComment.created_on,
    likes: apiComment.likes || 0,
    replies: [], // Flat API, no nested replies in response
    parent: apiComment.parent || null,
  })

  // Convert flat API comments to nested structure
  const nestComments = (comments: any[]) => {
    const map: Record<string, any> = {}
    const roots: any[] = []
    comments.forEach((c) => {
      map[c.id] = { ...mapApiCommentToUi(c), replies: [] }
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

  useEffect(() => {
    const fetchComments = async () => {
      if (!id) return
      try {
        const res = await apiClient.getPostComments(id)
        // Map and nest comments for UI
        setCommentsList(nestComments(res))
      } catch (err) {
        // fallback: keep mock comments
      }
    }
    if (showComments) fetchComments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showComments, id])

  const showDeleteToast = (message: string, type: 'success' | 'error') => {
    setDeleteToast({ message, type })
    setTimeout(() => setDeleteToast(null), 3000)
  }

  const handleEditPost = async () => {
    if (!id || !editContent.trim()) {
      setEditError('Post content cannot be empty.')
      return
    }

    setEditLoading(true)
    setEditError('')

    try {
      let payload: any
      if (selectedEditFiles.length > 0) {
        const formData = new FormData()
        formData.append('content', editContent)
        formData.append('existingMedia', JSON.stringify(existingMedia))
        selectedEditFiles.forEach((file) => {
          formData.append('media', file)
        })
        payload = formData
      } else {
        payload = {
          content: editContent,
          existingMedia,
        }
      }

      const res = await apiClient.updatePost(id, payload)
      const resData = res?.data?.data || res?.data
      setDisplayContent(editContent)

      if (resData?.media && Array.isArray(resData.media) && resData.media.length > 0) {
        setDisplayMedia(resData.media)
      } else if (selectedEditFiles.length > 0) {
        const newPreviews: MediaItem[] = selectedEditFiles.map(file => ({
          url: URL.createObjectURL(file),
          type: file.type.startsWith('video/') ? 'video' : 'image',
        }))
        setDisplayMedia([...existingMedia, ...newPreviews])
      } else {
        setDisplayMedia(existingMedia)
      }

      await queryClient.invalidateQueries({ queryKey: ['feed'] })
      await queryClient.invalidateQueries({ queryKey: ['posts'] })
      setShowEditModal(false)
      showDeleteToast('Post updated successfully', 'success')
    } catch (err: any) {
      const status = err?.response?.status
      if (status === 401) {
        showDeleteToast('Session expired. Please log in again.', 'error')
      } else if (status === 403) {
        showDeleteToast('You can only edit your own content', 'error')
      } else {
        setEditError(err?.response?.data?.message || 'Failed to update post')
      }
    } finally {
      setEditLoading(false)
    }
  }

  const handleEditFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(event.target.files || [])
    setSelectedEditFiles((prev) => [...prev, ...incoming])
  }

  const removeEditFile = (index: number) => {
    setSelectedEditFiles((prev) => prev.filter((_, i) => i !== index))
  }

  // Delete this post (only shown to author)
  const handleDeletePost = async () => {
    if (!window.confirm('Delete this post? This cannot be undone.')) return
    try {
      await apiClient.deletePost(id)
      setIsDeleted(true)
      showDeleteToast('Post deleted successfully', 'success')
    } catch (err: any) {
      const status = err?.response?.status
      if (status === 403) {
        showDeleteToast('You can only delete your own content', 'error')
      } else if (status === 401) {
        showDeleteToast('Session expired. Please log in again.', 'error')
      } else {
        showDeleteToast(err?.response?.data?.message || 'Failed to delete post', 'error')
      }
    }
  }

  // Delete a comment (only shown to comment author)
  const removeCommentRecursive = (list: any[], targetId: string): any[] =>
    list
      .filter((c) => String(c.id) !== targetId)
      .map((c) => ({
        ...c,
        replies: removeCommentRecursive(c.replies || [], targetId),
      }))

  const handleDeleteComment = async (commentId: string) => {
    // Optimistic update
    const prevList = commentsList
    const prevCount = commentCount
    setCommentsList(prev => removeCommentRecursive(prev, String(commentId)))
    setCommentCount(prev => Math.max(0, prev - 1))
    try {
      await apiClient.deletePostComment(commentId)
      showDeleteToast('Comment deleted', 'success')
    } catch (err: any) {
      // Rollback on failure
      setCommentsList(prevList)
      setCommentCount(prevCount)
      const status = err?.response?.status
      if (status === 403) {
        showDeleteToast('You can only delete your own content', 'error')
      } else if (status === 401) {
        showDeleteToast('Session expired. Please log in again.', 'error')
      } else {
        showDeleteToast(err?.response?.data?.message || 'Failed to delete comment', 'error')
      }
    }
  }

  // If no post data, show fallback UI
  if (!id && !content && !image && !video && (!media || media.length === 0)) {
    return (
      <div className="bg-white rounded-2xl border p-6 mb-4 flex flex-col items-center justify-center text-center">
        <span className="text-lg font-semibold text-gray-700 mb-2">No posts to display</span>
        <span className="text-sm text-gray-500 mb-4">Please add a post to get started!</span>
        <button
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#212529] text-white hover:bg-[#3D3D3D] transition-all duration-200"
          onClick={() => router.push('/?tab=home&compose=1')}
        >
          Add a Post
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Delete toast */}
      {deleteToast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 text-white text-sm font-medium px-5 py-3 rounded-full shadow-xl animate-fade-in-up ${
          deleteToast.type === 'success' ? 'bg-gray-900' : 'bg-red-600'
        }`}>
          {deleteToast.type === 'success' ? <Trash2 className="w-4 h-4" /> : null}
          {deleteToast.message}
        </div>
      )}
      {/* Instagram-style saved toast */}
      {showSavedToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-full shadow-xl animate-fade-in-up">
          <Bookmark className="w-4 h-4 fill-white" />
          Saved to your collection
        </div>
      )}
      {isDeleted ? null : (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-6 mb-4">
        {showEditModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Edit Post</h3>
                <button onClick={() => setShowEditModal(false)} className="rounded-full p-2 text-gray-500 hover:bg-gray-100">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                {editError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {editError}
                  </div>
                )}

                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={6}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="What would you like to share?"
                />

                {existingMedia.length > 0 && (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <p className="text-xs font-semibold text-gray-500 mb-2">Current Media Attachments</p>
                    <div className="flex flex-wrap gap-2">
                      {existingMedia.map((item, index) => (
                        <div key={`${item.url}-${index}`} className="relative">
                          {item.type === 'video' ? (
                            <video src={item.url} className="h-20 w-20 rounded-lg object-cover bg-black" />
                          ) : (
                            <img src={item.url} alt="Attachment" className="h-20 w-20 rounded-lg object-cover" />
                          )}
                          <button
                            type="button"
                            onClick={() => removeExistingMedia(index)}
                            className="absolute -right-1 -top-1 rounded-full bg-red-600 p-1 text-white hover:bg-red-700 transition"
                            title="Remove attachment"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-dashed border-gray-300 p-3">
                  <p className="text-xs font-semibold text-gray-500 mb-2">Add New Images / Videos</p>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleEditFiles}
                    className="block w-full text-sm text-gray-500"
                  />
                  {selectedEditFiles.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedEditFiles.map((file, index) => (
                        <div key={`${file.name}-${index}`} className="relative">
                          {file.type.startsWith('image/') ? (
                            <img src={URL.createObjectURL(file)} alt={file.name} className="h-20 w-20 rounded-lg object-cover" />
                          ) : (
                            <div className="flex h-20 w-20 items-center justify-center rounded-lg border bg-gray-100 text-xs text-gray-500">
                              {file.name}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => removeEditFile(index)}
                            className="absolute -right-1 -top-1 rounded-full bg-gray-900 p-1 text-white"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleEditPost}
                  disabled={editLoading || !editContent.trim()}
                  className="flex items-center justify-center rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {editLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Saving...
                    </span>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Post Header */}
        <div className="flex items-start justify-between mb-4">
          <div
            className="flex items-center gap-3 cursor-pointer"
            // onClick={() => authorId && router.push(profileHref(authorId, author.name))}
          >
            <img
              src={author.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(author.name)}&background=E8E8E8&color=212529&size=48`}
              alt={author.name}
              className="w-12 h-12 rounded-full object-cover"
              onClick={() => authorId && router.push(profileHref(authorId, author.name))}
            />
            <div>
              <h3 className="font-semibold text-gray-900 hover:underline" onClick={() => authorId && router.push(profileHref(authorId, author.name))}>{author.name}</h3>
              <p className="text-sm text-gray-500" onClick={() => authorId && router.push(profileHref(authorId, author.name))}>{author.title}</p>
              {/* add a logic to show group name when groupId is not null other vise leave it do not show null in UI */}
              {groupId && <div className="text-xs text-gray-500 hover:underline" onClick={() => authorId && router.push(`/groups/${groupId}`)}>{group?.name}</div>}
              <p className="text-xs text-gray-400">{getTimeAgo(timestamp)}</p>
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
                {currentUser.id && currentUser.id === authorId && (
                  <>
                    <button
                      onClick={() => {
                        setEditContent(displayContent)
                        setExistingMedia([...displayMedia])
                        setSelectedEditFiles([])
                        setEditError('')
                        setShowEditModal(true)
                        setShowActionMenu(false)
                      }}
                      title='Edit post'
                      className="group flex items-center gap-1 text-gray-700 hover:bg-gray-100 px-2 py-1 rounded transition-all duration-200 hover:gap-2"
                    >
                      <Pencil className="w-4 h-4" />
                      <span className="max-w-0 overflow-hidden group-hover:max-w-[80px] transition-all duration-200 whitespace-nowrap">
                        Edit
                      </span>
                    </button>
                    <button
                      onClick={handleDeletePost}
                      title='Delete post'
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

        {/* Post Content */}
        <div 
          className="mb-4 hover:opacity-80 transition-opacity cursor-pointer"
        >
          <ExpandableText onClick={handleOpenViewer} className="text-gray-800 whitespace-pre-wrap break-words leading-relaxed" lines={4}>{displayContent}</ExpandableText>
        </div>

        {/* Media Grid */}
        {displayMedia.length > 0 && (
          <MediaGrid media={displayMedia} />
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
          <button
            onClick={handleLike}
            disabled={isBanned}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg 
              transition-all duration-200 ease-in-out
              active:scale-90
              hover:scale-105 hover:shadow-sm
              disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none
              ${
                isLiked
                  ? 'bg-blue-50 text-[#1d9bf0] scale-105'
                  : 'text-gray-600 hover:text-[#1d9bf0] hover:bg-blue-50'
              }`}
          >
            <ThumbsUp
              className={`w-5 h-5 transition-all duration-200 ${
                animatingId === 'post' ? 'scale-150 rotate-12' : ''
              }`}
            />
            <span className="text-sm font-medium">{likeCount}</span>
          </button>

          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50 transition-all cursor-pointer"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm font-medium">{commentCount}</span>
          </button>

          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50 transition-all ml-auto cursor-pointer"
          >
            <Send className="w-5 h-5" />
            <span className="text-sm font-medium">{sends}</span>
          </button>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
            {/* Comment Input */}
            <div className="flex gap-2">
              <img
                src={currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=E8E8E8&color=212529&size=32`}
                className="w-8 h-8 rounded-full object-cover"
                alt={currentUser.name}
              />
              <div className="flex-1 flex gap-2 min-w-0">
                <input
                  type="text"
                  placeholder={isBanned ? 'Your account is restricted' : 'Add a comment...'}
                  disabled={isBanned}
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                  className="flex-1 min-w-0 px-3 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-black disabled:bg-gray-50 disabled:cursor-not-allowed"
                />
                <button
                  onClick={handleAddComment}
                  disabled={isBanned}
                  className="shrink-0 px-4 py-2 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-400 disabled:bg-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Post
                </button>
              </div>
            </div>

            {/* Comments List */}
            {commentsList.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {commentsList.map((comment) => (
                  <div key={comment.id} className="flex gap-2">
                    <img
                      src={comment.author.avatar || `https://ui-avatars.com/api/name=${encodeURIComponent(comment.author.name)}`}
                      alt={comment.author.name || 'User'}
                      className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                    />
                    <div className="flex-1">
                      <div className="bg-gray-50 rounded-lg px-3 py-2">
                        <p className="text-xs font-semibold text-gray-900">{comment.author.name}</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{comment.content}</p>
                      </div>
                      <div className="flex gap-2 mt-1 px-3 text-xs text-gray-500">
                        <button 
                          onClick={() => handleLikeComment(comment.id)}
                          className="hover:text-blue-600 flex items-center gap-1 font-medium"
                          style={{ color: likedComments.has(`comment-${comment.id}`) ? '#1d9bf0' : '#5F6368' }}>
                          <ThumbsUp
                            className={`w-5 h-5 transition-all duration-200 ${
                              animatingId === `comment-${comment.id}` ? 'scale-150 rotate-12' : ''
                            }`}
                          /> {comment.likes}
                        </button>
                        <button onClick={() => setReplyingTo(replyingTo === `comment-${comment.id}` ? null : `comment-${comment.id}`)} className="flex items-center gap-1 transition-all duration-200 hover:scale-110 active:scale-90 hover:text-blue-600">
                          Reply
                        </button>
                        {currentUser.id && currentUser.id === comment.authorId && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="hover:text-red-600 flex items-center gap-1"
                            title="Delete comment"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* Reply Input */}
                      {replyingTo === `comment-${comment.id}` && (
                        <div className="flex gap-2 mt-2 ml-6 items-center">
                          <img
                            src={currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=E8E8E8&color=212529&size=24`}
                            className="w-6 h-6 rounded-full object-cover shrink-0"
                            alt={currentUser.name}
                          />
                          <input
                            type="text"
                            placeholder="Write a reply..."
                            value={replyInput}
                            onChange={(e) => setReplyInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddReply(comment.id)}
                            className="flex-1 min-w-0 text-xs border border-gray-200 rounded-full px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-black"
                            autoFocus
                          />
                          <button
                            onClick={() => handleAddReply(comment.id)}
                            className="shrink-0 px-4 py-2 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-400 disabled:bg-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Reply
                          </button>
                        </div>
                      )}

                      {/* Nested Replies */}
                      {comment.replies && comment.replies.length > 0 && renderNestedReplies(comment.replies, comment.id)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        postContent={content}
        contentType="posts"
        contentId={id}
      />

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        contentId={id}
        contentType="post"
      />
    </>
  )
}
