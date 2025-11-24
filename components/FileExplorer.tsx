
import React from 'react';
import { File, Folder, FileCode, FileJson, FileType, Trash2, Plus } from 'lucide-react';
import { cn } from '../utils';
import { FileSystem, ProjectFile } from '../types';

interface FileExplorerProps {
  files: FileSystem;
  selectedFile: string | null;
  onSelectFile: (filename: string) => void;
}

const FileIcon = ({ filename }: { filename: string }) => {
  const ext = filename.split('.').pop();
  switch (ext) {
    case 'html': return <FileCode className="w-4 h-4 text-orange-400" />;
    case 'css': return <FileType className="w-4 h-4 text-blue-400" />;
    case 'js': return <FileCode className="w-4 h-4 text-yellow-400" />;
    case 'json': return <FileJson className="w-4 h-4 text-green-400" />;
    default: return <File className="w-4 h-4 text-gray-400" />;
  }
};

const FileExplorer: React.FC<FileExplorerProps> = ({ files, selectedFile, onSelectFile }) => {
  return (
    <div className="flex flex-col h-full bg-surface border-r border-border text-sm select-none">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="font-medium text-muted uppercase text-xs tracking-wider">Explorer</span>
        <div className="flex gap-1">
          <button className="p-1 hover:bg-surfaceHighlight rounded text-muted hover:text-text">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto py-2">
        <div className="px-4 py-1 mb-2 flex items-center gap-2 text-muted">
           <Folder className="w-4 h-4" />
           <span className="font-semibold text-text">project-root</span>
        </div>
        
        <div className="flex flex-col">
          {Object.values(files).map((file: ProjectFile) => (
            <div
              key={file.name}
              onClick={() => onSelectFile(file.name)}
              className={cn(
                "flex items-center gap-2 px-6 py-1.5 cursor-pointer transition-colors",
                selectedFile === file.name 
                  ? "bg-primary/10 text-primary border-r-2 border-primary" 
                  : "text-muted hover:text-text hover:bg-surfaceHighlight"
              )}
            >
              <FileIcon filename={file.name} />
              <span className="truncate">{file.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2 text-xs text-muted/50">
          <span>4 files</span>
          <span>•</span>
          <span>12kb</span>
        </div>
      </div>
    </div>
  );
};

export default FileExplorer;