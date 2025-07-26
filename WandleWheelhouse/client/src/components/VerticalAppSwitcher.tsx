// src/components/VerticalAppSwitcher.tsx
import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import './VerticalAppSwitcher.css'; // Ensure this CSS file exists

interface AppItem {
  id: string | number;
  title: string;
  image: string;
}

interface VerticalAppSwitcherProps {
  apps: AppItem[];
  onSwitched?: (newIndex: number) => void;
  onAtStart?: () => void;
  onAtEnd?: () => void;
}

export interface VerticalAppSwitcherRef {
  swipeNext: () => boolean; // Kept for potential programmatic use, though GSAP uses scrollToIndex
  swipePrev: () => boolean; // Kept for potential programmatic use
  isAtStart: () => boolean;
  isAtEnd: () => boolean;
  getCurrentIndex: () => number;
  scrollToIndex: (index: number) => void;
}

const VerticalAppSwitcher = forwardRef<VerticalAppSwitcherRef, VerticalAppSwitcherProps>(
  ({ apps: initialApps, onSwitched, onAtStart, onAtEnd }, ref) => {
    const [apps, setApps] = useState<AppItem[]>(initialApps);
    const [currentIndex, setCurrentIndex] = useState(0);
    // Removed: exitingCardIndex state, as removeCurrentCard via swipe is removed

    // Removed: Refs related to dragging (isDraggingRef, dragStartRef, currentCardDragRef)
    // Removed: wheelCooldownRef as local wheel handling is also removed for GSAP-only control

    useEffect(() => {
      setApps(initialApps);
      setCurrentIndex(0);
    }, [initialApps]);

    useImperativeHandle(ref, () => ({
      swipeNext: () => {
        if (!apps || apps.length === 0 || currentIndex >= apps.length - 1) {
          if (onAtEnd) onAtEnd();
          return false;
        }
        const newIndex = currentIndex + 1;
        setCurrentIndex(newIndex);
        if (onSwitched) onSwitched(newIndex);
        if (newIndex === apps.length - 1 && onAtEnd) onAtEnd();
        return true;
      },
      swipePrev: () => {
        if (!apps || apps.length === 0 || currentIndex <= 0) {
          if (onAtStart) onAtStart();
          return false;
        }
        const newIndex = currentIndex - 1;
        setCurrentIndex(newIndex);
        if (onSwitched) onSwitched(newIndex);
        if (newIndex === 0 && onAtStart) onAtStart();
        return true;
      },
      isAtStart: () => !apps || apps.length === 0 || currentIndex === 0,
      isAtEnd: () => !apps || apps.length === 0 || currentIndex === apps.length - 1,
      getCurrentIndex: () => currentIndex,
      scrollToIndex: (newIndex: number) => {
        if (!apps || apps.length === 0) return;
        const clampedIndex = Math.max(0, Math.min(newIndex, apps.length - 1));
        if (clampedIndex !== currentIndex) {
          setCurrentIndex(clampedIndex);
          if (onSwitched) onSwitched(clampedIndex);
          if (clampedIndex === 0 && onAtStart) onAtStart();
          if (clampedIndex === apps.length - 1 && onAtEnd) onAtEnd();
        }
      },
    }));

    useEffect(() => {
      if (!apps || apps.length === 0) {
        if (onAtStart) onAtStart();
        if (onAtEnd) onAtEnd();
        return;
      }
      if (currentIndex === 0 && onAtStart) onAtStart();
      if (currentIndex === apps.length - 1 && onAtEnd) onAtEnd();
    }, [currentIndex, apps, onAtStart, onAtEnd]);

    // Removed: removeCurrentCard function
    // Removed: handlePointerDown, handlePointerMove, handlePointerUp functions
    // Removed: handleWheelLocal function (GSAP will control scrolling via scrollToIndex)

    if (!apps || apps.length === 0) {
      return <div className="vas-switcher"><p>No items to display.</p></div>;
    }

    return (
      // Removed onWheel from this div, pointer event handlers from vas-card-stack
      <div className="vas-switcher">
        <div className="vas-card-stack">
          {apps.map((app, i) => {
            const offset = i - currentIndex;
            const scale = 1 - Math.abs(offset) * 0.05;
            const yTranslate = offset * 60;
            const zTranslate = -Math.abs(offset) * 50;
            // Opacity logic remains, but no 'exiting' state
            let cardOpacity = '0';
            if (Math.abs(offset) <= 2) cardOpacity = '1';

            const style: React.CSSProperties = {
              transform: `translateY(${yTranslate}px) scale(${scale}) translateZ(${zTranslate}px)`,
              opacity: cardOpacity,
              zIndex: apps.length - Math.abs(offset),
              visibility: cardOpacity === '0' ? 'hidden' : 'visible',
            };

            return (
              // Removed 'exiting' class logic
              <div
                key={app.id || i}
                className="vas-app-card" // No 'exiting' class here
                style={style}
                data-index={i} // data-index can still be useful for debugging
              >
                <img src={app.image} alt={app.title} />
                <div className="vas-app-title">{app.title}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);
VerticalAppSwitcher.displayName = "VerticalAppSwitcher";
export default VerticalAppSwitcher;