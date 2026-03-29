import { useState, useEffect, useRef } from 'react';

/**
 * Manages mount/unmount lifecycle for animated panels.
 * Returns `mounted` (controls DOM presence) and `phase` ('enter' | 'exit').
 * The panel stays in DOM during exit animation, then unmounts.
 */
export function useBoardAnimation(isOpen: boolean, exitDuration = 150) {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<'enter' | 'exit'>('enter');
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      setPhase('enter');
      if (timerRef.current) clearTimeout(timerRef.current);
    } else if (mounted) {
      setPhase('exit');
      timerRef.current = setTimeout(() => setMounted(false), exitDuration);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isOpen]);

  return { mounted, phase };
}
