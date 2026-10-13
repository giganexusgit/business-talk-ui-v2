'use client'

import { HelpCircle, Tag, X } from 'lucide-react'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { TagsPopup } from '@/components/shared/TagsPopup'
import apiClient from '@/lib/api-client'
import { useAccountStatus } from '@/hooks/useRedux'
import { useRequireAuth } from '@/hooks/useRequireAuth'
// import BasicEditor from '../editor/BasicEditor'

export function PostQuestionBox() {
  const requireAuth = useRequireAuth()
  const { isBanned } = useAccountStatus()
  const [questionText, setQuestionText] = useState('')
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
    if (!questionText.trim()) return
    try {
      setSavingDraft(true)
      await apiClient.saveDraft({
        type: 'question',
        autoSaved: false,
        content: { content: questionText, tags },
      })
      setQuestionText('')
      setTags([])
      showDraftToast('Question saved to drafts!', false)
    } catch (err) {
      console.error('Save draft failed:', err)
      showDraftToast('Failed to save draft.', false)
    } finally {
      setSavingDraft(false)
    }
  }

  const handlePostQuestion = async () => {
    if (!requireAuth()) return
    if (!questionText.trim()) return

    try {
      setLoading(true)

      await apiClient.createPost({
        type: 'QUESTION',
        content: questionText,
        tags,
      })

      setQuestionText('')
      setTags([])
      await queryClient.invalidateQueries({ queryKey: ['feed'] })
    } catch (err) {
      console.error('Question post failed:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
    <div className="bg-white rounded-2xl p-3 sm:p-6 mb-6 border">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-gray-100 p-2 rounded-full">
          <HelpCircle className="w-5 h-5" />
        </div>
        <h3 className="font-semibold text-gray-900">Ask a Question</h3>
      </div>

      {isBanned && (
        <p className="text-xs text-red-500 mb-3 text-center bg-red-50 p-2 rounded-lg">
          Your account is restricted. You cannot post questions.
        </p>
      )}
      <textarea
        value={questionText}
        placeholder={isBanned ? 'Your account is restricted' : 'What would you like to know from the community?'}
        onChange={(e) => setQuestionText(e.target.value)}
        onFocus={() => {
          if (!requireAuth()) {
            ;(document.activeElement as HTMLElement)?.blur()
          }
        }}
        onPaste={(e) => {
          if (e.clipboardData.files && e.clipboardData.files.length > 0) {
            e.preventDefault()
            alert('Questions cannot contain media attachments (images or videos).')
          }
        }}
        onDrop={(e) => {
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            e.preventDefault()
            alert('Questions cannot contain media attachments (images or videos).')
          }
        }}
        disabled={isBanned}
        className="w-full min-h-[140px] max-h-[40vh] overflow-y-auto resize-y p-3 bg-gray-50 border rounded-xl disabled:cursor-not-allowed disabled:opacity-60 hover:border-gray-400 focus-within:border-gray-400 transition-colors  selected:border-gray-700"
      />
      {/* 
      <BasicEditor
        value={questionText}
        placeholder={isBanned ? 'Your account is restricted' : 'What would you like to know from the community?'}
        onChange={setQuestionText}
        disabled={isBanned}
        className="w-full min-h-[140px] max-h-[40vh] overflow-y-auto resize-y p-3 bg-gray-50 border rounded-xl disabled:cursor-not-allowed disabled:opacity-60 hover:border-gray-400 focus-within:border-gray-400 transition-colors  selected:border-gray-700"
      /> 
      */}

      <div className="flex flex-col sm:flex-row sm:justify-between gap-3 mt-3">
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

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={savingDraft || loading || !questionText.trim() || isBanned}
            className="w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {savingDraft ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            type="button"
            onClick={handlePostQuestion}
            disabled={loading || !questionText.trim() || isBanned}
            className="w-full sm:w-auto bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-400 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Posting...' : 'Post Question'}
          </button>
        </div>
      </div>

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