// src/components/lexical/PopulateContentPlugin.tsx
import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $generateNodesFromDOM } from '@lexical/html';
import { $getRoot, $insertNodes } from 'lexical';

interface PopulateContentPluginProps {
    initialHtml: string | null | undefined;
}

// Simple plugin to set initial editor content from an HTML string
export const PopulateContentPlugin: React.FC<PopulateContentPluginProps> = ({ initialHtml }) => {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        // Run only once when initialHtml is first available and editor is ready
        if (initialHtml && editor) {
            editor.update(() => {
                try {
                    const parser = new DOMParser();
                    const dom = parser.parseFromString(initialHtml, 'text/html');
                    const nodes = $generateNodesFromDOM(editor, dom); // Convert HTML DOM to Lexical Nodes

                    const root = $getRoot();
                    root.clear(); // Clear any existing content
                    root.select(); // Select root for insertion
                    $insertNodes(nodes); // Insert the parsed nodes
                    console.log("Lexical editor populated with initial HTML.");
                } catch (error) {
                    console.error("Error populating Lexical editor from HTML:", error);
                    // Optionally set fallback content
                    // const paragraph = $createParagraphNode();
                    // paragraph.append($createTextNode("Error loading content."));
                    // $getRoot().clear().append(paragraph);
                }
            });
        }
        // We want this effect to run *only* when the editor is ready and initialHtml is first provided,
        // NOT necessarily if initialHtml changes later (to prevent overwriting user edits).
        // Using editor.isReady() or other flags might be needed for complex cases, but this is simpler.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editor, initialHtml]); // Run when editor instance or initialHtml is ready/changes

    return null; // This plugin doesn't render anything itself
};