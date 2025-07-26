// src/components/NewAppSwitcher.tsx
import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import './NewAppSwitcher.css'; // Import the new CSS

interface CardItem {
  id: string | number;
  title: string;
  content: string;
  footer: string;
}

interface NewAppSwitcherProps {
  items: CardItem[];
  // onSwitched, onAtStart, onAtEnd can be kept if GSAP callbacks need to trigger them
  onSwitched?: (newIndex: number) => void;
  onAtStart?: () => void;
  onAtEnd?: () => void;
}

export interface NewAppSwitcherRef {
  scrollToIndex: (index: number) => void;
  getCurrentIndex: () => number; // Might be useful for GSAP to query
}

const NewAppSwitcher = forwardRef<NewAppSwitcherRef, NewAppSwitcherProps>(
  ({ items, onSwitched, onAtStart, onAtEnd }, ref) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
      // Reset if items change, though typically items list would be stable for one instance
      setCurrentIndex(0);
    }, [items]);

    useImperativeHandle(ref, () => ({
      scrollToIndex: (newIndex: number) => {
        if (!items || items.length === 0) return;
        const clampedIndex = Math.max(0, Math.min(newIndex, items.length - 1));
        if (clampedIndex !== currentIndex) {
          setCurrentIndex(clampedIndex);
          if (onSwitched) onSwitched(clampedIndex);
          if (clampedIndex === 0 && onAtStart) onAtStart();
          if (clampedIndex === items.length - 1 && onAtEnd) onAtEnd();
        }
      },
      getCurrentIndex: () => currentIndex,
    }));

    // Effect for atStart/atEnd callbacks based on currentIndex changes
    useEffect(() => {
      if (!items || items.length === 0) {
        if (onAtStart) onAtStart();
        if (onAtEnd) onAtEnd();
        return;
      }
      if (currentIndex === 0 && onAtStart) onAtStart();
      if (currentIndex === items.length - 1 && onAtEnd) onAtEnd();
    }, [currentIndex, items, onAtStart, onAtEnd]);


    const getCardStyle = (index: number): React.CSSProperties => {
      const offset = index - currentIndex;
      let transform = "scale(0.8)";
      let zIndex = 0;
      let opacity = 0;

      if (offset === 0) { // Active card
        transform = "translateY(0px) scale(1) rotateX(0deg)";
        zIndex = 3;
        opacity = 1;
      } else if (offset === -1) { // One card above
        transform = "translateY(-50px) scale(0.92) rotateX(8deg)";
        zIndex = 2;
        opacity = 0.7;
      } else if (offset === 1) { // One card below
        transform = "translateY(50px) scale(0.92) rotateX(-8deg)";
        zIndex = 2; // Changed from 1 to match above for symmetry, can be 1
        opacity = 0.7;
      } else if (offset === -2) { // Two above (faded)
        transform = "translateY(-100px) scale(0.85) rotateX(15deg)";
        zIndex = 1;
        opacity = 0.4;
      } else if (offset === 2) { // Two below (faded)
        transform = "translateY(100px) scale(0.85) rotateX(-15deg)";
        zIndex = 1; // Changed from 0 to match above for symmetry, can be 0
        opacity = 0.4;
      }
      // Cards further than 2 away will have opacity: 0, zIndex: 0, transform: "scale(0.8)"

      return { transform, opacity, zIndex };
    };

    if (!items || items.length === 0) {
      return <div className="nas-container-wrapper"><p>No items to display.</p></div>;
    }

    return (
      <div className="nas-container-wrapper">
        <div className="nas-card-container">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="nas-card"
              style={getCardStyle(index)}
            >
              <div className="nas-card-title">{item.title}</div>
              <div className="nas-card-content">{item.content}</div>
              <div className="nas-card-footer">{item.footer}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }
);

NewAppSwitcher.displayName = "NewAppSwitcher";
export default NewAppSwitcher;