import React, { useEffect, useRef } from 'react';
import { cn } from '../utils';

interface CodeEditorProps {
  filename: string | null;
  content: string;
  language: string;
  onChange: (newContent: string) => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ filename, content, language, onChange }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  if (!filename) {
    return (
      <div className="h-full flex items-center justify-center bg-background text-muted select-none">
        <div className="text-center">
            <div className="w-16 h-16 bg-surfaceHighlight rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
            </div>
            <p>Select a file to view content</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background font-mono text-sm relative group">
      <div className="flex items-center justify-between px-4 py-2 bg-surface border-b border-border">
        <span className="text-muted text-xs">{filename}</span>
        <span className="text-xs text-muted/50 uppercase">{language}</span>
      </div>
      
      <div className="flex-1 relative overflow-hidden">
        {/* Line Numbers (Visual only for simplicity in this demo) */}
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-surface border-r border-border text-muted/30 text-right pr-3 py-4 select-none pointer-events-none font-mono text-sm leading-6">
            {Array.from({ length: 50 }).map((_, i) => (
                <div key={i}>{i + 1}</div>
            ))}
        </div>

        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          className={cn(
            "absolute inset-0 w-full h-full bg-transparent text-text resize-none outline-none p-4 pl-16 leading-6 font-mono custom-editor-scroll",
            "selection:bg-primary/30"
          )}
          style={{ tabSize: 2 }}
        />
      </div>
    </div>
  );
};

export default CodeEditor;