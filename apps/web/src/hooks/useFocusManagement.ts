import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook to manage focus for accessibility
 * - Moves focus to main content on route change
 * - Prevents focus trap issues
 * - Supports skip links
 */
export function useFocusManagement() {
  const location = useLocation();
  const mainContentRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Find main content element
    mainContentRef.current = document.getElementById('main-content') as HTMLElement;
    
    // On route change, move focus to main content (but don't scroll)
    // This helps screen reader users understand the page has changed
    if (mainContentRef.current) {
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        if (mainContentRef.current) {
          mainContentRef.current.focus({ preventScroll: true });
        }
      }, 100);
    }
  }, [location.pathname]);

  return mainContentRef;
}

/**
 * Hook to handle keyboard navigation
 */
export function useKeyboardNavigation() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC key to close modals/dropdowns
      if (e.key === 'Escape') {
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement && activeElement.blur) {
          activeElement.blur();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}

