import React, { useState } from 'react';
import { Check, X, FileText, Download, FileArchive, FileSpreadsheet, File } from 'lucide-react';
import type { MessageEntity } from '@/types/chat';
import RichTextContent from '@/components/common/RichTextContent';
import { renderMessageHtml } from '@/lib/chat/renderMessage';
import { formatFileSize, getFileCategory } from '@/lib/chat/attachmentUtils';

interface MessageBubbleProps {
  message: MessageEntity;
  isMine: boolean;
  isGroup: boolean;
  displayTime: string;
}

function FileTypeIcon({ typeStr }: { typeStr: string }) {
  const cat = getFileCategory(typeStr);
  if (cat === 'pdf') return <FileText className="w-5 h-5 text-red-500 shrink-0" />;
  if (cat === 'archive') return <FileArchive className="w-5 h-5 text-amber-500 shrink-0" />;
  if (cat === 'document') return <FileSpreadsheet className="w-5 h-5 text-green-600 shrink-0" />;
  return <File className="w-5 h-5 text-blue-500 shrink-0" />;
}

function SharedPreview({ message }: { message: MessageEntity }) {
  if (message.messageType !== 'blog' && message.messageType !== 'post') {
    return null;
  }

  const preview = message.preview;

  if (!preview) return null;

  const imgSrc =
    preview.image ||
    preview.imageUrl ||
    preview.thumbnailUrl ||
    preview.img;

  const title = preview.title || preview.headline || '';
  const description =
    preview.text ||
    preview.description ||
    preview.subtitle ||
    '';

  return (
    <a
      href={preview.url || '#'}
      target={preview.url ? '_blank' : undefined}
      rel={preview.url ? 'noreferrer' : undefined}
      className="mt-2 block rounded-lg border border-gray-200 overflow-hidden bg-white"
    >
      {imgSrc && (
        <div className="w-full h-36 bg-gray-100">
          <img
            src={imgSrc}
            alt={title || 'Preview'}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.parentElement?.remove();
            }}
          />
        </div>
      )}

      <div className="p-2">
        <p className="text-[11px] uppercase tracking-wide text-gray-500">
          {preview.type || 'POST'}
        </p>

        {title ? (
          <RichTextContent className="text-sm font-semibold text-gray-900 line-clamp-2" html={title} />
        ) : null}

        {description ? (
          <RichTextContent className="text-xs text-gray-600 line-clamp-2" html={description} />
        ) : null}
      </div>
    </a>
  );
}

