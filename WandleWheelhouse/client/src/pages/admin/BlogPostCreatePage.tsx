import React, { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AdminService from '../../services/AdminService';
import { BlogArticleCreateDto } from '../../dto/Blog/BlogArticleCreateDto';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

// Lexical Core Imports
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';

// Node Imports
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListItemNode, ListNode } from '@lexical/list';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { ImageNode, VideoNode } from '../../components/lexical/nodes';

// HTML Conversion
import { $generateHtmlFromNodes } from '@lexical/html';
import { LexicalEditor, EditorState } from 'lexical';

// Toolbar
import ToolbarPlugin from '../../components/lexical/ToolbarPlugin';

// Basic Editor Theme
const editorTheme = {
  ltr: 'ltr',
  rtl: 'rtl',
  placeholder: 'editor-placeholder',
  paragraph: 'editor-paragraph',
  quote: 'editor-quote',
  heading: {
    h1: 'editor-heading-h1',
    h2: 'editor-heading-h2',
    h3: 'editor-heading-h3',
  },
  list: {
    ol: 'editor-list-ol',
    ul: 'editor-list-ul',
    listitem: 'editor-listitem',
    nested: { listitem: 'editor-nested-listitem' },
  },
  link: 'editor-link',
  text: {
    bold: 'editor-text-bold',
    italic: 'editor-text-italic',
    underline: 'editor-text-underline',
    strikethrough: 'editor-text-strikethrough',
    code: 'editor-text-code',
  },
  code: 'editor-code',
  image: 'editor-image',
  video: 'editor-video',
};

// Basic onError handler for Lexical
function editorError(error: Error, editor: LexicalEditor) {
  console.error('Lexical editor error:', error, editor);
}

// Component Start
const BlogPostCreatePage: React.FC = () => {
  const navigate = useNavigate();

  // State for form data
  const [formData, setFormData] = useState<BlogArticleCreateDto>({
    title: '',
    content: '',
    excerpt: '',
    caption: '',
    imageUrl: '',
    slug: '',
    isPublished: false,
  });

  // Component State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Handlers
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    const inputValue = isCheckbox ? (e.target as HTMLInputElement).checked : value;
    setFormData((prev) => ({ ...prev, [name]: inputValue }));
    setError(null);
    setSuccess(null);
  };

  // Handles changes from the Lexical editor
  const handleLexicalChange = (editorState: EditorState, editor: LexicalEditor) => {
    editorState.read(() => {
      const htmlString = $generateHtmlFromNodes(editor, null);
      const newContent = htmlString === '<p><br></p>' ? '' : htmlString;
      setFormData((prev) => (prev.content === newContent ? prev : { ...prev, content: newContent }));
    });
  };

  // Handles form submission
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    if (!formData.title || !formData.content) {
      setError('Title and Content are required.');
      setIsLoading(false);
      return;
    }
    // Prepare DTO for API
    const dataToSubmit: BlogArticleCreateDto = {
      title: formData.title,
      content: formData.content,
      isPublished: formData.isPublished,
      slug: formData.slug?.trim() || undefined,
      excerpt: formData.excerpt?.trim() || undefined,
      caption: formData.caption?.trim() || undefined,
      imageUrl: formData.imageUrl?.trim() || undefined,
    };
    console.log('Submitting blog data:', dataToSubmit);
    try {
      const createdArticle = await AdminService.createBlogArticle(dataToSubmit);
      setSuccess(`Article "${createdArticle.title}" created successfully! Redirecting...`);
      setFormData({ title: '', content: '', excerpt: '', caption: '', imageUrl: '', slug: '', isPublished: false });
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err: unknown) {
      let message = 'Failed to create article.';
      if (err instanceof Error) {
        message = err.message;
      }
      setError(message);
      setIsLoading(false);
    }
  };

  // Lexical Initial Configuration
  const initialConfig = {
    namespace: 'BlogPostEditor',
    theme: editorTheme,
    onError: editorError,
    nodes: [
      HeadingNode,
      QuoteNode,
      ListNode,
      ListItemNode,
      LinkNode,
      AutoLinkNode,
      ImageNode,
      VideoNode,
    ],
  };

  // Placeholder Element for Editor
  const placeholderElement = (
    <div className="editor-placeholder absolute top-[1.125rem] left-3 text-gray-400 pointer-events-none select-none">
      Enter blog content...
    </div>
  );

  // JSX Return
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Link to="/dashboard" className="text-blue-600 hover:underline text-sm mb-4 inline-block">
        ← Back to Dashboard
      </Link>
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Create New Blog Post</h1>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow border">
        {error && <p className="text-red-600 bg-red-50 p-3 rounded border border-red-200">{error}</p>}
        {success && <p className="text-green-600 bg-green-50 p-3 rounded border border-green-200">{success}</p>}

        {/* Standard Inputs */}
        <Input
          label="Title"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
          maxLength={200}
          disabled={isLoading}
        />

        {/* Lexical Editor Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
          <LexicalComposer initialConfig={initialConfig}>
            <div
              className={`editor-container border border-gray-300 rounded-md shadow-sm relative ${
                isLoading ? 'bg-gray-100 opacity-50 pointer-events-none' : 'bg-white'
              }`}
            >
              <ToolbarPlugin />
              <div className="editor-inner relative">
                <RichTextPlugin
                  contentEditable={
                    <ContentEditable className="editor-input min-h-[250px] p-3 focus:outline-none block relative z-10 bg-transparent" />
                  }
                  placeholder={placeholderElement}
                  ErrorBoundary={LexicalErrorBoundary}
                />
                <HistoryPlugin />
                {!isLoading && <OnChangePlugin onChange={handleLexicalChange} ignoreSelectionChange={true} />}
                <ListPlugin />
                <LinkPlugin />
              </div>
            </div>
          </LexicalComposer>
        </div>

        {/* Other Optional Inputs */}
        <Input
          label="Excerpt (Optional, for summaries)"
          id="excerpt"
          name="excerpt"
          value={formData.excerpt ?? ''}
          onChange={handleChange}
          maxLength={500}
          disabled={isLoading}
        />
        <Input
          label="Image URL (Optional)"
          id="imageUrl"
          name="imageUrl"
          type="url"
          value={formData.imageUrl ?? ''}
          onChange={handleChange}
          maxLength={2048}
          disabled={isLoading}
          placeholder="https://..."
        />
        <Input
          label="Image Caption (Optional)"
          id="caption"
          name="caption"
          value={formData.caption ?? ''}
          onChange={handleChange}
          maxLength={1000}
          disabled={isLoading}
        />
        <Input
          label="Slug (Optional, auto-generated if blank)"
          id="slug"
          name="slug"
          value={formData.slug ?? ''}
          onChange={handleChange}
          maxLength={100}
          disabled={isLoading}
          placeholder="e.g., my-cool-post-slug"
        />

        {/* Publish Checkbox */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="isPublished"
            name="isPublished"
            checked={formData.isPublished}
            onChange={handleChange}
            disabled={isLoading}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="isPublished" className="text-sm font-medium text-gray-700">
            Publish Immediately?
          </label>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create Post'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default BlogPostCreatePage;