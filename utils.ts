
import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { FileSystem } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const generateId = () => Math.random().toString(36).substring(2, 9);

// Virtual File System Helpers
export const getLanguageFromFilename = (filename: string): string => {
  const ext = filename.split('.').pop();
  switch (ext) {
    case 'js': return 'javascript';
    case 'jsx': return 'javascript';
    case 'ts': return 'typescript';
    case 'tsx': return 'typescript';
    case 'html': return 'html';
    case 'css': return 'css';
    case 'json': return 'json';
    default: return 'plaintext';
  }
};

/**
 * Resolves a relative module specifier against a source file path.
 */
function resolveModuleSpecifier(sourcePath: string, specifier: string): string {
  if (!specifier.startsWith('.') && !specifier.startsWith('/')) {
    return specifier;
  }
  if (specifier.startsWith('/')) {
    return specifier.slice(1);
  }
  const sourceDir = sourcePath.split('/').slice(0, -1);
  const parts = specifier.split('/');
  const resolvedParts = [...sourceDir];

  for (const part of parts) {
    if (part === '.') continue;
    if (part === '..') {
      if (resolvedParts.length > 0) resolvedParts.pop();
    } else {
      resolvedParts.push(part);
    }
  }
  return resolvedParts.join('/');
}

export const buildPreviewContent = (files: FileSystem): string => {
  let indexHtml = files['index.html']?.content || '';
  
  // Fallback if index.html is missing (though strictly it shouldn't be touched by AI)
  if (!indexHtml) {
    indexHtml = INITIAL_FILES['index.html'].content;
  }
  
  const processedFiles: Record<string, string> = {};

  Object.entries(files).forEach(([path, file]) => {
    if (path.match(/\.(js|jsx|ts|tsx)$/)) {
      let content = file.content;
      // Rewrite static imports
      content = content.replace(/((?:import|export)\s+(?:[\s\S]*?from\s+)?['"])([\.\/][^'"]+)(['"])/g, (match, p1, p2, p3) => {
        const resolved = resolveModuleSpecifier(path, p2);
        return `${p1}${resolved}${p3}`;
      });
      // Rewrite dynamic imports
      content = content.replace(/(import\(['"])([\.\/][^'"]+)(['"]\))/g, (match, p1, p2, p3) => {
        const resolved = resolveModuleSpecifier(path, p2);
        return `${p1}${resolved}${p3}`;
      });
      processedFiles[path] = content;
    } else {
      processedFiles[path] = file.content;
    }
  });

  // Generate Import Map
  const imports: Record<string, string> = {
      "preact": "https://esm.sh/preact@10.19.6",
      "preact/hooks": "https://esm.sh/preact@10.19.6/hooks",
      "htm": "https://esm.sh/htm@3.1.1",
      "canvas-confetti": "https://esm.sh/canvas-confetti@1.9.2",
      "gsap": "https://esm.sh/gsap@3.12.5"
  };

  Object.entries(processedFiles).forEach(([path, content]) => {
      if (path === 'index.html' || path.endsWith('.css')) return;

      if (path.match(/\.(js|jsx|ts|tsx)$/)) {
          const mimeType = 'text/javascript';
          const dataUri = `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`;
          const cleanPath = path.replace(/^(\.\/|\/)/, '');

          imports[cleanPath] = dataUri;
          imports[`./${cleanPath}`] = dataUri;
          imports[`/${cleanPath}`] = dataUri;

          const stripped = cleanPath.replace(/\.(js|jsx|ts|tsx)$/, '');
          if (stripped !== cleanPath) {
             imports[stripped] = dataUri;
             imports[`./${stripped}`] = dataUri;
             imports[`/${stripped}`] = dataUri;
          }
      }
  });

  const importMapScript = `
    <script type="importmap">
      {
        "imports": ${JSON.stringify(imports, null, 2)}
      }
    </script>
  `;

  let cssContent = '';
  Object.entries(files).forEach(([path, file]) => {
      if (path.endsWith('.css')) {
          cssContent += `\n/* ${path} */\n${file.content}\n`;
      }
  });
  const styleTag = cssContent ? `<style>${cssContent}</style>` : '';

  // Inject logic into HTML
  indexHtml = indexHtml.replace(
    /<script\s+type=["']module["']\s+src=["']([^"']+)["']><\/script>/g,
    (match, src) => {
      const resolved = resolveModuleSpecifier('index.html', src);
      return `<script type="module">import "${resolved}"</script>`;
    }
  );

  if (indexHtml.includes('<head>')) {
      indexHtml = indexHtml.replace('<head>', `<head>${importMapScript}${styleTag}`);
  } else {
      indexHtml = `${importMapScript}${styleTag}${indexHtml}`;
  }

  // Error Handling
  const errorScript = `
    <script>
      window.onerror = function(msg, url, line, col, error) {
        console.error('Runtime Error:', msg, '\\nLine:', line, '\\nFile:', url);
        const banner = document.createElement('div');
        banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:rgba(220,38,38,0.9);color:white;padding:8px;font-family:sans-serif;font-size:12px;z-index:9999;pointer-events:none;';
        banner.textContent = 'Runtime Error: ' + msg;
        document.body.appendChild(banner);
      };
    </script>
  `;
  
  if (indexHtml.includes('<body>')) {
    indexHtml = indexHtml.replace('<body>', `<body>${errorScript}`);
  } else {
    indexHtml += errorScript;
  }

  return indexHtml;
};

export const INITIAL_FILES: FileSystem = {
  'index.html': {
    name: 'index.html',
    language: 'html',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>EduSpark Game Shell</title>
    <style>
        /* GOLDEN SHELL STYLES - DO NOT EDIT */
        body, html { 
            margin: 0; padding: 0; width: 100%; height: 100%; 
            background: #1a1a1a; color: #fff; 
            overflow: hidden; font-family: 'Inter', sans-serif;
            display: flex; align-items: center; justify-content: center;
        }
        
        /* The Scalable Stage Container */
        #game-container {
            position: relative;
            width: 800px;
            height: 600px;
            background: #000;
            box-shadow: 0 0 50px rgba(0,0,0,0.5);
            overflow: hidden;
        }

        /* The Mount Point for Aether */
        #game-stage {
            width: 100%;
            height: 100%;
            position: relative;
        }

        /* Scale logic */
        @media (max-width: 840px), (max-height: 640px) {
            #game-container {
                transform-origin: center center;
                transform: scale(min(calc(100vw / 800), calc(100vh / 600)));
            }
        }
    </style>
    <script>
        // BRIDGE API MOCK
        window.gameAPI = {
            submitFinalScore: function(data) {
                console.log("🏆 [BRIDGE] Game Completed:", data);
                const banner = document.createElement('div');
                banner.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%, -50%);background:#10b981;color:white;padding:20px;border-radius:12px;font-weight:bold;text-align:center;box-shadow:0 10px 25px rgba(0,0,0,0.5);z-index:9999;';
                banner.innerHTML = '<h1>Great Job!</h1><p>Score Submitted: ' + (data.score.raw || 0) + '</p>';
                document.getElementById('game-stage').appendChild(banner);
            }
        };
    </script>
</head>
<body>
    <div id="game-container">
        <div id="game-stage">
            <!-- Aether mounts the app here -->
            <div style="height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#666;">
                <h2>Waiting for Aether...</h2>
                <p>Game content will load here.</p>
            </div>
        </div>
    </div>
    
    <!-- Main Entry Point -->
    <script type="module" src="./src/main.js"></script>
</body>
</html>`
  }
};
