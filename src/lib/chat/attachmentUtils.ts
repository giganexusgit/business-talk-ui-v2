export type FileCategory = 'image' | 'video' | 'audio' | 'pdf' | 'document' | 'archive' | 'file';

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const num = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
  return `${num} ${sizes[i]}`;
}

export function getFileCategory(fileOrType: File | string): FileCategory {
  const typeStr = typeof fileOrType === 'string' ? fileOrType.toLowerCase() : (fileOrType.type || fileOrType.name || '').toLowerCase();

  if (typeStr.startsWith('image/')) return 'image';
  if (typeStr.startsWith('video/')) return 'video';
  if (typeStr.startsWith('audio/')) return 'audio';
  if (typeStr.includes('pdf')) return 'pdf';

  if (
    typeStr.includes('word') ||
    typeStr.includes('officedocument.wordprocessingml') ||
    typeStr.includes('excel') ||
    typeStr.includes('officedocument.spreadsheetml') ||
    typeStr.includes('presentation') ||
    typeStr.includes('powerpoint') ||
    typeStr.includes('text/plain') ||
    typeStr.includes('csv') ||
    /\.(doc|docx|xls|xlsx|ppt|pptx|txt|csv)$/i.test(typeStr)
  ) {
    return 'document';
  }

  if (
    typeStr.includes('zip') ||
    typeStr.includes('compressed') ||
    typeStr.includes('tar') ||
    typeStr.includes('rar') ||
    /\.(zip|rar|7z|tar|gz)$/i.test(typeStr)
  ) {
    return 'archive';
  }

  return 'file';
}

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export function validateAttachmentFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file selected' };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File "${file.name}" exceeds maximum allowed size of 25MB (${formatFileSize(file.size)}).`,
    };
  }

  return { valid: true };
}
