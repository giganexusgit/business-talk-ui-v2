import type { MessageEntity, MessageAttachment, MessageType } from '@/types/chat';

interface CurrentUser {
  id: string;
  full_name?: string;
  profile_photo?: string | null;
}

export function createOptimisticMessageId(): string {
  const randomPart =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `tmp_${Date.now()}_${randomPart}`;
}

export function buildOptimisticMessage(params: {
  conversationId: string;
  text: string;
  currentUser: CurrentUser;
  file?: File | null;
}): MessageEntity {
  const tempId = createOptimisticMessageId();
  const senderName = params.currentUser.full_name || 'Me';

  let messageType: MessageType = 'text';
  const attachments: MessageAttachment[] = [];

  if (params.file) {
    const isImage = params.file.type.startsWith('image/');
    const isVideo = params.file.type.startsWith('video/');
    const isAudio = params.file.type.startsWith('audio/');
    
    if (isImage) messageType = 'image';
    else if (isVideo) messageType = 'video';
    else if (isAudio) messageType = 'audio';
    else messageType = 'file';

    const objectUrl = typeof window !== 'undefined' ? URL.createObjectURL(params.file) : '';

    attachments.push({
      id: `att_${tempId}`,
      type: messageType,
      url: objectUrl,
      fileName: params.file.name,
      mimeType: params.file.type,
      size: params.file.size,
    });
  }

  return {
    id: tempId,
    tempId,
    conversationId: params.conversationId,
    text: params.text,
    senderId: String(params.currentUser.id || ''),
    senderName,
    senderAvatar:
      params.currentUser.profile_photo ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status: 'pending',
    messageType,
    attachments,
    preview: null,
    isDeleted: false,
  };
}
