// Location: src/pages/admin/BlogPostEditPage.tsx

import React, { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom'; // Import hooks
import AdminService from '../../services/AdminService';
import { BlogArticleResponseDto } from '../../dto/Blog/BlogArticleResponseDto'; // For fetching
import { BlogArticleUpdateDto } from '../../dto/Blog/BlogArticleUpdateDto';   // For updating
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

// --- Lexical Imports ---
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListItemNode, ListNode } from '@lexical/list';
import { AutoLinkNode, LinkNode } from '@lexical/link';
// Import custom nodes if you created them (ensure file exists)
// import { ImageNode, VideoNode } from '../../components/lexical/nodes';
// --- HTML Conversion ---
import { $generateHtmlFromNodes } from '@lexical/html';
import { LexicalEditor, EditorState } from 'lexical';
// --- Toolbar & Helper Plugin ---
import ToolbarPlugin from '../../components/lexical/ToolbarPlugin';
import { PopulateContentPlugin } from '../../components/lexical/PopulateContentPlugin'; // Helper to load HTML

// --- Theme, Error Handler (same as Create page) ---
const editorTheme = {
    ltr: 'ltr', rtl: 'rtl', placeholder: 'editor-placeholder', paragraph: 'editor-paragraph',
    quote: 'editor-quote',
    heading: { h1: 'editor-heading-h1', h2: 'editor-heading-h2', h3: 'editor-heading-h3' },
    list: { ol: 'editor-list-ol', ul: 'editor-list-ul', listitem: 'editor-listitem', nested: { listitem: 'editor-nested-listitem' }},
    link: 'editor-link',
    text: { bold: 'editor-text-bold', italic: 'editor-text-italic', underline: 'editor-text-underline', strikethrough: 'editor-text-strikethrough', code: 'editor-text-code' },
    code: 'editor-code',
    // image: 'editor-image', video: 'editor-video', // Add if using custom nodes
};
function editorError(error: Error) { console.error("Lexical editor error:", error); }

