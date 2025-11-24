import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, AlertCircle, FileCode } from 'lucide-react';
import { cn } from '../utils';
import { Message } from '../types';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  isGenerating: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onSendMessage, isGenerating }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSubmit = () => {
    if (!input.trim() || isGenerating) return;
    onSendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface border-l border-border">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Bot className="w-4 h-4 text-primary" />
        <span className="font-medium text-sm">Aether Assistant</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 && (
             <div className="flex flex-col items-center justify-center h-full text-center text-muted space-y-4 opacity-50">
                <Sparkles className="w-8 h-8 text-primary/50" />
                <p className="text-sm max-w-[200px]">Describe your app idea, and I'll build it for you.</p>
             </div>
        )}
        
        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex gap-3", msg.role === 'user' ? "flex-row-reverse" : "")}>
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-border",
              msg.role === 'assistant' ? "bg-primary/10 text-primary" : "bg-surfaceHighlight text-text"
            )}>
              {msg.role === 'assistant' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>
            
            <div className={cn(
              "max-w-[85%] space-y-2",
              msg.role === 'user' ? "items-end flex flex-col" : ""
            )}>
              <div className={cn(
                "p-3 text-sm leading-relaxed whitespace-pre-wrap rounded-lg",
                msg.role === 'user' 
                    ? "bg-primary text-white rounded-tr-none" 
                    : "bg-surfaceHighlight text-text rounded-tl-none border border-border"
              )}>
                {msg.content}
              </div>

              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="flex flex-col gap-2 w-full">
                    {msg.toolCalls.map(tool => (
                        <div key={tool.id} className="flex items-center justify-between bg-surface border border-border/50 rounded p-2 text-xs animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex items-center gap-2 text-muted">
                                <FileCode className="w-3 h-3" />
                                <span>{tool.name === 'create_file' ? 'Creating' : 'Updating'} <span className="text-text font-medium">{tool.args.path || 'files'}</span>...</span>
                            </div>
                            {tool.status === 'completed' && <span className="text-green-400">Done</span>}
                        </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isGenerating && (
            <div className="flex gap-3">
                 <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-border">
                     <Bot className="w-4 h-4" />
                 </div>
                 <div className="flex items-center gap-1 h-8 bg-surfaceHighlight px-4 rounded-lg rounded-tl-none border border-border">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></div>
                 </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-border bg-surface">
        <div className="relative">
            <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Build a landing page for a coffee shop..."
            className="w-full bg-background border border-border rounded-lg pl-4 pr-12 py-3 text-sm text-text placeholder:text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 resize-none h-[50px] max-h-[120px]"
            disabled={isGenerating}
            />
            <button
                onClick={handleSubmit}
                disabled={!input.trim() || isGenerating}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-primary hover:bg-primary/10 rounded-md disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
            >
                <Send className="w-4 h-4" />
            </button>
        </div>
        <div className="mt-2 flex items-center gap-2 text-[10px] text-muted/60 justify-center">
            <Sparkles className="w-3 h-3" />
            <span>Powered by Gemini 2.5 Flash</span>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;