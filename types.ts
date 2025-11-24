
export interface ProjectFile {
  name: string;
  content: string;
  language: string;
}

export interface FileSystem {
  [path: string]: ProjectFile;
}

export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  args: any;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  result?: string;
}

export interface ProjectState {
  files: FileSystem;
  selectedFile: string | null;
  messages: Message[];
  isGenerating: boolean;
  previewUrl: string | null;
  logs: LogEntry[];
}

export interface LogEntry {
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  timestamp: number;
}

export type Tab = 'code' | 'preview' | 'chat';
export type DeviceFrame = 'desktop' | 'tablet' | 'mobile';