import { useState, useEffect } from 'react';

interface WindowSize {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

/**
 * Custom hook to track window dimensions and device type
 * @returns WindowSize object with width, height, and boolean flags for device types
 */
export const useWindowSize = (): WindowSize => {
  const [windowSize, setWindowSize] = useState<WindowSize>({
    width: 0,
    height: 0,
    isMobile: false,
    isTablet: false,
    isDesktop: false,
  });

  useEffect(() => {
    // Handler to call on window resize
    const handleResize = () => {
      // Set window dimensions
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // Determine device type based on common breakpoints
      // These can be adjusted based on your design system
      const isMobile = width < 640;      // < 640px: mobile
      const isTablet = width >= 640 && width < 1024; // 640px - 1023px: tablet
      const isDesktop = width >= 1024;   // >= 1024px: desktop
      
      setWindowSize({
        width,
        height,
        isMobile,
        isTablet,
        isDesktop,
      });
    };

    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Call handler right away to set initial state
    handleResize();
    
    // Remove event listener on cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
};