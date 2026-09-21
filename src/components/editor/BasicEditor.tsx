'use client'

import {
  Editor,
  EditorProvider,
  Toolbar,
  BtnBold,
  BtnItalic,
  BtnUnderline,
  BtnBulletList,
  BtnNumberedList,
  // BtnLink
} from 'react-simple-wysiwyg'

import { Link2 } from 'lucide-react'

interface BasicEditorProps {
  value: string

  onChange: (value: string) => void

  placeholder: string

  className: string

  disabled?: boolean

  rows?: number

  style?: React.CSSProperties

  onKeyDown?: (
    e: React.KeyboardEvent
  ) => void
}

export default function BasicEditor({
  value,
  onChange,
  placeholder,
  className,
  disabled = false,
  rows,
  style,
  onKeyDown,
}: BasicEditorProps) {

  function CustomLinkButton() {
    const insertLink = () => {
      const url = prompt('Enter URL')

      if (!url) return

      document.execCommand(
        'createLink',
        false,
        url
      )
    }

    return (
      <button
        type="button"
        className="rsw-btn"
        title="Insert Link"
        onClick={insertLink}
      >
        <Link2 size={18} />
      </button>
    )
  }

  return (
    <EditorProvider>
      <div
        className={className}
        style={style}
      >
        <div className="border rounded-xl overflow-hidden bg-white">
          
          <div className="border-b bg-gray-50 sticky top-0 z-10 overflow-x-auto">
            <Toolbar
              style={{
                display: 'flex',
                flexWrap: 'nowrap',
                minWidth: 'max-content',
                padding: '8px',
                gap: '8px',
                overflowX: 'auto',
              }}
            >
              <BtnBold className='rsw-btn'/>
              <BtnItalic className='rsw-btn'/>
              <BtnUnderline className='rsw-btn'/>
              <BtnBulletList className='rsw-btn'/>
              <BtnNumberedList className='rsw-btn'/>
              {/* <BtnLink className='rsw-btn '/> */}
              <CustomLinkButton />
            </Toolbar>
          </div>

          <Editor
            value={value}
            disabled={disabled}
            placeholder={placeholder}
            onKeyDown={onKeyDown}
            onChange={(e) => onChange(e.target.value)}
            containerProps={{
              className:
                'min-h-[160px] max-h-[50vh] overflow-y-auto text-base leading-relaxed'
            }}
            style={{
              minHeight: rows
                ? `${rows * 24}px`
                : '160px',
              maxHeight: '50vh',
              overflowY: 'auto',
            }}
          />
        </div>

        <style jsx global>{`
          /* ===== Toolbar Container ===== */

          .rsw-toolbar {
            display: flex !important;
            flex-wrap: nowrap !important;
            align-items: center;
            gap: 6px;
            padding: 8px;
            overflow-x: auto;
            overflow-y: hidden;
            scrollbar-width: none;
            -ms-overflow-style: none;
            background: #f8fafc;
          }

          .rsw-toolbar::-webkit-scrollbar {
            display: none;
          }

          .rsw-toolbar {
            scroll-snap-type: x proximity;
          }

          .rsw-toolbar .rsw-btn {
            scroll-snap-align: start;
          }

          /* ===== Default Buttons ===== */

          .rsw-toolbar .rsw-btn {
            width: 48px;
            height: 48px;
            min-width: 44px;
            min-height: 44px;

            display: flex;
            align-items: center;
            justify-content: center;

            border-radius: 10px;
            border: 1px solid transparent;

            background: transparent;
            color: #374151;

            transition: all 0.2s ease;
          }

          /* ===== Hover ===== */

          .rsw-btn:hover,
          .rsw-toolbar button:hover {
            background: #e5e7eb;
            color: #111827;
          }

          .rsw-toolbar .rsw-btn:hover {
            background: #e5e7eb !important;
          }

          /* ===== Selected / Active ===== */

          .rsw-toolbar .rsw-btn[data-active='true'] {
            background-color: #000 !important;
            color: #fff !important;
            border: 1px solid #000 !important;
          }

          .rsw-toolbar .rsw-btn[data-active='true'] svg {
            color: #fff !important;
            fill: #fff !important;
          }

          .rsw-toolbar .rsw-btn[data-active='true'] path {
            fill: currentColor !important;
          }

          .rsw-toolbar .rsw-btn[data-active='true'] {
            background: #000 !important;
            color: #fff !important;
            box-shadow: 0 2px 8px rgba(0,0,0,.15);
          }

          /* ===== Editor Area ===== */

          .rsw-editor {
            background: white;
          }

          .rsw-ce {
            min-height: 160px;
            max-height: 50vh;
            overflow-y: auto;
            padding: 14px;
            font-size: 16px;
            line-height: 1.7;
            color: #111827;
            white-space: pre-wrap;
          }

          .rsw-ce:focus {
            outline: none;
          }

          .rsw-editor:focus-within {
            border-color: #000;
            box-shadow: 0 0 0 3px rgba(0,0,0,.08);
          }

          /* ===== Mobile ===== */

          @media (max-width: 640px) {
            .rsw-toolbar {
              position: sticky;
              top: 0;
              z-index: 10;
              padding: 8px;
              gap: 8px;
            }

            .rsw-btn,
            .rsw-toolbar button {
              min-width: 48px;
              min-height: 48px;
              font-size: 16px;
              border-radius: 12px;
            }

            .rsw-ce {
              min-height: 180px;
              font-size: 16px;
              padding: 16px;
            }
          }
        `}</style>
      </div>
    </EditorProvider>
  )
}