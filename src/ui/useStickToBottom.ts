import { useLayoutEffect, useRef } from "react";

export function useStickToBottom<T extends HTMLElement>(deps: any[] = []) {
  const ref = useRef<T | null>(null);
  const pinnedRef = useRef(true);

  const scrollToBottom = () => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  useLayoutEffect(() => {
    const id = requestAnimationFrame(scrollToBottom);
    return () => cancelAnimationFrame(id);
  }, []);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (pinnedRef.current) {
      const id = requestAnimationFrame(scrollToBottom);
      return () => cancelAnimationFrame(id);
    }
  }, deps);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const threshold = 40;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    pinnedRef.current = dist < threshold;
  };

  return { ref, onScroll };
}
