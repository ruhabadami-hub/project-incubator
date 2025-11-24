
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { cn, generateId, INITIAL_FILES, buildPreviewContent, getLanguageFromFilename } from './utils';
import { FileSystem, Message, DeviceFrame, Tab, ProjectFile } from './types';

import FileExplorer from './components/FileExplorer';
import CodeEditor from './components/CodeEditor';
import Preview from './components/Preview';
import ChatInterface from './components/ChatInterface';
import { Code2, Play, MessageSquare, Activity, Menu, X } from 'lucide-react';

// --- EDUSPARK SYSTEM INSTRUCTIONS ---
const SYSTEM_INSTRUCTION = `
You are Aether, the Principal AI Architect for "EduSpark".
Your mission is to build robust, educational browser games within the strict "Golden Shell" architecture.

### 🧠 MEMORY PROTOCOL (CRITICAL)
**You are STATELESS.** You have NO persistent memory between turns.
- You **MUST** call the \`update_project_state\` tool at the end of *every* response.
- If you do not save your state, you will forget the project structure and the user's goals in the next turn.
- Save a summary of what you just built, the current task status, and exactly what needs to happen next.

### 🛑 TECHNICAL CONSTRAINTS
1.  **NO CODE IN CHAT:** Use \`create_file\` for ALL code. Chat is for explanation only.
2.  **NO JSX / NO BUILD:** The environment is a raw browser.
    -   **FORBIDDEN:** \`return <div>...</div>\`
    -   **REQUIRED:** \`import htm from 'https://esm.sh/htm'; const html = htm.bind(h); return html\`<div>...</div>\`\`
    -   **REQUIRED:** Use ES Modules with explicit \`.js\` extensions (e.g., \`import App from './App.js'\`).
3.  **GOLDEN SHELL:**
    -   **READ-ONLY:** \`index.html\` is immutable. DO NOT try to edit it.
    -   **ENTRY POINT:** Create \`src/main.js\`.
    -   **MOUNTING:** \`render(h(App), document.getElementById('game-stage'));\`
4.  **RESOLUTION & INPUT:**
    -   Design logic for a fixed **800x600** coordinate system. The shell handles CSS scaling.
    -   Use **Pointer Events** (\`pointerdown\`, \`pointerup\`) for mobile/desktop compatibility.

### 🏗️ ROBUSTNESS & STANDARDS
1.  **MANDATORY_RESIZE_OBSERVER:** The DOM is async. Use a \`ResizeObserver\` on the container before starting 3D renderers (Three.js/Pixi) to prevent blank screens.
2.  **PREDICTIVE_COLLISION:** In game loops, calculate \`nextPosition\` and check collisions *before* applying movement to prevent clipping.
3.  **BRIDGE API:** When the game ends (win/loss), you MUST call:
    \`window.gameAPI.submitFinalScore({ score: { raw: number, max: number }, answers: [] });\`
4.  **VISIBILITY_GUARANTEE (ANTI-BLACK-SCREEN):**
    -   **CSS INJECTION:** In \`src/main.js\`, you MUST inject a \`<style>\` block forcing \`html, body, #game-stage { width: 100%; height: 100%; overflow: hidden; }\` to prevent zero-height container collapse.
    -   **SAFE MATERIALS:** In the first turn, use \`MeshStandardMaterial\` or \`MeshBasicMaterial\`. DO NOT use raw \`ShaderMaterial\` (GLSL) initially, as it risks compilation errors that crash the render loop.
    -   **FLOOD LIGHTING:** Always add a high-intensity \`AmbientLight\` (0.7+) alongside directional lights to ensure the scene is visible even if shadow calculations fail.

### 🎨 ASSETS
- No external image files. Use placeholders: \`[IMAGE: a red car]\` or procedural generation (Canvas/CSS).

### 🚀 WORKFLOW
1.  **PLAN:** Briefly acknowledge the request.
2.  **BUILD:** Call \`create_file\` for all necessary logic.
3.  **PERSIST:** Call \`update_project_state\` to save your context.
`;

