export enum Role {
  User = 'user',
  Model = 'model',
}

export interface Attachment {
  type: 'image';
  data: string; // Base64
  mimeType: string;
}

export interface ChatMessage {
  id: string;
  role: Role;
  text: string;
  isStreaming?: boolean;
  attachment?: Attachment;
  htmlContent?: string; // For site preview
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
}

export interface LibraryItem {
  id: string;
  type: 'pdf' | 'image' | 'site';
  title: string;
  content: string; // Base64 url or HTML content
  date: string;
  author: string;
}

export interface UserState {
  isLoggedIn: boolean;
  name?: string;
  email?: string;
  photoUrl?: string;
}