import { useState, useEffect } from 'react';

/**
 * Hook utilitário para detecção de media queries.
 * @param query Ex: '(max-width: 768px)'
 * @returns boolean indicando se a query coincide
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
}

/**
 * Atalho para detectar se o dispositivo é mobile (smartphone ou tablet pequeno).
 */
export function useIsMobile() {
  return useMediaQuery('(max-width: 768px)');
}
