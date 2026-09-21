'use client'

import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Trash2, Pencil, X, Tag } from 'lucide-react'
import { useState, useEffect } from 'react'
import { TagsPopup } from '@/components/shared/TagsPopup'
import apiClient from '@/lib/api-client'
import RichTextContent from '@/components/common/RichTextContent'
import BasicEditor from '@/components/editor/BasicEditor'
import { validateImageFile } from '@/lib/utils'

interface Author {
  name: string
  avatar: string
  title: string
}

interface Blog {
  id: string
  authorId: string
  title: string
  excerpt: string
  content: string
  author: Author
  image: string
  category: string
  readTime: string
  publishedAt: string
  views: number
  bookmarks: number
  likes: number
  comments: number
  type?: string
}

interface Comment {
  id: string
  authorId: string
  content: string
  createdAt: string
  user: {
    name: string
    avatar: string
  }
  replies?: Comment[]
}

function normalizeComment(c: any): Comment {
  const u = c.user ?? c.author ?? {}
  return {
    id: String(c.id),
    authorId: String(u.id ?? u.user_id ?? ''),
    content: c.content ?? c.comment ?? '',
    createdAt: c.created_on ?? c.createdAt ?? '',
    user: {
      name: u.full_name ?? u.username ?? u.name ?? 'Unknown',
      avatar: u.profile_photo ?? u.avatar ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name ?? u.username ?? u.name ?? 'Unknown')}&background=E8E8E8&color=212529&size=24`,
    },
    replies: (c.replies ?? []).map(normalizeComment),
  }
}

function BlogCommentItem({
  comment,
  blogId,
  onReplyAdded,
  onCommentDeleted,
}: {
  comment: Comment
  blogId: string
  onReplyAdded: (parentId: string, reply: Comment) => void
  onCommentDeleted: (commentId: string) => void
}) {
  const [showReply, setShowReply] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleReply = async () => {
    if (!replyText.trim()) return
    setSubmitting(true)
    try {
      const data = await apiClient.addBlogComment(blogId, replyText.trim(), comment.id)
      onReplyAdded(comment.id, normalizeComment(data))
      setReplyText('')
      setShowReply(false)
    } catch (err) {
      console.error('Failed to add reply:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this comment as admin?')) return
    try {
      await apiClient.deleteBlogComment(comment.id)
      onCommentDeleted(comment.id)
    } catch (err) {
      console.error('Failed to delete comment:', err)
    }
  }

  return (
    <div>
      <div className="flex gap-3">
        <img
          src={comment.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user.name)}&background=E8E8E8&color=212529&size=40`}
          alt={comment.user.name}
          className="w-9 h-9 rounded-full object-cover shrink-0"
        />
        <div className="flex-1">
          <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: '#F8F9FA', border: '1px solid #E8E8E8' }}>
            <p className="text-sm font-semibold" style={{ color: '#212529' }}>{comment.user.name}</p>
            <p className="text-sm mt-0.5 leading-relaxed whitespace-pre-wrap break-words" style={{ color: '#3D3D3D' }}>{comment.content}</p>
          </div>
          <div className="flex items-center gap-4 mt-1 px-2">
            <button
              className="text-xs font-medium text-gray-600 hover:text-blue-600 transition-colors"
              onClick={() => setShowReply(v => !v)}
            >
              Reply
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors"
              title="Delete comment"
            >
              <Trash2 className="w-3 h-3" />
              Delete (Admin)
            </button>
          </div>

          {showReply && (
            <div className="mt-2 flex gap-2 pl-2">
              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                rows={2}
                placeholder="Write an admin reply..."
                className="flex-1 px-3 py-2 rounded-xl text-sm resize-none focus:outline-none"
                style={{ border: '1px solid #E8E8E8', backgroundColor: '#F8F9FA', color: '#212529' }}
              />
              <button
                onClick={handleReply}
                disabled={submitting || !replyText.trim()}
                className="self-end px-4 py-2 rounded-xl text-white text-sm disabled:opacity-50"
                style={{ backgroundColor: '#212529' }}
              >
                {submitting ? '...' : 'Reply'}
              </button>
            </div>
          )}

          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 ml-4 pl-4 space-y-3" style={{ borderLeft: '2px solid #E8E8E8' }}>
              {comment.replies.map(reply => (
                <BlogCommentItem key={reply.id} comment={reply} blogId={blogId} onReplyAdded={onReplyAdded} onCommentDeleted={onCommentDeleted} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdminBlogDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const blogId = params?.id as string

  const [blog, setBlog] = useState<Blog | null>(null)
  const [loading, setLoading] = useState(true)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [isDeleted, setIsDeleted] = useState(false)

  const [showEditModal, setShowEditModal] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editImage, setEditImage] = useState<File | null>(null)
  const [editTags, setEditTags] = useState<string[]>([])
  const [showTagsPopup, setShowTagsPopup] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')

  const openEditModal = () => {
    if (!blog) return
    setEditTitle(blog.title)
    setEditContent(blog.content)
    setEditImage(null)
    setEditTags(
      blog.category
        ? blog.category
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : []
    )
    setEditError('')
    setShowEditModal(true)
  }

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      if (files.length > 1) {
        setEditError('Blogs can only have 1 cover image as media.')
        return
      }
      const file = files[0]
      if (!file) return

      if (file.type.startsWith('video/')) {
        setEditError('Blogs can only have 1 cover image as media (no videos allowed).')
        return
      }

      const err = validateImageFile(file)
      if (err) {
        setEditError(err)
        return
      }

      setEditImage(file)
      setEditError('')
    }
  }

  const handleEditBlog = async () => {
    if (!blog || !editTitle.trim() || !editContent.trim()) {
      setEditError('Title and content cannot be empty.')
      return
    }

    setEditLoading(true)
    setEditError('')

    try {
      const formData = new FormData()
      formData.append('title', editTitle)
      formData.append('content', editContent)
      formData.append('tags', JSON.stringify(editTags))
      if (editImage) {
        formData.append('cover_image', editImage)
      }

      await apiClient.updateBlog(blog.id, formData)

      setBlog((prev) =>
        prev
          ? {
              ...prev,
              title: editTitle,
              content: editContent,
              category: editTags.join(', '),
              image: editImage ? URL.createObjectURL(editImage) : prev.image,
            }
          : prev
      )

      setShowEditModal(false)
    } catch (err: any) {
      console.error('Failed to update blog:', err)
      setEditError(err?.response?.data?.message || 'Failed to update blog.')
    } finally {
      setEditLoading(false)
    }
  }

  useEffect(() => {
    if (!blogId) return

    const fetchBlog = async () => {
      try {
        const res = await apiClient.getBlogById(blogId)
        const b = res.data

        const formatted: Blog = {
          id: b.id,
          authorId: b.user?.id || '',
          title: b.title,
          excerpt: b.content ? b.content.replace(/<[^>]*>/g, '').slice(0, 150) : '',
          content: b.content,
          author: {
            name: b.user?.full_name || b.user?.username || 'Unknown',
            avatar: b.user?.profile_photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(b.user?.full_name || b.user?.username || 'Unknown')}&background=E8E8E8&color=212529&size=48`,
            title: b.user?.profession || 'User',
          },
          image:
            b.cover_image && b.cover_image.startsWith('http')
              ? b.cover_image
              : '/placeholder.jpg',
          category: (b.tags || []).map((t: any) => (typeof t === 'string' ? t : t.name)).join(', '),
          readTime: '5 min read',
          publishedAt: b.created_on
            ? new Date(Number(b.created_on)).toDateString()
            : 'Recently',
          views: Number(b.views) || 0,
          bookmarks: 0,
          likes: Number(b.likes) || 0,
          comments: 0,
          type: b.type,
        }

        setBlog(formatted)
      } catch (err) {
        console.error('Admin blog fetch error', err)
      } finally {
        setLoading(false)
      }
    }

    const fetchComments = async () => {
      try {
        const data = await apiClient.getBlogComments(blogId)
        const items: any[] = Array.isArray(data) ? data : (data?.items ?? data?.data ?? [])
        setComments(items.map(normalizeComment))
      } catch (err) {
        console.error('Comments fetch error', err)
      }
    }

    fetchBlog()
    fetchComments()
  }, [blogId])

  const handleAddComment = async () => {
    if (!newComment.trim() || !blog) return
    try {
      const data = await apiClient.addBlogComment(blog.id, newComment)
      setComments(prev => [normalizeComment(data), ...prev])
      setNewComment('')
    } catch (err) {
      console.error('Add comment error', err)
    }
  }

  const handleReplyAdded = (parentId: string, reply: Comment) => {
    const addReply = (list: Comment[]): Comment[] =>
      list.map(c =>
        c.id === parentId
          ? { ...c, replies: [...(c.replies || []), reply] }
          : { ...c, replies: c.replies ? addReply(c.replies) : [] }
      )
    setComments(prev => addReply(prev))
  }

  const handleDeleteBlog = async () => {
    if (!blog || !window.confirm('Delete this blog as Admin? This cannot be undone.')) return
    try {
      await apiClient.deleteBlog(blog.id)
      setIsDeleted(true)
      setTimeout(() => router.push('/admin/blogs'), 1000)
    } catch (err) {
      console.error('Failed to delete blog', err)
    }
  }

  const handleCommentDeleted = (commentId: string) => {
    const remove = (list: Comment[]): Comment[] =>
      list
        .filter(c => c.id !== commentId)
        .map(c => ({ ...c, replies: c.replies ? remove(c.replies) : [] }))
    setComments(prev => remove(prev))
  }

  if (loading) return <div className="p-6 text-gray-500">Loading blog details...</div>
  if (!blog) return <div className="p-6 text-gray-500">Blog not found.</div>
  if (isDeleted) return <div className="p-6 text-green-600 font-medium">Blog deleted. Redirecting to admin blogs...</div>

  return (
    <div className="p-6 bg-[#F8F9FA] min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* BACK & ACTIONS */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => router.push('/admin/blogs')}
            className="flex items-center gap-2 font-medium text-gray-700 hover:text-black transition-colors"
          >
            <ArrowLeft className="w-5 h-5" /> Back to Admin Blogs
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={openEditModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
              title="Edit blog"
            >
              <Pencil className="w-4 h-4 text-gray-600" />
              Edit Blog
            </button>
            <button
              onClick={handleDeleteBlog}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-sm font-medium"
              title="Delete blog"
            >
              <Trash2 className="w-4 h-4" />
              Delete Blog
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm mb-6">
          {/* COVER IMAGE */}
          {blog.image && (
            <img src={blog.image} alt={blog.title} className="w-full h-56 sm:h-72 md:h-96 object-cover rounded-xl mb-6" />
          )}

          {/* TITLE */}
          <h1 className="text-3xl font-bold mb-4 whitespace-pre-wrap break-words text-gray-900">{blog.title}</h1>

          {/* AUTHOR & METADATA */}
          <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-6">
            <div className="flex items-center gap-3">
              <img
                src={blog.author.avatar}
                alt={blog.author.name}
                className="w-12 h-12 rounded-full object-cover"
              />
              <div>
                <p className="font-semibold text-gray-900">{blog.author.name}</p>
                <p className="text-sm text-gray-500">{blog.author.title} · {blog.publishedAt}</p>
              </div>
            </div>
            {blog.category && (
              <span className="text-xs px-3 py-1 rounded-full bg-purple-100 text-purple-700 font-medium">
                {blog.category}
              </span>
            )}
          </div>

          {/* RICH CONTENT */}
          <RichTextContent className="mb-8 text-base leading-relaxed text-gray-800 whitespace-pre-wrap" html={blog.content} />
        </div>

        {/* COMMENTS SECTION */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Admin Comment Management ({comments.length})</h3>

          {/* NEW COMMENT INPUT */}
          <div className="mb-6">
            <textarea
              placeholder="Post an admin comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
              className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black text-sm mb-3 resize-none"
            />
            <button onClick={handleAddComment} className="bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">
              Post Admin Comment
            </button>
          </div>

          {/* COMMENTS LIST */}
          {comments.length > 0 ? (
            <div className="space-y-6">
              {comments.map(comment => (
                <BlogCommentItem
                  key={comment.id}
                  comment={comment}
                  blogId={blogId}
                  onReplyAdded={handleReplyAdded}
                  onCommentDeleted={handleCommentDeleted}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No comments yet on this blog.</p>
          )}
        </div>
      </div>

      {/* EDIT BLOG MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Edit Blog (Admin)</h3>
              <button onClick={() => setShowEditModal(false)} className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {editError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {editError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Blog Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="Enter blog title..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Blog Content</label>
                <BasicEditor
                  value={editContent}
                  onChange={setEditContent}
                  placeholder="Write your blog content..."
                  className="w-full bg-gray-50 border rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Cover Image (Optional)</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleCoverImageChange}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700"
                />
                {editImage && (
                  <p className="mt-1 text-xs text-green-600 font-medium">Selected image: {editImage.name}</p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTagsPopup(true)}
                  className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  <Tag className="h-4 w-4" />
                  Edit Tags ({editTags.length})
                </button>
                {editTags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {editTags.map((tag, idx) => (
                      <span key={idx} className="bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleEditBlog}
                  disabled={editLoading}
                  className="px-5 py-2 rounded-xl text-sm font-medium bg-black text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <TagsPopup
        isOpen={showTagsPopup}
        onClose={() => setShowTagsPopup(false)}
        onTagsChange={setEditTags}
        selectedTags={editTags}
      />
    </div>
  )
}
