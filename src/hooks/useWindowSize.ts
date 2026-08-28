import { useState, useEffect } from 'react';

export interface BreakpointConfig {
  /** Upper bound for mobile devices in pixels (default: 640) */
  mobile: number;
  /** Upper bound for tablet devices in pixels (default: 1024) */
  tablet: number;
}

export interface WindowSize {
  /** Current window inner width in pixels */
  width: number;
  /** Current window inner height in pixels */
  height: number;
  /** True if width < mobile breakpoint */
  isMobile: boolean;
  /** True if width >= mobile breakpoint and < tablet breakpoint */
  isTablet: boolean;
  /** True if width >= tablet breakpoint */
  isDesktop: boolean;
}

const DEFAULT_BREAKPOINTS: BreakpointConfig = {
  mobile: 640,
  tablet: 1024,
};

/**
 * Helper to compute window dimensions and responsive device state cleanly.
 */
const calculateWindowSize = (config: BreakpointConfig): WindowSize => {
  const isClient = typeof window !== 'undefined';
  const width = isClient ? window.innerWidth : 0;
  const height = isClient ? window.innerHeight : 0;

  return {
    width,
    height,
    isMobile: width < config.mobile,
    isTablet: width >= config.mobile && width < config.tablet,
    isDesktop: width >= config.tablet,
  };
};

/**
 * Custom hook to track window dimensions and responsive device types.
 *
 * @param customBreakpoints - Optional custom breakpoints to override defaults (640px / 1024px).
 * @returns WindowSize object containing current dimensions and boolean flags.
 */
export const useWindowSize = (customBreakpoints?: Partial<BreakpointConfig>): WindowSize => {
  const mobileThreshold = customBreakpoints?.mobile ?? DEFAULT_BREAKPOINTS.mobile;
  const tabletThreshold = customBreakpoints?.tablet ?? DEFAULT_BREAKPOINTS.tablet;

  const [windowSize, setWindowSize] = useState<WindowSize>(() =>
    calculateWindowSize({ mobile: mobileThreshold, tablet: tabletThreshold })
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let animationFrameId: number | null = null;

    const handleResize = () => {
      // Cancel pending frame to throttle updates to screen refresh rate (~60-120fps)
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }

      animationFrameId = requestAnimationFrame(() => {
        setWindowSize(calculateWindowSize({ mobile: mobileThreshold, tablet: tabletThreshold }));
      });
    };

    // Sync initial state immediately on mount
    handleResize();

    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [mobileThreshold, tabletThreshold]);

  return windowSize;
};