// --- TOOL DEFINITIONS ---
const tools = [{
  functionDeclarations: [
    {
      name: "create_file",
      description: "Create or Overwrite a file. Note: 'index.html' is READ-ONLY and cannot be modified.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          path: { type: Type.STRING, description: "Relative path (e.g., 'src/main.js'). MUST include extension." },
          content: { type: Type.STRING, description: "FULL file content. JS only (no JSX)." },
        },
        required: ["path", "content"],
      },
    },
    {
      name: "read_file",
      description: "Read the content of an existing file.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          path: { type: Type.STRING, description: "The path of the file to read." },
        },
        required: ["path"],
      },
    },
    {
      name: "list_files",
      description: "List all files in the project structure.",
      parameters: {
        type: Type.OBJECT,
        properties: {},
      },
    },
    {
      name: "update_project_state",
      description: "CRITICAL: Save the current project context. Must be called at the end of every turn.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING, description: "High-level summary of the project status." },
          current_task: { type: Type.STRING, description: "What was just completed." },
          next_steps: { type: Type.STRING, description: "What needs to be done in the next turn." },
        },
        required: ["summary", "current_task", "next_steps"],
      },
    },
  ]
}];

function App() {
  // State
  const [files, setFiles] = useState<FileSystem>(INITIAL_FILES);
  const [selectedFile, setSelectedFile] = useState<string | null>('index.html');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [device, setDevice] = useState<DeviceFrame>('desktop');
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [isMobileExplorerOpen, setIsMobileExplorerOpen] = useState(false);

  // Refs
  const filesRef = useRef(files);
  const chatSessionRef = useRef<any>(null);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    if (!process.env.API_KEY) {
        console.error("API_KEY is missing!");
        setMessages(prev => [...prev, {
            id: generateId(),
            role: 'system',
            content: "Error: API_KEY is missing in environment variables.",
            timestamp: Date.now()
        }]);
        return;
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    chatSessionRef.current = ai.chats.create({
      model: 'gemini-3-pro-preview',
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: tools,
        thinkingConfig: { thinkingBudget: 8192 },
      },
    });
  }, []);

  // Derived State
  const previewContent = buildPreviewContent(files);

  // --- Tool Execution Logic ---
  const executeTool = async (name: string, args: any) => {
    try {
      if (name === 'create_file') {
        const { path, content } = args;
        if (path === 'index.html') {
            return "Error: index.html is READ-ONLY. You cannot modify the Golden Shell.";
        }
        setFiles(prev => ({
          ...prev,
          [path]: {
            name: path,
            content,
            language: getLanguageFromFilename(path)
          }
        }));
        setSelectedFile(path);
        return `File '${path}' created successfully.`;
      } 
      
      if (name === 'read_file') {
        const { path } = args;
        const file = filesRef.current[path];
        if (!file) throw new Error(`File '${path}' not found.`);
        return file.content;
      }

      if (name === 'list_files') {
        return JSON.stringify(Object.keys(filesRef.current));
      }

      if (name === 'update_project_state') {
          const { summary, current_task, next_steps } = args;
          console.log("📝 [Aether Memory Saved]", { summary, current_task, next_steps });
          // In a real app, this would save to a database. 
          // Here we just confirm to the agent that the state is persisted.
          return "Project state saved successfully. Context persisted for next turn.";
      }

      return `Error: Unknown tool '${name}'`;
    } catch (error: any) {
      return `Error executing tool '${name}': ${error.message}`;
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!chatSessionRef.current) return;

    const userMsg: Message = {
      id: generateId(),
      role: 'user',
      content: text,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setIsGenerating(true);

    try {
      let response = await chatSessionRef.current.sendMessage({ message: text });
      
      let loopCount = 0;
      const MAX_LOOPS = 15;

      // Loop for handling tool calls
      while (response.functionCalls && response.functionCalls.length > 0 && loopCount < MAX_LOOPS) {
        loopCount++;
        const calls = response.functionCalls;
        
        const toolMsgId = generateId();
        const toolMsg: Message = {
            id: toolMsgId,
            role: 'assistant',
            content: '',
            timestamp: Date.now(),
            toolCalls: calls.map(c => ({
                id: c.id || generateId(),
                name: c.name,
                args: c.args,
                status: 'executing'
            }))
        };
        setMessages(prev => [...prev, toolMsg]);

        const toolResponses = [];
        for (const call of calls) {
            const result = await executeTool(call.name, call.args);
            toolResponses.push({
                name: call.name,
                response: { result: result },
                id: call.id 
            });
        }

        setMessages(prev => prev.map(m => 
            m.id === toolMsgId ? { 
                ...m, 
                toolCalls: m.toolCalls?.map((t, i) => ({
                    ...t, 
                    status: 'completed', 
                    result: toolResponses[i].response.result 
                })) 
            } : m
        ));

        response = await chatSessionRef.current.sendMessage({
            message: toolResponses.map(tr => ({
                functionResponse: {
                    name: tr.name,
                    response: tr.response,
                    id: tr.id
                }
            }))
        });
      }

      // Extract text response safely
      const candidates = response.candidates;
      let replyText = '';
      
      if (candidates && candidates.length > 0) {
          const content = candidates[0].content;
          if (content && content.parts) {
              for (const part of content.parts) {
                  if (part.text) {
                      replyText += part.text;
                  }
              }
          }
      }

      if (replyText) {
          setMessages(prev => [...prev, {
              id: generateId(),
              role: 'assistant',
              content: replyText,
              timestamp: Date.now()
          }]);
      }

    } catch (error: any) {
      console.error("Generation error:", error);
      setMessages(prev => [...prev, {
          id: generateId(),
          role: 'system',
          content: `Error: ${error.message || "Something went wrong."}`,
          timestamp: Date.now()
      }]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileChange = (newContent: string) => {
    if (selectedFile && selectedFile !== 'index.html') {
      setFiles(prev => ({
        ...prev,
        [selectedFile]: {
          ...prev[selectedFile],
          content: newContent
        }
      }));
    }
  };

  const handleFileSelect = (filename: string) => {
    setSelectedFile(filename);
    setIsMobileExplorerOpen(false);
  };

  return (
    <div className="h-screen w-screen flex flex-col md:flex-row bg-background text-text overflow-hidden">
      
      <nav className="hidden md:flex w-16 bg-surface border-r border-border flex-col items-center py-4 z-20">
        <div className="mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Activity className="w-6 h-6 text-white" />
            </div>
        </div>

        <div className="flex flex-col gap-4 w-full px-2">
            <button 
                onClick={() => setActiveTab('chat')}
                className={cn(
                    "p-3 rounded-xl transition-all flex flex-col items-center gap-1 group",
                    activeTab === 'chat' ? "bg-primary/10 text-primary" : "text-muted hover:text-text hover:bg-surfaceHighlight"
                )}
                title="Chat"
            >
                <MessageSquare className="w-5 h-5" />
                <span className="text-[10px] font-medium">Chat</span>
            </button>
            
            <button 
                onClick={() => setActiveTab('code')}
                className={cn(
                    "p-3 rounded-xl transition-all flex flex-col items-center gap-1 group",
                    activeTab === 'code' ? "bg-primary/10 text-primary" : "text-muted hover:text-text hover:bg-surfaceHighlight"
                )}
                title="Code"
            >
                <Code2 className="w-5 h-5" />
                <span className="text-[10px] font-medium">Code</span>
            </button>

            <button 
                onClick={() => setActiveTab('preview')}
                className={cn(
                    "p-3 rounded-xl transition-all flex flex-col items-center gap-1 group relative",
                    activeTab === 'preview' ? "bg-primary/10 text-primary" : "text-muted hover:text-text hover:bg-surfaceHighlight"
                )}
                title="Preview"
            >
                <Play className="w-5 h-5" />
                <span className="text-[10px] font-medium">Run</span>
                {isGenerating && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                )}
            </button>
        </div>

        <div className="mt-auto flex flex-col items-center gap-2">
             <div className={cn("w-2 h-2 rounded-full", isGenerating ? "bg-yellow-500 animate-pulse" : "bg-green-500")}></div>
        </div>
      </nav>

      <main className="flex-1 relative flex overflow-hidden pb-16 md:pb-0">
        
        <div className={cn("absolute inset-0 z-10 bg-background", activeTab === 'chat' ? "block" : "hidden")}>
            <ChatInterface 
                messages={messages}
                onSendMessage={handleSendMessage}
                isGenerating={isGenerating}
            />
        </div>

        <div className={cn("absolute inset-0 z-10 bg-background flex", activeTab === 'code' ? "block" : "hidden")}>
            <div className="hidden md:block w-64 border-r border-border bg-surface">
                 <FileExplorer 
                    files={files} 
                    selectedFile={selectedFile} 
                    onSelectFile={handleFileSelect} 
                 />
            </div>
            
            {isMobileExplorerOpen && (
                <div className="absolute inset-0 z-50 flex md:hidden">
                     <div className="w-64 bg-surface h-full border-r border-border shadow-2xl animate-in slide-in-from-left">
                        <div className="h-12 border-b border-border flex items-center justify-between px-4">
                            <span className="font-medium">Files</span>
                            <button onClick={() => setIsMobileExplorerOpen(false)}>
                                <X className="w-5 h-5 text-muted" />
                            </button>
                        </div>
                        <FileExplorer 
                            files={files} 
                            selectedFile={selectedFile} 
                            onSelectFile={handleFileSelect} 
                        />
                     </div>
                     <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileExplorerOpen(false)} />
                </div>
            )}

            <div className="flex-1 flex flex-col relative">
                 <div className="h-10 border-b border-border bg-surface flex items-center px-4 md:hidden justify-between">
                      <div className="flex items-center gap-2 overflow-hidden">
                          <button onClick={() => setIsMobileExplorerOpen(true)} className="p-1 -ml-1 text-muted hover:text-text">
                             <Menu className="w-5 h-5" />
                          </button>
                          <span className="text-xs font-mono text-muted truncate">{selectedFile}</span>
                      </div>
                 </div>

                 <div className="flex-1 relative">
                    <CodeEditor 
                        filename={selectedFile}
                        content={selectedFile ? files[selectedFile].content : ''}
                        language={selectedFile ? files[selectedFile].language : 'plaintext'}
                        onChange={handleFileChange}
                    />
                 </div>
            </div>
        </div>

        <div className={cn("absolute inset-0 z-10 bg-background", activeTab === 'preview' ? "block" : "hidden")}>
            <Preview 
                content={previewContent}
                device={device}
                onDeviceChange={setDevice}
                isGenerating={isGenerating}
            />
        </div>

      </main>

      <nav className="md:hidden h-16 bg-surface border-t border-border flex items-center justify-around fixed bottom-0 w-full z-50 pb-safe">
          <button 
            onClick={() => setActiveTab('chat')}
            className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors",
                activeTab === 'chat' ? "text-primary" : "text-muted"
            )}
          >
              <MessageSquare className="w-5 h-5" />
              <span className="text-[10px] font-medium">Chat</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('code')}
            className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors",
                activeTab === 'code' ? "text-primary" : "text-muted"
            )}
          >
              <Code2 className="w-5 h-5" />
              <span className="text-[10px] font-medium">Code</span>
          </button>

          <button 
            onClick={() => setActiveTab('preview')}
            className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors relative",
                activeTab === 'preview' ? "text-primary" : "text-muted"
            )}
          >
              <Play className="w-5 h-5" />
              <span className="text-[10px] font-medium">Run</span>
              {isGenerating && (
                 <span className="absolute top-2 right-3 w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
              )}
          </button>
      </nav>
    </div>
  );
}

export default App;
