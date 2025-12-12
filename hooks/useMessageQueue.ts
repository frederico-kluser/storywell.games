import { useMemo } from 'react';
import { ChatMessage } from '../types';

interface UseMessageQueueReturn {
  /** Ordered timeline of chat messages */
  visibleMessages: ChatMessage[];
}

const normalizePage = (value: number | undefined): number | null => {
  if (typeof value !== 'number') {
    return null;
  }
  if (!Number.isFinite(value)) {
    return null;
  }
  return value;
};

const sortMessages = (messages: ChatMessage[]): ChatMessage[] => {
  return [...messages].sort((a, b) => {
    const aPage = normalizePage(a.pageNumber);
    const bPage = normalizePage(b.pageNumber);

    if (aPage !== null || bPage !== null) {
      if (aPage === null) return -1;
      if (bPage === null) return 1;
      if (aPage !== bPage) {
        return aPage - bPage;
      }
    }

    if (a.timestamp !== b.timestamp) {
      return a.timestamp - b.timestamp;
    }

    return a.id.localeCompare(b.id);
  });
};

/**
 * Maintains a stable, ordered list of messages for the story timeline.
 * Unlike the previous queue implementation, this exposes every card immediately
 * so navigation is never blocked by the typewriter animation.
 */
export const useMessageQueue = (allMessages: ChatMessage[]): UseMessageQueueReturn => {
  const visibleMessages = useMemo(() => {
    if (!Array.isArray(allMessages)) {
      return [];
    }

    if (allMessages.length === 0) {
      return [];
    }

    return sortMessages(allMessages);
  }, [allMessages]);

  return {
    visibleMessages,
  };
};