function AttachmentBlock({
  message,
  onPreviewImage,
}: {
  message: MessageEntity;
  onPreviewImage?: (url: string, name?: string) => void;
}) {
  if (!message.attachments?.length) return null;

  return (
    <div className="mt-2 space-y-2">
      {message.attachments?.map((attachment) => {
        if (attachment.type === 'image') {
          const src = attachment.url || attachment.thumbnailUrl;
          return (
            <div
              key={attachment.id}
              onClick={() => onPreviewImage && src && onPreviewImage(src, attachment.fileName)}
              className="w-full max-w-sm max-h-60 bg-gray-100 rounded-xl overflow-hidden border border-gray-200 cursor-pointer group relative transition-transform active:scale-[0.99]"
            >
              <img
                src={src}
                alt={attachment.fileName || 'Image attachment'}
                className="w-full h-full object-cover max-h-60"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.parentElement?.remove();
                }}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 bg-black/65 text-white text-xs px-2.5 py-1 rounded-full backdrop-blur-sm transition-opacity">
                  Click to view
                </span>
              </div>
            </div>
          );
        }

        if (attachment.type === 'video') {
          return (
            <video
              key={attachment.id}
              poster={attachment.thumbnailUrl}
              controls
              className="max-w-full rounded-xl border border-gray-200 max-h-60"
            >
              <source src={attachment.url} />
            </video>
          );
        }

        if (attachment.type === 'audio' || attachment.type === 'voice') {
          return (
            <audio key={attachment.id} controls className="w-full min-w-[200px]">
              <source src={attachment.url} />
            </audio>
          );
        }

        const category = getFileCategory(attachment.fileName || attachment.mimeType || 'file');

        return (
          <div
            key={attachment.id}
            className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white/90 shadow-sm max-w-sm"
          >
            <FileTypeIcon typeStr={attachment.fileName || attachment.mimeType || ''} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate" title={attachment.fileName || 'Attachment'}>
                {attachment.fileName || 'Attachment'}
              </p>
              {attachment.size ? (
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {formatFileSize(attachment.size)}
                </p>
              ) : (
                <p className="text-[11px] text-gray-400 uppercase tracking-wide mt-0.5">
                  {category}
                </p>
              )}
            </div>
            {attachment.url && (
              <a
                href={attachment.url}
                target="_blank"
                rel="noreferrer"
                download={attachment.fileName || true}
                className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors shrink-0 flex items-center gap-1"
                title="Download / Open attachment"
              >
                <Download className="w-4 h-4" />
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isMine,
  isGroup,
  displayTime,
}) => {
  const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(null);
  const [activePreviewName, setActivePreviewName] = useState<string | undefined>(undefined);

  if (message.isDeleted) {
    return (
      <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
        <div className="px-3 py-2 rounded-2xl text-sm italic text-gray-400 bg-gray-100 border border-dashed border-gray-300">
          This message was deleted
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
        {!isMine && isGroup && (
          <img
            src={
              message.senderAvatar ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(message.senderName || 'User')}`
            }
            alt={message.senderName}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
            className="w-6 h-6 md:w-7 md:h-7 rounded-full mr-2 self-end shrink-0"
          />
        )}

        <div className="max-w-[calc(100%-4rem)] md:max-w-[70%]">
          {!isMine && isGroup && (
            <p className="text-xs text-gray-500 ml-1 mb-1">{message.senderName}</p>
          )}

          <div
            className={`px-3 py-2 rounded-2xl text-sm break-words whitespace-pre-wrap ${
              isMine
                ? 'bg-[#DCF8C6] text-black rounded-br-sm'
                : 'bg-gray-100 text-black rounded-bl-sm'
            } ${message.status === 'pending' ? 'opacity-60' : ''}`}
          >
            {message.text ? (
              <div
                className="break-words whitespace-normal"
                dangerouslySetInnerHTML={renderMessageHtml(message.text)}
              />
            ) : null}
            <SharedPreview message={message} />
            <AttachmentBlock
              message={message}
              onPreviewImage={(url, name) => {
                setActivePreviewUrl(url);
                setActivePreviewName(name);
              }}
            />
            <div className="flex items-center justify-end gap-1 mt-1">
              <span className="text-[10px] text-gray-500">{displayTime}</span>
              {isMine && (
                <span className="flex items-center gap-1">
                  {message.status === 'failed' ? (
                    <span className="flex items-center gap-1">
                      <X className="w-3 h-3 text-red-500" aria-hidden />
                      <span className="sr-only">Failed</span>
                    </span>
                  ) : message.status === 'seen' ? (
                    <span className="flex items-center gap-[2px]">
                      <span className="flex items-center">
                        <Check className="w-3 h-3 text-green-600" aria-hidden />
                      </span>
                      <span className="flex items-center">
                        <Check className="w-3 h-3 text-green-600" aria-hidden />
                      </span>
                      <span className="sr-only">Seen</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Check className="w-3 h-3 text-gray-500" aria-hidden />
                      <span className="sr-only">Sent</span>
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Image Preview Modal */}
      {activePreviewUrl && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setActivePreviewUrl(null)}
        >
          <button
            type="button"
            onClick={() => setActivePreviewUrl(null)}
            className="absolute top-4 right-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/30 transition-colors"
            aria-label="Close image preview"
          >
            <X className="h-6 w-6" />
          </button>
          <div
            className="relative max-h-[90vh] max-w-[95vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={activePreviewUrl}
              alt={activePreviewName || 'Attachment preview'}
              className="max-h-[85vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
            />
            {activePreviewName && (
              <p className="text-center text-xs text-white/80 mt-2 truncate max-w-md mx-auto">
                {activePreviewName}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default MessageBubble;
