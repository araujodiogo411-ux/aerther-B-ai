import React, { useState } from 'react';
import { UserState } from '../types';
import { GoogleIcon, LibraryIcon, AddChatIcon, ShareIcon } from './Icons';

interface HeaderProps {
  user: UserState;
  onLogin: () => void;
  onOpenLibrary: () => void;
  onNewChat: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogin, onOpenLibrary, onNewChat }) => {
  const [showToast, setShowToast] = useState(false);

  const handleShare = () => {
    // Simulate copying a link
    navigator.clipboard.writeText("https://aether-base-app.ai/share/" + Math.random().toString(36).substring(7));
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 p-6 flex justify-between items-center bg-transparent backdrop-blur-sm">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={onNewChat}>
          {/* User provided Logo */}
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg border border-white/10 group-hover:scale-105 transition-transform duration-300">
             <img 
              src="https://i.ibb.co/C34B0D9y/logo.png" 
              alt="AB" 
              className="w-full h-full object-cover"
              onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement?.classList.add('bg-gradient-to-tr', 'from-blue-600', 'to-purple-600', 'flex', 'items-center', 'justify-center');
                  if (e.currentTarget.parentElement) e.currentTarget.parentElement.innerText = 'AB';
              }} 
             />
          </div>
          <span className="font-semibold text-xl tracking-tight text-white/90">Aether Base</span>
        </div>

        <div className="flex items-center gap-4">
          
          {/* Share Button */}
          <button 
            onClick={handleShare}
            className="p-2 text-zinc-400 hover:text-white transition-colors hover:bg-white/5 rounded-full"
            title="Compartilhar Chat"
          >
            <ShareIcon />
          </button>

          {/* Library Button */}
          <button 
            onClick={onOpenLibrary}
            className="p-2 text-zinc-400 hover:text-white transition-colors hover:bg-white/5 rounded-full"
            title="Biblioteca"
          >
            <LibraryIcon />
          </button>

          {/* New Chat Button */}
          <button 
            onClick={onNewChat}
            className="p-2 text-zinc-400 hover:text-white transition-colors hover:bg-white/5 rounded-full"
            title="Novo Chat"
          >
            <AddChatIcon />
          </button>

          {/* Auth Section */}
          {!user.isLoggedIn ? (
            <button 
              onClick={onLogin}
              className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full font-medium text-sm hover:bg-zinc-200 transition-colors shadow-lg shadow-blue-500/10"
            >
              <GoogleIcon className="w-4 h-4" />
              <span>Sign in</span>
            </button>
          ) : (
            <div className="flex items-center gap-3">
               <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-blue-500 p-[1px] cursor-pointer">
                  <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center text-white text-xs font-bold">
                     DF
                  </div>
               </div>
            </div>
          )}
        </div>
      </header>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-24 right-6 bg-zinc-800 border border-zinc-700 text-white px-4 py-3 rounded-lg shadow-2xl z-[100] animate-fade-in flex items-center gap-2">
          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
          <span className="text-sm">Link do chat copiado!</span>
        </div>
      )}
    </>
  );
};

export default Header;