// --- Component Start ---
const BlogPostEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>(); // Get ID from route param (ensure route is /edit/:id)
  const navigate = useNavigate();

  // State for form data (use Update DTO, start empty)
  const [formData, setFormData] = useState<BlogArticleUpdateDto>({
      // Initialize with null or undefined to match DTO optionality
      title: null, content: null, excerpt: null, caption: null,
      imageUrl: null, slug: null, isPublished: null
  });
  // State to store the initial HTML content fetched from API
  const [initialContentHtml, setInitialContentHtml] = useState<string | null>(null);
  // State for loading the article data
  const [isLoadingData, setIsLoadingData] = useState(true);
  // State for the update process
  const [isUpdating, setIsUpdating] = useState(false);
  // Separate error/success states
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);

  // Fetch article data on load based on ID
  useEffect(() => {
    if (!id) {
      setFetchError("Article ID is missing from URL."); setIsLoadingData(false); return;
    }
    const fetchArticle = async () => {
      setIsLoadingData(true); setFetchError(null); setInitialContentHtml(null); setFormData({}); // Reset state before fetch
      try {
        console.log(`Workspaceing article ${id} for edit...`);
        const article: BlogArticleResponseDto = await AdminService.getBlogArticleForEdit(id);
        // Populate form state with fetched data
        setFormData({
            title: article.title ?? '',
            // Content is handled separately via initialContentHtml for Lexical
            content: article.content ?? '', // Also store here initially for comparison? Or leave null? Let's store it.
            excerpt: article.excerpt ?? '',
            caption: article.caption ?? '',
            imageUrl: article.imageUrl ?? '',
            slug: article.slug ?? '',
            isPublished: article.isPublished ?? false,
        });
        // Set the initial HTML separately for the plugin
        setInitialContentHtml(article.content);
        console.log("Fetched article for edit:", article.title);
      } catch (err: unknown) {
        let message = 'Failed to load article data.'; if (err instanceof Error) { message = err.message; }
        setFetchError(message);
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchArticle();
  }, [id]); // Re-fetch if ID changes

  // --- Handlers ---
  // Handle changes for standard inputs/checkbox
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    const inputValue = isCheckbox ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: inputValue }));
    setUpdateError(null); setUpdateSuccess(null); // Clear update messages on edit
  };

  // Update formData.content when Lexical changes
  const handleLexicalChange = (editorState: EditorState, editor: LexicalEditor) => {
    editorState.read(() => {
      const htmlString = $generateHtmlFromNodes(editor, null);
      const newContent = htmlString === '<p><br></p>' ? '' : htmlString;
      setFormData(prev => {
          // Only update if different from current state content
          if (prev.content === newContent) return prev;
          return { ...prev, content: newContent };
      });
    });
  };

  // Handle UPDATE submission
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!id) { setUpdateError("Missing Article ID."); return; }
    setIsUpdating(true); setUpdateError(null); setUpdateSuccess(null);

    // Basic validation
    if (!formData.title || !formData.content) {
        setUpdateError("Title and Content cannot be empty."); setIsUpdating(false); return;
    }

    // Prepare DTO - send only fields relevant to update DTO
    const dataToSubmit: BlogArticleUpdateDto = {
        title: formData.title,
        content: formData.content,
        excerpt: formData.excerpt?.trim() || null, // Send null for empty optional fields
        caption: formData.caption?.trim() || null,
        imageUrl: formData.imageUrl?.trim() || null,
        slug: formData.slug?.trim() || null, // Let backend validate/regenerate if needed
        isPublished: formData.isPublished,
    };
    console.log(`Submitting update for article ${id}:`, dataToSubmit);

    try {
        await AdminService.updateBlogArticle(id, dataToSubmit);
        setUpdateSuccess(`Article "${formData.title}" updated successfully!`);
        // Don't clear form on update, keep showing the saved state
        // Optionally navigate back after delay
        setTimeout(() => { navigate('/dashboard'); }, 1500);
    } catch (err: unknown) {
         let message = 'Failed to update article.'; if (err instanceof Error) { message = err.message; }
         setUpdateError(message);
    } finally {
         setIsUpdating(false);
    }
  };

  // --- Lexical Config (Same as Create Page) ---
  const initialConfig = {
    namespace: 'BlogPostEditor', theme: editorTheme, onError: editorError, editable: !isUpdating, // Make editor read-only while updating
    nodes: [ HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, AutoLinkNode, /* ImageNode, VideoNode */ ]
  };

  // --- Placeholder Element (Same as Create Page) ---
   const placeholderElement = ( <div className="editor-placeholder absolute top-[1.125rem] left-3 text-gray-400 pointer-events-none select-none"> Enter blog content... </div> );

  // --- Render Logic ---
  if (isLoadingData) return <div className="text-center p-10">Loading article data...</div>;
  if (fetchError) return <div className="text-center text-red-500 p-10">Error loading article: {fetchError} <Link to="/dashboard" className='block mt-4 text-blue-600 hover:underline'>Back to Dashboard</Link></div>;
  // Render editor only when initialContentHtml is set (even if empty string)
  if (initialContentHtml === null) return <div className="text-center p-10">Initializing editor...</div>;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Link to="/dashboard" className="text-blue-600 hover:underline text-sm mb-4 inline-block">&larr; Back to Dashboard</Link>
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Edit Blog Post</h1>

        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow border">
            {updateError && <p className="text-red-600 bg-red-50 p-3 rounded border border-red-200">{updateError}</p>}
            {updateSuccess && <p className="text-green-600 bg-green-50 p-3 rounded border border-green-200">{updateSuccess}</p>}

            {/* Standard Inputs - Use value from formData state */}
            <Input label="Title" id="title" name="title" value={formData.title ?? ''} onChange={handleChange} required maxLength={200} disabled={isUpdating} />

            {/* --- Lexical Editor Section --- */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                <LexicalComposer initialConfig={initialConfig}>
                    <div className={`editor-container border border-gray-300 rounded-md shadow-sm relative ${isUpdating ? 'bg-gray-100 opacity-50 pointer-events-none' : 'bg-white'}`}>
                        <ToolbarPlugin />
                        <div className="editor-inner relative">
                            <RichTextPlugin
                                contentEditable={<ContentEditable className="editor-input min-h-[250px] p-3 focus:outline-none block relative z-10 bg-transparent" />}
                                placeholder={placeholderElement}
                                ErrorBoundary={LexicalErrorBoundary}
                            />
                            <HistoryPlugin />
                            {!isUpdating && <OnChangePlugin onChange={handleLexicalChange} ignoreSelectionChange={true} />}
                            <ListPlugin />
                            <LinkPlugin />
                            {/* Populate content using the helper plugin */}
                            {/* Pass initialContentHtml to trigger population */}
                            <PopulateContentPlugin initialHtml={initialContentHtml} />
                        </div>
                    </div>
                </LexicalComposer>
            </div>
            {/* End Lexical Editor */}

            {/* Other Inputs - Use value from formData state */}
            <Input label="Excerpt (Optional)" id="excerpt" name="excerpt" value={formData.excerpt ?? ''} onChange={handleChange} maxLength={500} disabled={isUpdating} />
            <Input label="Image URL (Optional)" id="imageUrl" name="imageUrl" type="url" value={formData.imageUrl ?? ''} onChange={handleChange} maxLength={2048} disabled={isUpdating} />
            <Input label="Image Caption (Optional)" id="caption" name="caption" value={formData.caption ?? ''} onChange={handleChange} maxLength={1000} disabled={isUpdating} />
            <Input label="Slug (Optional, leave blank to maybe regenerate from title on update)" id="slug" name="slug" value={formData.slug ?? ''} onChange={handleChange} maxLength={100} disabled={isUpdating} />

             {/* Publish Checkbox - Use value from formData state */}
             <div className="flex items-center space-x-2">
                 <input type="checkbox" id="isPublished" name="isPublished" checked={formData.isPublished ?? false} onChange={handleChange} disabled={isUpdating} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"/>
                 <label htmlFor="isPublished" className="text-sm font-medium text-gray-700">Published</label>
             </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-4 border-t">
                <Button type="submit" variant="primary" disabled={isUpdating}>
                    {isUpdating ? 'Saving...' : 'Update Post'}
                </Button>
            </div>
        </form>
    </div>
  );
};

export default BlogPostEditPage;