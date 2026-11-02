'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Tag } from 'lucide-react'
import { TagsPopup } from '@/components/shared/TagsPopup'
import apiClient from '@/lib/api-client'
// import BasicEditor from '../editor/BasicEditor'

export function AdminCreateQuestionBox({ onCreated }: { onCreated?: () => void }) {
  const [question, setQuestion] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [showTags, setShowTags] = useState(false)
  const [loading, setLoading] = useState(false)
  const queryClient = useQueryClient()

  const handleCreate = async () => {
    if (!question.trim()) return

    try {
      setLoading(true)

      await apiClient.createPost({
        type: 'QUESTION',
        content: question,
        tags,
      })

      setQuestion('')
      setTags([])
      await queryClient.invalidateQueries({ queryKey: ['admin-questions'] })
      await queryClient.invalidateQueries({ queryKey: ['feed'] })
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('post-created'))
        window.dispatchEvent(new CustomEvent('question-created'))
      }
      onCreated?.()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl p-6 border mb-6">
      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask a question as admin..."
        className="w-full min-h-[140px] max-h-[40vh] overflow-y-auto resize-y p-3 bg-gray-50 border rounded-xl hover:border-gray-400 focus-within:border-gray-400 transition-colors  selected:border-gray-700"
      />
      {/* 
      <BasicEditor
        value={question}
        onChange={setQuestion}
        placeholder="Ask a question as admin..."
        className="w-full p-3 bg-gray-50 border rounded-xl hover:border-gray-400 focus-within:border-gray-400 transition-colors  selected:border-gray-700"
      />
      */}

      {/* Tags */}
        {tags.length > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <Tag className="w-4 h-4" />
              <div className="flex flex-wrap gap-2">
              {tags.map((tag, idx) => (
                <span 
                  key={idx} 
                  className="px-3 py-1 rounded-full text-sm font-medium"
                  style={{ 
                    backgroundColor: '#F3F4F6',
                    color: '#5F6368' 
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

      <div className="flex flex-col sm:flex-row sm:justify-between gap-3 mt-3">
        <button type="button" onClick={() => setShowTags(true)} className="flex gap-2 text-sm">
          <Tag /> Tags ({tags.length})
        </button>

        <button
          type="button"
          onClick={handleCreate}
          disabled={loading}
          className="bg-black text-white px-5 py-2 rounded-lg"
        >
          {loading ? 'Posting...' : 'Create Question'}
        </button>
      </div>

      <TagsPopup
        isOpen={showTags}
        onClose={() => setShowTags(false)}
        onTagsChange={setTags}
        selectedTags={tags}
      />
    </div>
  )
}