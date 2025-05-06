import { DecoratorNode, NodeKey, SerializedLexicalNode } from 'lexical';

// Interface for serialized image node
interface SerializedImageNode extends SerializedLexicalNode {
  type: 'image';
  src: string;
  alt: string;
  version: 1;
}

// Interface for serialized video node
interface SerializedVideoNode extends SerializedLexicalNode {
  type: 'video';
  src: string;
  version: 1;
}

// Custom ImageNode
export class ImageNode extends DecoratorNode<HTMLElement> {
  private __src: string;
  private __alt: string;

  constructor(src: string, alt: string, key?: NodeKey) {
    super(key);
    this.__src = src;
    this.__alt = alt;
  }

  static getType(): string {
    return 'image';
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(node.__src, node.__alt, node.__key);
  }

  createDOM(): HTMLElement {
    const img = document.createElement('img');
    img.src = this.__src;
    img.alt = this.__alt;
    img.className = 'editor-image max-w-full h-auto';
    return img;
  }

  updateDOM(prevNode: ImageNode, dom: HTMLElement): boolean {
    const img = dom as HTMLImageElement;
    if (prevNode.__src !== this.__src) img.src = this.__src;
    if (prevNode.__alt !== this.__alt) img.alt = this.__alt;
    return false;
  }

  exportJSON(): SerializedImageNode {
    return {
      type: 'image',
      src: this.__src,
      alt: this.__alt,
      version: 1,
    };
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    return new ImageNode(serializedNode.src, serializedNode.alt);
  }

  isInline(): boolean {
    return true;
  }

  decorate(): HTMLElement {
    return this.createDOM();
  }
}

// Custom VideoNode
export class VideoNode extends DecoratorNode<HTMLElement> {
  private __src: string;

  constructor(src: string, key?: NodeKey) {
    super(key);
    this.__src = src;
  }

  static getType(): string {
    return 'video';
  }

  static clone(node: VideoNode): VideoNode {
    return new VideoNode(node.__src, node.__key);
  }

  createDOM(): HTMLElement {
    const isYouTube = this.__src.includes('youtube.com') || this.__src.includes('youtu.be');
    if (isYouTube) {
      const iframe = document.createElement('iframe');
      const videoId = this.__src.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/)?.[1];
      iframe.src = videoId ? `https://www.youtube.com/embed/${videoId}` : '';
      iframe.className = 'editor-video w-full h-64';
      iframe.allowFullscreen = true;
      return iframe;
    }
    const video = document.createElement('video');
    video.src = this.__src;
    video.controls = true;
    video.className = 'editor-video w-full h-auto';
    return video;
  }

  updateDOM(prevNode: VideoNode, dom: HTMLElement): boolean {
    if (prevNode.__src !== this.__src) {
      const isYouTube = this.__src.includes('youtube.com') || this.__src.includes('youtu.be');
      if (isYouTube) {
        const videoId = this.__src.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/)?.[1];
        (dom as HTMLIFrameElement).src = videoId ? `https://www.youtube.com/embed/${videoId}` : '';
      } else {
        (dom as HTMLVideoElement).src = this.__src;
      }
    }
    return false;
  }

  exportJSON(): SerializedVideoNode {
    return {
      type: 'video',
      src: this.__src,
      version: 1,
    };
  }

  static importJSON(serializedNode: SerializedVideoNode): VideoNode {
    return new VideoNode(serializedNode.src);
  }

  isInline(): boolean {
    return false;
  }

  decorate(): HTMLElement {
    return this.createDOM();
  }
}