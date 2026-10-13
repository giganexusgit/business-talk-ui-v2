'use client'

import { MessageCircle, ThumbsUp, Send} from 'lucide-react'
import { useState } from 'react'
import { ShareModal } from '@/components/shared/ShareModal'
import { ContentData } from '@/hooks/useContentViewer'
import { MediaGrid, MediaItem } from '@/components/shared/MediaGrid'
import ExpandableText from '@/components/common/ExpandableText'
import { useRequireAuth } from '@/hooks/useRequireAuth'

interface PostViewCardProps {
  data: ContentData
}

export function PostViewCard({ data }: PostViewCardProps) {
  const requireAuth = useRequireAuth()
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(data.likes || 0);
  const [showComments, setShowComments] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [replyInput, setReplyInput] = useState('');
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [commentsList, setCommentsList] = useState<any[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);

  // Recursive render for nested replies
  const renderNestedReplies = (replies: any[], parentId: number, parentReplyId?: number, parentKeyChain: string = ""): JSX.Element | null => {
    if (!replies || replies.length === 0) return null;
    return (
      <div className="mt-3 ml-8 space-y-3">
        {replies.map((nestedReply: any) => {
          const pathKey = `${parentKeyChain}${parentId}${parentReplyId !== undefined ? `-${parentReplyId}` : ''}-${nestedReply.id}`;
          return (
            <div key={pathKey}>
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
                      onClick={() => handleLikeComment(nestedReply.id, parentReplyId || parentId)}
                      className="hover:opacity-70 transition-all font-medium flex items-center gap-1"
                      style={{ color: likedComments.has(`${parentReplyId || parentId}-reply-${nestedReply.id}`) ? '#1d9bf0' : '#5F6368' }}>
                      <ThumbsUp className="w-4 h-4" />
                      <span>{nestedReply.likes}</span>
                    </button>
                    <button
                      onClick={() => {
                        if (!requireAuth()) return;
                        setReplyingTo(replyingTo === `reply-${nestedReply.id}` ? null : `reply-${nestedReply.id}`);
                      }}
                      className="hover:opacity-70 transition-all">
                      Reply
                    </button>
                  </div>
                </div>
              </div>
              {/* Reply to Nested Reply Input */}
              {replyingTo === `reply-${nestedReply.id}` && (
                <div className="flex gap-2 mt-2 ml-8">
                  <img
                    src="/avatar.png"
                    className="w-6 h-6 rounded-full object-cover"
                    alt="Your avatar"
                  />
                  <input
                    type="text"
                    placeholder="Write a reply..."
                    value={replyInput}
                    onChange={(e) => setReplyInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddReply(parentId, nestedReply.id)}
                    className="flex-1 text-xs border border-gray-200 rounded-full px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  <button
                    onClick={() => handleAddReply(parentId, nestedReply.id)}
                    className="text-blue-600 hover:text-blue-700 px-2 py-1 rounded-full text-xs font-medium"
                  >
                    Send
                  </button>
                </div>
              )}
              {/* Recursively render deeper nested replies */}
              {nestedReply.replies && nestedReply.replies.length > 0 &&
                renderNestedReplies(nestedReply.replies, parentId, nestedReply.id, pathKey + '-')
              }
            </div>
          );
        })}
      </div>
    );
  };

  // Like/unlike post
  const handleLike = () => {
    if (!requireAuth()) return;
    setLiked((prev) => {
      setLikeCount((count: number) => prev ? count - 1 : count + 1);
      return !prev;
    });
  };

  // Like/unlike comment or reply
  const handleLikeComment = (commentId: number, parentId?: number) => {
    if (!requireAuth()) return;
    const itemId = parentId ? `${parentId}-reply-${commentId}` : `comment-${commentId}`;
    const isLiked = likedComments.has(itemId);
    const newLikedComments = new Set(likedComments);
    if (isLiked) {
      newLikedComments.delete(itemId);
    } else {
      newLikedComments.add(itemId);
    }
    setLikedComments(newLikedComments);

    if (parentId) {
      // Like/Unlike a reply at any depth
      const likeDelta = isLiked ? -1 : 1;
      const findAndUpdateReplyAtPath = (replies: any[], targetParentId: number): boolean => {
        for (let reply of replies) {
          if (reply.id === commentId) {
            reply.likes += likeDelta;
            return true;
          }
          if (reply.id === targetParentId) {
            if (reply.replies) {
              for (let childReply of reply.replies) {
                if (childReply.id === commentId) {
                  childReply.likes += likeDelta;
                  return true;
                }
                if (childReply.replies && findAndUpdateReplyAtPath(childReply.replies, commentId)) {
                  return true;
                }
              }
            }
            return false;
          }
          if (reply.replies && findAndUpdateReplyAtPath(reply.replies, targetParentId)) {
            return true;
          }
        }
        return false;
      };
      setCommentsList(
        commentsList.map(comment => {
          const updatedComment = { ...comment };
          findAndUpdateReplyAtPath(updatedComment.replies || [], parentId);
          return updatedComment;
        })
      );
    } else {
      setCommentsList(
        commentsList.map(comment =>
          comment.id === commentId
            ? { ...comment, likes: isLiked ? comment.likes - 1 : comment.likes + 1 }
            : comment
        )
      );
    }
  };

  // Add a new comment
  const handleAddComment = () => {
    if (!requireAuth()) return;
    if (commentInput.trim()) {
      const newComment = {
        id: Math.max(0, ...commentsList.map(c => c.id)) + 1,
        author: { name: 'You', avatar: '/avatar.png', title: 'Your Title' },
        content: commentInput,
        created_at: new Date().toISOString(),
        likes: 0,
        replies: [],
      };
      setCommentsList([...commentsList, newComment]);
      setCommentInput('');
    }
  };

  // Add a reply to a comment or reply
  const handleAddReply = (commentId: number, parentReplyId?: number) => {
    if (!requireAuth()) return;
    if (replyInput.trim()) {
      const newReply = {
        id: Math.max(0, ...commentsList.flatMap(c => [c.id, ...(c.replies || []).map((r: any) => r.id)])) + 1,
        author: { name: 'You', avatar: '/avatar.png', title: 'Your Title' },
        content: replyInput,
        created_at: new Date().toISOString(),
        likes: 0,
        replies: []
      };
      const addReplyAtDepth = (replies: any[], targetId: number): boolean => {
        for (let reply of replies) {
          if (reply.id === targetId) {
            reply.replies = [...(reply.replies || []), newReply];
            return true;
          }
          if (reply.replies && addReplyAtDepth(reply.replies, targetId)) {
            return true;
          }
        }
        return false;
      };
      if (parentReplyId) {
        setCommentsList(
          commentsList.map(comment => {
            if (comment.id === commentId) {
              const updatedComment = { ...comment };
              addReplyAtDepth(updatedComment.replies || [], parentReplyId);
              return updatedComment;
            }
            return comment;
          })
        );
      } else {
        setCommentsList(
          commentsList.map(comment => {
            if (comment.id === commentId) {
              return {
                ...comment,
                replies: [...(comment.replies || []), newReply]
              };
            }
            return comment;
          })
        );
      }
      setReplyInput('');
      setReplyingTo(null);
    }
  };

  const handleShare = () => {
    if (!requireAuth()) return;
    setShowShareModal(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <img
          src={data.author?.avatar || '/avatar.png'}
          alt={data.author?.name || 'Author'}
          className="w-12 h-12 rounded-full object-cover"
        />
        <div>
          <h3 className="font-semibold text-gray-900">{data.author?.name}</h3>
          <p className="text-sm text-gray-500">{data.author?.title || 'User'}</p>
          <p className="text-xs text-gray-400">{data.timestamp || 'just now'}</p>
        </div>
      </div>

      {/* Content */}
      <div>
        <ExpandableText className="text-gray-800 leading-relaxed" lines={4}>{data.content}</ExpandableText>
      </div>

      {/* Media */}
      {(() => {
        const mediaItems: MediaItem[] = data.media && data.media.length > 0
          ? data.media
          : [
              ...(data.image ? [{ url: data.image, type: 'image' as const }] : []),
              ...(data.video ? [{ url: data.video, type: 'video' as const }] : []),
            ]
        return mediaItems.length > 0 ? <MediaGrid media={mediaItems} /> : null
      })()}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
        <button
          onClick={handleLike}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
            liked
              ? 'text-blue-600 bg-blue-50'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <ThumbsUp className="w-5 h-5" />
          <span className="text-sm font-medium">{likeCount}</span>
        </button>
        <button
          onClick={() => {
            if (!requireAuth()) return;
            setShowComments(!showComments);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm font-medium">{commentsList.length}</span>
        </button>
        <button
          onClick={handleShare}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors ml-auto"
        >
          <Send className="w-5 h-5" />
          <span className="text-sm font-medium">Share</span>
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
          {/* Comment Input */}
          <div className="flex gap-2">
            <img
              src="/avatar.png"
              className="w-8 h-8 rounded-full object-cover"
              alt="Your avatar"
            />
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                placeholder="Add a comment..."
                value={commentInput}
                onFocus={() => { if (!requireAuth()) return; }}
                onChange={(e) => setCommentInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddComment}
                className="px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 transition-colors"
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
                    src={comment.author.avatar}
                    alt={comment.author.name}
                    className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                  />
                  <div className="flex-1">
                    <div className="bg-gray-100 rounded-lg px-3 py-2">
                      <p className="font-semibold text-xs text-gray-900">{comment.author.name}</p>
                      <p className="text-xs text-gray-700 whitespace-pre-wrap break-words">{comment.content}</p>
                    </div>
                    <div className="flex gap-3 mt-1 px-3 text-xs text-gray-500">
                      <button
                        onClick={() => handleLikeComment(comment.id)}
                        className="hover:opacity-70 transition-all font-medium flex items-center gap-1"
                        style={{ color: likedComments.has(`comment-${comment.id}`) ? '#1d9bf0' : '#5F6368' }}
                      >
                        <ThumbsUp className="w-4 h-4" />
                        <span>{comment.likes}</span>
                      </button>
                      <button
                        onClick={() => {
                          if (!requireAuth()) return;
                          setReplyingTo(replyingTo === `reply-${comment.id}` ? null : `reply-${comment.id}`);
                        }}
                        className="hover:opacity-70 transition-all"
                      >
                        Reply
                      </button>
                    </div>
                    {/* Reply to Comment Input */}
                    {replyingTo === `reply-${comment.id}` && (
                      <div className="flex gap-2 mt-2 ml-8">
                        <img
                          src="/avatar.png"
                          className="w-6 h-6 rounded-full object-cover"
                          alt="Your avatar"
                        />
                        <input
                          type="text"
                          placeholder="Write a reply..."
                          value={replyInput}
                          onChange={(e) => setReplyInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleAddReply(comment.id)}
                          className="flex-1 text-xs border border-gray-200 rounded-full px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                        <button
                          onClick={() => handleAddReply(comment.id)}
                          className="text-blue-600 hover:text-blue-700 px-2 py-1 rounded-full text-xs font-medium"
                        >
                          Send
                        </button>
                      </div>
                    )}
                    {/* Nested Replies */}
                    {comment.replies && comment.replies.length > 0 &&
                      renderNestedReplies(comment.replies, comment.id)
                    }
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        postContent={data.content}
        contentType="posts"
        contentId={data.id}
      />
    </div>
  );
}
