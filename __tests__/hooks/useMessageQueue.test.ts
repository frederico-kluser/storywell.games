import { renderHook } from '@testing-library/react';
import { useMessageQueue } from '../../hooks/useMessageQueue';
import { ChatMessage, MessageType } from '../../types';

const createMessage = (
  id: string,
  pageNumber: number,
  timestamp: number = Date.now(),
): ChatMessage => ({
  id,
  senderId: 'test',
  text: id,
  type: MessageType.NARRATION,
  timestamp,
  pageNumber,
});

describe('useMessageQueue', () => {
  it('returns an empty array when no messages are provided', () => {
    const { result } = renderHook(() => useMessageQueue([]));
    expect(result.current.visibleMessages).toEqual([]);
  });

  it('orders messages by page number', () => {
    const unordered = [
      createMessage('msg-3', 3),
      createMessage('msg-1', 1),
      createMessage('msg-2', 2),
    ];

    const { result } = renderHook(() => useMessageQueue(unordered));

    expect(result.current.visibleMessages.map((m) => m.id)).toEqual(['msg-1', 'msg-2', 'msg-3']);
  });

  it('falls back to timestamp ordering when page numbers collide', () => {
    const first = createMessage('first', 1, 1000);
    const second = createMessage('second', 1, 2000);

    const { result } = renderHook(() => useMessageQueue([second, first]));

    expect(result.current.visibleMessages.map((m) => m.id)).toEqual(['first', 'second']);
  });

  it('re-sorts when the message array changes', () => {
    const messageA = createMessage('msg-1', 1);
    const messageB = createMessage('msg-2', 2);

    const { result, rerender } = renderHook(
      ({ messages }) => useMessageQueue(messages),
      { initialProps: { messages: [messageB] } },
    );

    expect(result.current.visibleMessages.map((m) => m.id)).toEqual(['msg-2']);

    rerender({ messages: [messageB, messageA] });

    expect(result.current.visibleMessages.map((m) => m.id)).toEqual(['msg-1', 'msg-2']);
  });
});
