'use client'

import { ImagePlay, Video, X } from 'lucide-react'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import { useAccountStatus } from '@/hooks/useRedux'
import { validateMediaFile, validateFileBeforeUpload } from '@/lib/utils'
import { useRequireAuth } from '@/hooks/useRequireAuth'
// import BasicEditor from '../editor/BasicEditor'

export function CreatePostBox() {
  const requireAuth = useRequireAuth()
  const { isBanned } = useAccountStatus()
  const [postContent, setPostContent] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
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
    if (!postContent.trim()) return
    try {
      setSavingDraft(true)
      await apiClient.saveDraft({
        type: 'post',
        autoSaved: false,
        content: { content: postContent, tags: [] },
      })
      setPostContent('')
      setSelectedFiles([])
      showDraftToast('Post saved to drafts!', selectedFiles.length > 0)
    } catch (err) {
      console.error('Save draft failed:', err)
      showDraftToast('Failed to save draft.')
    } finally {
      setSavingDraft(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const incoming = Array.from(event.target.files)
      const errors = incoming.map(validateMediaFile).filter(Boolean) as string[]
      if (errors.length) { alert(errors.join('\n')); return }
      setSelectedFiles((prev) => [...prev, ...incoming])
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleCreatePost = async () => {
    if (!requireAuth()) return
    if (!postContent.trim() && selectedFiles.length === 0) return

    try {
      setLoading(true)

      // Validate files (size, type, dimensions) before uploading to avoid backend 413
      if (selectedFiles.length > 0) {
        const validations = await Promise.all(selectedFiles.map((f) => validateFileBeforeUpload(f)))
        const errors = validations.filter(Boolean) as string[]
        if (errors.length) {
          alert(errors.join('\n'))
          setLoading(false)
          return
        }
      }

      const formData = new FormData()
      formData.append('type', 'NORMAL')
      formData.append('content', postContent)

      selectedFiles.forEach((file) => {
        formData.append('media', file)
      })

      await apiClient.createPostWithMedia(formData)

      setPostContent('')
      setSelectedFiles([])
      await queryClient.invalidateQueries({ queryKey: ['feed'] })
      await queryClient.invalidateQueries({ queryKey: ['posts'] })
    } catch (err) {
      console.error('Create post failed:', err)
      // Handle backend 413 Request Entity Too Large
      const status = (err as any)?.response?.status
      if (status === 413) {
        const msg = 'Upload failed: File is too large. Please upload a smaller file.'
        alert(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
    <div className="bg-white rounded-2xl shadow-sm p-3 sm:p-6 mb-6 border">
      {isBanned && (
        <p className="text-xs text-red-500 mb-3 text-center bg-red-50 p-2 rounded-lg">
          Your account is restricted. You cannot create posts.
        </p>
      )}
      {/* <textarea
        value={postContent}
        onChange={(e) => setPostContent(e.target.value)}
        placeholder={isBanned ? 'Your account is restricted' : 'Ask, Share, Contribute…'}
        disabled={isBanned}
        className="w-full min-h-[120px] p-4 rounded-xl resize-none bg-gray-50 border disabled:cursor-not-allowed disabled:opacity-60 hover:border-gray-400 focus-within:border-gray-400 transition-colors selected:border-gray-700"
      /> */}

      <textarea
        value={postContent}
        onChange={(e) => setPostContent(e.target.value)}
        onFocus={() => {
          if (!requireAuth()) {
            ;(document.activeElement as HTMLElement)?.blur()
          }
        }}
        placeholder={
          isBanned
            ? 'Your account is restricted'
            : 'Ask, Share, Contribute…'
        }
        disabled={isBanned}
        className="
          w-full
          min-h-[120px]
          max-h-[40vh]
          overflow-y-auto
          p-4
          rounded-xl
          resize-y
          bg-gray-50
          border
          disabled:cursor-not-allowed
          disabled:opacity-60
        "
      />

      {/*  
      <BasicEditor
        value={postContent}
        onChange={setPostContent}
        placeholder={isBanned ? 'Your account is restricted' : 'Ask, Share, Contribute…'}
        disabled={isBanned}
        className="w-full min-h-[120px] p-4 rounded-xl resize-none bg-gray-50 border disabled:cursor-not-allowed disabled:opacity-60 hover:border-gray-400 focus-within:border-gray-400 transition-colors selected:border-gray-700"
      /> 
      */}

      {selectedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {selectedFiles.map((file, index) => (
            <div key={index} className="relative">
              {file.type.startsWith('image/') ? (
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="w-20 h-20 object-cover rounded-xl border border-gray-200"
                />
              ) : (
                <div className="w-20 h-20 flex flex-col items-center justify-center bg-gray-100 rounded-xl border border-gray-200 text-xs text-gray-500 p-1 gap-1">
                  <Video className="w-5 h-5 flex-shrink-0" />
                  <span className="truncate w-full text-center">{file.name}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="absolute -top-1.5 -right-1.5 bg-gray-900 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-500 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:justify-between gap-3 mt-4">
        <input
          type="file"
          id="media-upload"
          accept="image/*,video/*"
          multiple
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
          <ImagePlay />
        </label>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={savingDraft || loading || !postContent.trim() || isBanned}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {savingDraft ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            type="button"
            onClick={handleCreatePost}
            disabled={loading || (!postContent.trim() && selectedFiles.length === 0) || isBanned}
            className="bg-black text-white px-6 py-2 rounded-lg w-full sm:w-auto hover:bg-gray-400 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Posting...' : 'Create Post'}
          </button>
        </div>
      </div>
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