'use client'

import { X, ImageIcon, BookOpen, Tag } from 'lucide-react'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { TagsPopup } from '@/components/shared/TagsPopup'
import apiClient from '@/lib/api-client'
import { validateImageFile, validateFileBeforeUpload } from '@/lib/utils'
import { useRequireAuth } from '@/hooks/useRequireAuth'
// import BasicEditor from '../editor/BasicEditor'

export function ShareStoryBox() {
  const requireAuth = useRequireAuth()
  const [storyTitle, setStoryTitle] = useState('')
  const [storyText, setStoryText] = useState('')
  const [coverImage, setCoverImage] = useState<File[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [showTagsPopup, setShowTagsPopup] = useState(false)
  const [loading, setLoading] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [draftToast, setDraftToast] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const showDraftToast = (msg: string, showMediaWarning = false) => {
    setDraftToast(msg)
    if (showMediaWarning) {
      setShowMediaWarning(true)
      setTimeout(() => setShowMediaWarning(false), 4000)
    }
    setTimeout(() => setDraftToast(null), 3000)
  }

  const [showMediaWarning, setShowMediaWarning] = useState(false)

  const handleSaveDraft = async () => {
    if (!requireAuth()) return
    if (!storyTitle.trim() && !storyText.trim()) return
    try {
      setSavingDraft(true)
      await apiClient.saveDraft({
        type: 'story',
        autoSaved: false,
        content: { title: storyTitle, content: storyText, tags },
      })
      setStoryTitle('')
      setStoryText('')
      setCoverImage([])
      setTags([])
      showDraftToast('Story saved to drafts!', coverImage.length > 0)
    } catch (err) {
      console.error('Save draft failed:', err)
      showDraftToast('Failed to save draft.')
    } finally {
      setSavingDraft(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      if (files.length > 1) {
        alert('Blogs can only have 1 cover image as media.')
        return
      }
      const file = files[0]
      if (!file) return

      if (file.type.startsWith('video/')) {
        alert('Blogs can only have 1 cover image as media (no videos allowed).')
        return
      }

      const err = validateImageFile(file)
      if (err) { alert(err); return }
      setCoverImage([file])
    }
  }

  const handleShareStory = async () => {
    if (!requireAuth()) return
    if (!storyTitle && !storyText) return

    try {
      setLoading(true)

      // Validate cover image before upload
      if (coverImage[0]) {
        const err = await validateFileBeforeUpload(coverImage[0])
        if (err) { alert(err); setLoading(false); return }
      }

      const formData = new FormData()
      formData.append('type', 'STORY')
      formData.append('title', storyTitle)
      formData.append('content', storyText)
      formData.append('tags', JSON.stringify(tags))

      if (coverImage[0]) {
        formData.append('cover_image', coverImage[0])
      }

      await apiClient.createBlog(formData)

      setStoryTitle('')
      setStoryText('')
      setCoverImage([])
      setTags([])
      await queryClient.invalidateQueries({ queryKey: ['stories-feed'] })
    } catch (err) {
      console.error('Story failed:', err)
      const status = (err as any)?.response?.status
      if (status === 413) {
        alert('Upload failed: File is too large. Please upload a smaller file.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
    <div className="bg-white p-3 sm:p-6 rounded-2xl border">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-gray-100 p-2 rounded-full">
          <BookOpen className="w-5 h-5" />
        </div>
        <h3 className="font-semibold text-gray-900">Share Your Story</h3>
      </div>

      <input
        value={storyTitle}
        onChange={(e) => setStoryTitle(e.target.value)}
        onFocus={() => {
          if (!requireAuth()) {
            ;(document.activeElement as HTMLElement)?.blur()
          }
        }}
        placeholder="Give your story a compelling title..."
        className="w-full p-3 bg-gray-50 border rounded-xl"
      />

      <textarea
        value={storyText}
        onChange={(e) => setStoryText(e.target.value)}
        onFocus={() => {
          if (!requireAuth()) {
            ;(document.activeElement as HTMLElement)?.blur()
          }
        }}
        placeholder="Tell your story..."
        className="
          w-full
          min-h-[200px]
          max-h-[45vh]
          overflow-y-auto
          resize-y
          p-3
          mt-3
          bg-gray-50
          border
          rounded-xl
        "
      />

      {/* 
      <BasicEditor
        value={storyText}
        placeholder='Tell your story... Share insights, experiences, and lessons learned.'
        onChange={setStoryText}
        className="w-full p-3 mt-3 bg-gray-50 border rounded-xl hover:border-gray-400 focus-within:border-gray-400 transition-colors  selected:border-gray-700"
      /> 
      */}

      <div className="flex flex-col sm:flex-row sm:justify-between gap-3 mt-4">
        <div className="flex flex-wrap gap-4 items-center">
          <input
            type="file"
            id="media-upload"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <label
            htmlFor="media-upload"
            onClick={(e) => {
              if (!requireAuth()) {
                e.preventDefault()
              }
            }}
            className="cursor-pointer flex gap-2"
          >
            <ImageIcon className='text-[#474b50]'/> Add Cover
          </label>

          <button
            type="button"
            onClick={() => {
              if (!requireAuth()) return
              setShowTagsPopup(true)
            }}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-all"
          >
            <Tag className="w-4 h-4" />
            Add Tags ({tags.length})
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={savingDraft || loading || (!storyTitle.trim() && !storyText.trim())}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {savingDraft ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            type="button"
            onClick={handleShareStory}
            disabled={loading || !storyText.trim()}
            className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-400 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Publishing...' : 'Publish Story'}
          </button>
        </div>
      </div>

      {coverImage.length > 0 && (
        <div className="relative inline-block mt-3">
          <img
            src={URL.createObjectURL(coverImage[0])}
            alt="Cover preview"
            className="h-36 max-w-full rounded-xl border border-gray-200 object-cover"
          />
          <button
            type="button"
            onClick={() => setCoverImage([])}
            className="absolute -top-1.5 -right-1.5 bg-gray-900 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-500 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      <div className="flex flex-nowrap overflow-x-auto gap-2 mt-2 pb-1">
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 text-sm px-2 py-1 rounded bg-gray-100 whitespace-nowrap"
          >
            {tag}
            <X
              onClick={() => setTags(tags.filter((t) => t !== tag))}
              className="w-4 h-4 cursor-pointer"
            />
          </span>
        ))}
      </div>

      <TagsPopup
        isOpen={showTagsPopup}
        onClose={() => setShowTagsPopup(false)}
        onTagsChange={setTags}
        selectedTags={tags}
      />
    </div>

    {draftToast && (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-full shadow-xl">
        {draftToast}
      </div>
    )}
    {showMediaWarning && (
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-yellow-400 text-black text-sm font-medium px-5 py-3 rounded-full shadow-xl border border-yellow-600">
        <span className="font-bold">Note:</span> Images/media files are <b>not saved</b> in the draft.
      </div>
    )}
  </>
  )
}