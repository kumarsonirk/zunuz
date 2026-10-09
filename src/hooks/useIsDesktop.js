import { useState, useEffect } from 'react';

const QUERY = '(min-width: 1024px)';

// Matches Tailwind's `lg` breakpoint. Initialized synchronously from
// matchMedia so a desktop load never flashes the mobile layout first.
export default function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const onChange = (e) => setIsDesktop(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isDesktop;
}
