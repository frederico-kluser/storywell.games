import { ChatMessage } from '../types';

/**
 * Sanitizes a message array by removing duplicates while preserving order.
 * Duplicates are detected by message id and also by content+sender within a short interval.
 */
export function sanitizeMessages(messages: ChatMessage[]): ChatMessage[] {
  if (!Array.isArray(messages) || messages.length === 0) {
    return [];
  }

  const seenIds = new Set<string>();
  const recentContent = new Map<string, number>();
  const sanitized: ChatMessage[] = [];

  for (const msg of messages) {
    if (!msg) continue;

    const { id, senderId, type, text, timestamp } = msg;
    if (id && seenIds.has(id)) {
      continue;
    }

    const normalizedText = (text || '').replace(/\s+/g, ' ').trim();
    const contentKey = `${senderId}|${type}|${normalizedText}`;
    const lastTimestamp = recentContent.get(contentKey);

    if (lastTimestamp !== undefined) {
      // Ignore repetitions with the same content that happen within 2 seconds
      if (Math.abs(timestamp - lastTimestamp) < 2000) {
        if (id) seenIds.add(id);
        continue;
      }
    }

    if (id) {
      seenIds.add(id);
    }
    recentContent.set(contentKey, timestamp);
    sanitized.push(msg);
  }

  const ordered = sanitized.sort((a, b) => {
    if (typeof a.pageNumber === 'number' && typeof b.pageNumber === 'number') {
      if (a.pageNumber !== b.pageNumber) {
        return a.pageNumber - b.pageNumber;
      }
    }

    if (a.timestamp !== b.timestamp) {
      return a.timestamp - b.timestamp;
    }

    return a.id.localeCompare(b.id);
  });

  return ordered.map((msg, index) => {
    const targetPage = index + 1;
    if (msg.pageNumber === targetPage) {
      return msg;
    }
    return {
      ...msg,
      pageNumber: targetPage,
    };
  });
}
