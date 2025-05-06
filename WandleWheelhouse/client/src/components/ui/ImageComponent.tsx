// src/components/lexical/ui/ImageComponent.tsx
import React from 'react';
import type { NodeKey } from 'lexical';

interface ImageComponentProps {
  src: string;
  altText: string;
  width?: 'inherit' | number | 'auto'; // Lexical passes 'inherit', use string
  height?: 'inherit' | number | 'auto';
  nodeKey: NodeKey; // Key of the associated Lexical node
}

const ImageComponent: React.FC<ImageComponentProps> = ({
  src, altText, width, height, nodeKey
}) => {
  // Basic image rendering - add selection/resizing logic later if needed
  return (
     // Use a simple div wrapper if needed for styling/selection later
     // Apply Tailwind classes for responsive images if possible
     <img
         src={src}
         alt={altText}
         width={width === 'inherit' || width === 'auto' ? undefined : width} // Only set if specific number
         height={height === 'inherit' || height === 'auto' ? undefined : height}
         className="max-w-full h-auto block my-2" // Basic styling
         data-lexical-key={nodeKey} // Important for Lexical to track
     />
  );
};

export default ImageComponent;