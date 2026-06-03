import { useEffect, useRef } from 'react';
import type { RefObject, DependencyList } from 'react';

export function useAutoScroll<T extends HTMLElement>(
  dependencies: DependencyList = []
): RefObject<T | null> {
  const containerRef = useRef<T>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return containerRef;
}
