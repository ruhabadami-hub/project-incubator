import React, { useRef, useEffect } from 'react';
import { RefreshCw, Smartphone, Monitor, Tablet } from 'lucide-react';
import { cn } from '../utils';
import { DeviceFrame } from '../types';

interface PreviewProps {
  content: string;
  device: DeviceFrame;
  onDeviceChange: (device: DeviceFrame) => void;
  isGenerating: boolean;
}

const Preview: React.FC<PreviewProps> = ({ content, device, onDeviceChange, isGenerating }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Force iframe refresh when content drastically changes or on demand
  const handleRefresh = () => {
    if (iframeRef.current) {
      iframeRef.current.srcdoc = content;
    }
  };

  useEffect(() => {
      if (iframeRef.current) {
          iframeRef.current.srcdoc = content;
      }
  }, [content]);

  return (
    <div className="h-full flex flex-col bg-[#0c0c0e] relative">
      {/* Toolbar - Hidden on mobile to maximize space, or make it very slim */}
      <div className="h-12 px-4 flex items-center justify-between bg-surface border-b border-border shrink-0">
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
           <span className="text-xs font-medium text-muted">Live Preview</span>
        </div>
        
        {/* Device toggles - Only visible on desktop layouts */}
        <div className="hidden md:flex items-center bg-surfaceHighlight rounded-md p-0.5 border border-border/50">
          <button 
            onClick={() => onDeviceChange('mobile')}
            className={cn("p-1.5 rounded hover:text-white transition-colors", device === 'mobile' ? "bg-border/50 text-white shadow-sm" : "text-muted")}
            title="Mobile"
          >
            <Smartphone className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={() => onDeviceChange('tablet')}
            className={cn("p-1.5 rounded hover:text-white transition-colors", device === 'tablet' ? "bg-border/50 text-white shadow-sm" : "text-muted")}
            title="Tablet"
          >
            <Tablet className="w-3.5 h-3.5" />
          </button>
           <button 
            onClick={() => onDeviceChange('desktop')}
            className={cn("p-1.5 rounded hover:text-white transition-colors", device === 'desktop' ? "bg-border/50 text-white shadow-sm" : "text-muted")}
            title="Desktop"
          >
            <Monitor className="w-3.5 h-3.5" />
          </button>
        </div>

        <button onClick={handleRefresh} className="p-1.5 text-muted hover:text-white transition-colors">
            <RefreshCw className={cn("w-3.5 h-3.5", isGenerating && "animate-spin")} />
        </button>
      </div>

      {/* Preview Area */}
      <div className="flex-1 relative flex items-center justify-center bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat opacity-100 overflow-hidden">
        <div 
            className={cn(
                "transition-all duration-500 ease-in-out overflow-hidden bg-white",
                // On mobile (small screens), force full width/height regardless of 'device' state
                // On desktop (md+), respect the 'device' state
                "w-full h-full md:w-auto md:h-auto", 
                
                // Desktop specific sizing based on device selection
                (device === 'mobile') && "md:w-[375px] md:h-[667px] md:rounded-[32px] md:shadow-2xl md:border-[8px] md:border-surfaceHighlight/50",
                (device === 'tablet') && "md:w-[768px] md:h-[1024px] md:rounded-[24px] md:shadow-2xl md:border-[8px] md:border-surfaceHighlight/50",
                (device === 'desktop') && "md:w-full md:h-full md:rounded-none md:border-0"
            )}
        >
            <iframe
                ref={iframeRef}
                title="preview"
                sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-same-origin allow-scripts allow-top-navigation-by-user-activation"
                className="w-full h-full bg-white"
            />
        </div>
      </div>
    </div>
  );
};

export default Preview;