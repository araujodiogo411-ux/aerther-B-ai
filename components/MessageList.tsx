import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage, Role } from '../types';
import { BotIcon, UserIcon, PdfIcon, CodeIcon } from './Icons';

interface MessageListProps {
  messages: ChatMessage[];
}

const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const RenderMessageContent = ({ msg }: { msg: ChatMessage }) => {
      const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');

      // Check if message has HTML content block for preview
      const hasHtml = msg.text.includes('```html') || msg.text.includes('<!DOCTYPE html>');
      let htmlContent = "";
      let displayText = msg.text;

      if (hasHtml) {
          const match = msg.text.match(/```html([\s\S]*?)```/) || msg.text.match(/<!DOCTYPE html>([\s\S]*?)<\/html>/);
          if (match) {
             htmlContent = match[1] || match[0];
          }
      }

      return (
        <>
            {msg.attachment && (
                <div className="mb-3 relative group inline-block">
                    <img 
                        src={`data:${msg.attachment.mimeType};base64,${msg.attachment.data}`}
                        alt="Anexo"
                        className="max-w-[250px] max-h-[250px] rounded-lg border border-zinc-700 shadow-md object-cover"
                    />
                    <a 
                      href={`data:${msg.attachment.mimeType};base64,${msg.attachment.data}`}
                      download="anexo-aether.png"
                      className="absolute bottom-2 right-2 bg-zinc-900/80 text-white p-2 rounded-full hover:bg-blue-600 transition-colors opacity-0 group-hover:opacity-100"
                      title="Baixar imagem"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </a>
                </div>
            )}
            
            <div className={`prose prose-invert prose-p:my-2 prose-headings:text-zinc-100 prose-code:text-blue-300 max-w-none`}>
                <ReactMarkdown
                   components={{
                    code({node, className, children, ...props}) {
                      const match = /language-(\w+)/.exec(className || '')
                      return match ? (
                        <div className="bg-[#1e1e1e] rounded-md overflow-hidden my-3 border border-zinc-800">
                           <div className="bg-zinc-900 px-4 py-1 text-xs text-zinc-500 border-b border-zinc-800 flex justify-between">
                             <span>{match[1]}</span>
                           </div>
                           <pre className="p-4 overflow-x-auto">
                             <code className={className} {...props}>
                               {children}
                             </code>
                           </pre>
                        </div>
                      ) : (
                        <code className="bg-zinc-800 text-pink-300 px-1 py-0.5 rounded text-sm" {...props}>
                          {children}
                        </code>
                      )
                    }
                   }}
                >
                  {displayText}
                </ReactMarkdown>
            </div>

            {hasHtml && htmlContent && (
                <div className="mt-4 border border-zinc-700 rounded-xl overflow-hidden bg-zinc-900 flex flex-col h-[500px]">
                    <div className="flex items-center justify-between px-2 bg-zinc-800 border-b border-zinc-700">
                        <div className="flex gap-1">
                            <button 
                                onClick={() => setViewMode('preview')}
                                className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${viewMode === 'preview' ? 'border-blue-500 text-white' : 'border-transparent text-zinc-400 hover:text-zinc-300'}`}
                            >
                                Preview
                            </button>
                            <button 
                                onClick={() => setViewMode('code')}
                                className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${viewMode === 'code' ? 'border-blue-500 text-white' : 'border-transparent text-zinc-400 hover:text-zinc-300'}`}
                            >
                                Código
                            </button>
                        </div>
                        <div className="flex gap-1.5 px-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50"></div>
                        </div>
                    </div>
                    
                    <div className="flex-1 relative bg-white">
                        {viewMode === 'preview' ? (
                            <iframe 
                                srcDoc={htmlContent}
                                className="w-full h-full border-0"
                                title="Site Preview"
                                sandbox="allow-scripts"
                            />
                        ) : (
                            <div className="absolute inset-0 bg-[#1e1e1e] p-4 overflow-auto text-xs font-mono text-zinc-300 whitespace-pre">
                                {htmlContent}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
      );
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 space-y-8 max-w-3xl mx-auto w-full">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex gap-4 animate-slide-up ${
            msg.role === Role.User ? 'flex-row-reverse' : 'flex-row'
          }`}
        >
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            msg.role === Role.User ? 'bg-zinc-800 text-zinc-300' : 'bg-gradient-to-tr from-blue-600 to-purple-600 text-white'
          }`}>
            {msg.role === Role.User ? <UserIcon className="w-5 h-5" /> : <BotIcon className="w-5 h-5" />}
          </div>

          <div className={`flex-1 overflow-hidden ${msg.role === Role.User ? 'text-right' : 'text-left'}`}>
            <div className={`inline-block text-sm sm:text-base leading-relaxed ${
              msg.role === Role.User 
                ? 'bg-zinc-800/80 text-zinc-100 py-3 px-5 rounded-2xl rounded-tr-sm backdrop-blur-sm border border-zinc-700/50 text-left'
                : 'text-zinc-300 w-full'
            }`}>
              <RenderMessageContent msg={msg} />
              
              {msg.isStreaming && (
                <span className="inline-block w-2 h-4 ml-1 bg-blue-500 animate-pulse align-middle"></span>
              )}
            </div>
          </div>
        </div>
      ))}
      <div ref={bottomRef} className="h-4" />
    </div>
  );
};

export default MessageList;