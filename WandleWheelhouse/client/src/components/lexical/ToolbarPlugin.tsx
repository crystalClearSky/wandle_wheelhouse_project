// src/components/lexical/ToolbarPlugin.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
    SELECTION_CHANGE_COMMAND,
    FORMAT_TEXT_COMMAND,
//    LexicalCommand,
    TextFormatType,
} from 'lexical';
import { $getSelection, $isRangeSelection } from 'lexical';
import { mergeRegister } from '@lexical/utils';

// Import icons (optional)
import { FaBold, FaItalic, FaUnderline } from 'react-icons/fa';

const LowPriority = 1; // Define priority for listener

const ToolbarPlugin: React.FC = () => {
    const [editor] = useLexicalComposerContext(); // Get editor instance from context
    const [isBold, setIsBold] = useState(false);
    const [isItalic, setIsItalic] = useState(false);
    const [isUnderline, setIsUnderline] = useState(false);
    // Add state for other formats later (e.g., isLink, blockType)

    // Function to update the toolbar state based on current selection
    const updateToolbar = useCallback(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
            // Check format states for the current selection
            setIsBold(selection.hasFormat('bold'));
            setIsItalic(selection.hasFormat('italic'));
            setIsUnderline(selection.hasFormat('underline'));
            // Update other states later (e.g., block type, link)
        }
    }, []); // No dependencies needed for this callback itself

    // Effect to register listeners and update toolbar on changes
    useEffect(() => {
        // Listen for selection changes and general updates
        // mergeRegister combines the unregister functions returned by each listener
        return mergeRegister(
            // Listener for general editor updates
            editor.registerUpdateListener(({ editorState }) => {
                editorState.read(() => {
                    updateToolbar(); // Check state on any update
                });
            }),
            // Listener specifically for selection changes
            editor.registerCommand(
                SELECTION_CHANGE_COMMAND,
                () => {
                    updateToolbar(); // Check state on selection change
                    return false; // Command not handled here, let others process it
                },
                LowPriority,
            )
        );
    }, [editor, updateToolbar]); // Dependencies: editor instance and the memoized update function


    // Helper function to dispatch text format commands
    const formatText = (format: TextFormatType) => {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
    }

    return (
        // Toolbar Container Styling (Tailwind)
        <div className="flex flex-wrap items-center space-x-1 border-b border-gray-300 p-1 bg-gray-50 rounded-t-md">
            <button
                type="button" // Prevent form submission
                onClick={() => formatText('bold')}
                className={`p-2 rounded hover:bg-gray-200 ${isBold ? 'bg-gray-300' : 'bg-transparent'}`}
                aria-label="Format text as bold"
                title="Bold (Ctrl+B)"
            >
                <FaBold className="w-4 h-4" />
            </button>
            <button
                type="button"
                onClick={() => formatText('italic')}
                className={`p-2 rounded hover:bg-gray-200 ${isItalic ? 'bg-gray-300' : 'bg-transparent'}`}
                aria-label="Format text as italics"
                 title="Italic (Ctrl+I)"
           >
                <FaItalic className="w-4 h-4" />
            </button>
            <button
                type="button"
                onClick={() => formatText('underline')}
                className={`p-2 rounded hover:bg-gray-200 ${isUnderline ? 'bg-gray-300' : 'bg-transparent'}`}
                aria-label="Format text to underlined"
                 title="Underline (Ctrl+U)"
           >
                <FaUnderline className="w-4 h-4" />
            </button>
            {/* Add more buttons here for lists, headings, links etc. later */}
        </div>
    );
};

export default ToolbarPlugin;