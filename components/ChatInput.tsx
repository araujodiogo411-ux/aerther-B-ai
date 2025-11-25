import React, { useState, useRef, useEffect } from 'react';
import { SendIcon, PaperclipIcon, PlusIcon, PdfIcon, CodeIcon, StudyIcon } from './Icons';
import { Attachment } from '../types';

interface ChatInputProps {
  onSend: (message: string, attachment?: Attachment) => void;
  onCreatePdf: () => void;
  onSetMode: (mode: 'study' | 'site') => void;
  isLoading: boolean;
  compact?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, onCreatePdf, onSetMode, isLoading, compact = false }) => {
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<Attachment | undefined>(undefined);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  // Handle outside click for menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowPlusMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle paste for images
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            e.preventDefault();
            const blob = items[i].getAsFile();
            if (blob) processFile(blob);
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      // Extract base64 part
      const base64Data = result.split(',')[1];
      setAttachment({
        type: 'image',
        data: base64Data,
        mimeType: file.type
      });
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if ((input.trim() || attachment) && !isLoading) {
      onSend(input, attachment);
      setInput('');
      setAttachment(undefined);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  return (
    <div className={`w-full max-w-3xl mx-auto transition-all duration-500 ease-out ${compact ? 'opacity-100' : 'opacity-100'}`}>
      <div className="relative group">
        {/* Glow effect */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl opacity-20 group-hover:opacity-40 transition duration-500 blur-md"></div>
        
        <div className="relative flex flex-col glass rounded-2xl p-2 transition-all duration-300">
          
          {/* Attachment Preview */}
          {attachment && (
            <div className="px-4 pt-4 pb-2 relative animate-fade-in">
              <div className="relative inline-block">
                <img 
                  src={`data:${attachment.mimeType};base64,${attachment.data}`} 
                  alt="Attachment" 
                  className="h-20 w-auto rounded-lg border border-zinc-700 shadow-lg"
                />
                <button 
                  onClick={() => setAttachment(undefined)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={compact ? "Digite sua mensagem..." : "Peça para o Aether Base criar um site, PDF ou analisar uma imagem..."}
            className="w-full bg-transparent text-white placeholder-zinc-500 px-4 py-3 text-base outline-none resize-none overflow-hidden min-h-[56px] max-h-[150px]"
            rows={1}
            disabled={isLoading}
          />
          
          <div className="flex justify-between items-center px-2 pb-1 pt-2 relative">
            <div className="flex items-center gap-2">
              
              {/* PLUS MENU */}
              <div className="relative" ref={menuRef}>
                <button 
                  onClick={() => setShowPlusMenu(!showPlusMenu)}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <PlusIcon />
                </button>
                
                {showPlusMenu && (
                  <div className="absolute bottom-12 left-0 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-1 z-50 animate-slide-up flex flex-col gap-1">
                    <button 
                      onClick={() => { onSetMode('study'); setShowPlusMenu(false); }}
                      className="flex items-center gap-3 w-full px-3 py-2 text-left text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg"
                    >
                      <StudyIcon /> Modo de Estudo
                    </button>
                    <button 
                      onClick={() => { onSetMode('site'); setShowPlusMenu(false); }}
                      className="flex items-center gap-3 w-full px-3 py-2 text-left text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg"
                    >
                      <CodeIcon /> Criador de Sites
                    </button>
                  </div>
                )}
              </div>

              {/* ATTACH BUTTON */}
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2" 
                title="Anexar Imagem"
              >
                <PaperclipIcon />
                {!compact && <span className="text-xs font-medium">Anexar</span>}
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileSelect}
              />

              {/* PDF BUTTON */}
              <button 
                onClick={onCreatePdf}
                className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2" 
                title="Criar PDF"
              >
                <PdfIcon className="w-4 h-4" />
                {!compact && <span className="text-xs font-medium">PDF</span>}
              </button>
            </div>

            <button
              onClick={handleSend}
              disabled={(!input.trim() && !attachment) || isLoading}
              className={`p-3 rounded-xl transition-all duration-300 flex items-center justify-center ${
                (input.trim() || attachment)
                  ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)] hover:shadow-[0_0_20px_rgba(255,255,255,0.5)] transform hover:scale-105' 
                  : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
              }`}
            >
              <SendIcon className={isLoading ? "animate-pulse" : ""} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;