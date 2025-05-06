import React, { useCallback, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  FORMAT_TEXT_COMMAND,
  $getSelection,
  $isRangeSelection,
  
} from 'lexical';
import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import {  $createHeadingNode } from '@lexical/rich-text';
import { INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND } from '@lexical/list';
import { $createQuoteNode } from '@lexical/rich-text';
import { $wrapNodes } from '@lexical/selection';

// Icons (using Heroicons for simplicity, assuming they are available in the project)
import {
  LinkIcon,
  ListBulletIcon,
  NumberedListIcon,
  ChatBubbleLeftIcon,
} from '@heroicons/react/24/outline';

const ToolbarPlugin: React.FC = () => {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isLink, setIsLink] = useState(false);

  // Update toolbar state based on selection
  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
      setIsStrikethrough(selection.hasFormat('strikethrough'));

      // Check if selection is within a link
      const node = selection.getNodes()[0];
      const parent = node.getParent();
      setIsLink($isLinkNode(node) || $isLinkNode(parent));
    }
  }, [editor]);

  editor.registerUpdateListener(({ editorState }) => {
    editorState.read(() => {
      updateToolbar();
    });
  });

  // Text formatting handlers
  const formatBold = () => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
  };

  const formatItalic = () => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
  };

  const formatUnderline = () => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
  };

  const formatStrikethrough = () => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough');
  };

  // Heading handler
  const formatHeading = (headingType: 'h1' | 'h2' | 'h3') => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $wrapNodes(selection, () => $createHeadingNode(headingType));
      }
    });
  };

  // List handlers
  const formatOrderedList = () => {
    editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
  };

  const formatUnorderedList = () => {
    editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
  };

  // Quote handler
  const formatQuote = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $wrapNodes(selection, () => $createQuoteNode());
      }
    });
  };

  // Link handler
  const formatLink = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const node = selection.getNodes()[0];
        const parent = node.getParent();
        if ($isLinkNode(node) || $isLinkNode(parent)) {
          editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
        } else {
          // Prompt for URL (simplified for demo; in production, use a modal)
          const url = prompt('Enter the URL');
          if (url) {
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
          }
        }
      }
    });
  };

  return (
    <div className="toolbar flex flex-wrap gap-2 p-2 border-b border-gray-200 bg-gray-50 rounded-t-md">
      <button
        type="button"
        onClick={formatBold}
        className={`p-1 rounded ${isBold ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-200'}`}
        title="Bold"
      >
        <span className="font-bold">B</span>
      </button>
      <button
        type="button"
        onClick={formatItalic}
        className={`p-1 rounded ${isItalic ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-200'}`}
        title="Italic"
      >
        <span className="italic">I</span>
      </button>
      <button
        type="button"
        onClick={formatUnderline}
        className={`p-1 rounded ${isUnderline ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-200'}`}
        title="Underline"
      >
        <span className="underline">U</span>
      </button>
      <button
        type="button"
        onClick={formatStrikethrough}
        className={`p-1 rounded ${isStrikethrough ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-200'}`}
        title="Strikethrough"
      >
        <span className="line-through">S</span>
      </button>
      <button
        type="button"
        onClick={() => formatHeading('h1')}
        className="p-1 rounded text-gray-600 hover:bg-gray-200"
        title="Heading 1"
      >
        H1
      </button>
      <button
        type="button"
        onClick={() => formatHeading('h2')}
        className="p-1 rounded text-gray-600 hover:bg-gray-200"
        title="Heading 2"
      >
        H2
      </button>
      <button
        type="button"
        onClick={() => formatHeading('h3')}
        className="p-1 rounded text-gray-600 hover:bg-gray-200"
        title="Heading 3"
      >
        H3
      </button>
      <button
        type="button"
        onClick={formatOrderedList}
        className="p-1 rounded text-gray-600 hover:bg-gray-200"
        title="Ordered List"
      >
        <NumberedListIcon className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={formatUnorderedList}
        className="p-1 rounded text-gray-600 hover:bg-gray-200"
        title="Unordered List"
      >
        <ListBulletIcon className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={formatQuote}
        className="p-1 rounded text-gray-600 hover:bg-gray-200"
        title="Quote"
      >
        <ChatBubbleLeftIcon className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={formatLink}
        className={`p-1 rounded ${isLink ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-200'}`}
        title="Link"
      >
        <LinkIcon className="h-5 w-5" />
      </button>
    </div>
  );
};

export default ToolbarPlugin;