import React, { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Chat } from "@google/genai";
// @ts-ignore - jspdf is imported via CDN
import { jsPDF } from "jspdf";

import Header from './components/Header';
import Background from './components/Background';
import ChatInput from './components/ChatInput';
import MessageList from './components/MessageList';
import { ChatMessage, Role, Attachment, UserState, LibraryItem } from './types';
import { createChatSession, streamResponse, generateImage } from './services/gemini';
import { PdfIcon, GoogleIcon, LibraryIcon } from './components/Icons';

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0); // For the 30s timer
  const [hasStarted, setHasStarted] = useState(false);
  
  // User & Auth State
  const [user, setUser] = useState<UserState>({ isLoggedIn: false });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false); // Google login simulation
  const [showLibrary, setShowLibrary] = useState(false);
  
  // PDF Mode State
  const [isPdfMode, setIsPdfMode] = useState(false);

  // Library Data
  const [library, setLibrary] = useState<LibraryItem[]>([]);

  // Keep chat instance in ref
  const chatSessionRef = useRef<Chat | null>(null);

  const getChatSession = () => {
    if (!chatSessionRef.current) {
      chatSessionRef.current = createChatSession();
    }
    return chatSessionRef.current;
  };

  // --- GOOGLE LOGIN SIMULATION ---
  const handleLoginStart = () => {
    setIsLoggingIn(true);
    // Simulate network delay and Google popup interaction
    setTimeout(() => {
        handleLoginSuccess();
    }, 2000);
  };

  const handleLoginSuccess = () => {
    setUser({
      isLoggedIn: true,
      name: "Usuário Aether",
      email: "usuario@exemplo.com",
      photoUrl: "https://lh3.googleusercontent.com/a/default-user=s96-c" // Dummy Google placeholder
    });
    setIsLoggingIn(false);
    setShowLoginModal(false);
  };

  const handleLogout = () => {
      setUser({ isLoggedIn: false });
      setMessages([]);
      setHasStarted(false);
  };

  const requireAuth = (): boolean => {
    if (!user.isLoggedIn) {
      setShowLoginModal(true);
      return false;
    }
    return true;
  };
  // -------------------------------

  // --- ADVANCED PDF GENERATION LOGIC ---
  const generatePdfFile = (title: string, bodyText: string, imageUrl?: string) => {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString();
    
    // Page Settings
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxLineWidth = pageWidth - margin * 2;

    // Helper for centering text
    const centerText = (text: string, y: number) => {
        const textWidth = doc.getStringUnitWidth(text) * doc.getFontSize() / doc.internal.scaleFactor;
        const x = (pageWidth - textWidth) / 2;
        doc.text(text, x, y);
    };

    // --- PAGE 1: COVER/HEADER ---
    
    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    centerText(title, 30);
    
    // Metadata (No Author Name as requested)
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    centerText(`Data: ${date}`, 40);
    doc.line(margin, 45, pageWidth - margin, 45); // Separator line

    let yPosition = 60;

    // Optional Image (From attachment or generated)
    if (imageUrl) {
        try {
            // Check aspect ratio to fit nicely
            const imgProps = doc.getImageProperties(imageUrl);
            const imgHeight = (imgProps.height * maxLineWidth) / imgProps.width;
            
            // Limit image height
            const finalHeight = Math.min(imgHeight, 100);
            
            // Center Image
            const xPos = (pageWidth - 170) / 2; 
            doc.addImage(imageUrl, 'PNG', xPos, yPosition, 170, finalHeight);
            yPosition += finalHeight + 15;
        } catch (e) {
            console.error("Error adding image to PDF", e);
        }
    }

    // --- BODY PARSING (Markdown-ish to PDF) ---
    doc.setTextColor(0, 0, 0);
    
    const lines = bodyText.split('\n');
    
    lines.forEach((line) => {
        // Check for page break needed
        if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
        }

        const trimmed = line.trim();
        
        // H1 Header (# )
        if (trimmed.startsWith('# ') || trimmed.startsWith('## ')) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(16);
            const headerText = trimmed.replace(/^#+ /, '');
            doc.text(headerText, margin, yPosition);
            yPosition += 10;
        }
        // H2/H3 Header (### )
        else if (trimmed.startsWith('### ')) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(14);
            const headerText = trimmed.replace(/^#+ /, '');
            doc.text(headerText, margin, yPosition);
            yPosition += 8;
        }
        // List Item
        else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(12);
            const listText = "• " + trimmed.substring(2);
            const splitList = doc.splitTextToSize(listText, maxLineWidth);
            doc.text(splitList, margin + 5, yPosition);
            yPosition += (splitList.length * 6);
        }
        // Normal Paragraph
        else if (trimmed.length > 0) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(12);
            // Justify logic is hard in jsPDF standard, standard align left is cleaner for robustness
            const splitText = doc.splitTextToSize(trimmed, maxLineWidth);
            doc.text(splitText, margin, yPosition);
            yPosition += (splitText.length * 6) + 4; // Add paragraph spacing
        }
    });

    // Save
    const pdfData = doc.output('datauristring');
    
    const newItem: LibraryItem = {
      id: uuidv4(),
      type: 'pdf',
      title: title,
      date: date,
      author: user.name || 'Aether User',
      content: pdfData
    };
    
    setLibrary(prev => [...prev, newItem]);
    return pdfData;
  };
  // ----------------------------

  const handleSendMessage = useCallback(async (text: string, attachment?: Attachment) => {
    if (!text.trim() && !attachment) return;

    if (!hasStarted) setHasStarted(true);

    // -- 1. PDF CREATION FLOW (Explicit Mode or Keyword) --
    const isPdfRequest = isPdfMode || text.toLowerCase().includes('criar um pdf') || text.toLowerCase().includes('gere um pdf');

    if (isPdfRequest) {
        if (!requireAuth()) {
            setIsPdfMode(false);
            return;
        }

        // Determine title/topic
        const topic = isPdfMode ? text : text.replace(/criar um pdf/i, '').replace(/sobre/i, '').trim() || "Documento";

        const userMsgId = uuidv4();
        setMessages(prev => [...prev, { id: userMsgId, role: Role.User, text: text, attachment }]);
        setIsLoading(true);

        const botMsgId = uuidv4();
        setMessages(prev => [...prev, { id: botMsgId, role: Role.Model, text: "Gerando PDF sofisticado...", isStreaming: true }]);

        try {
            // 1. Generate Structured Content
            const chat = getChatSession();
            // We ask specifically for Markdown headers to parse them later
            const contentPrompt = `Escreva um artigo completo e bem estruturado sobre: "${topic}". 
            Use títulos com markdown (# Título, ## Subtítulo). 
            Divida em parágrafos claros. 
            Não coloque blocos de código. 
            O texto deve ser educativo e formal.`;
            
            let generatedText = "";
            // If user attached an image, we send it to the model for context too
            await streamResponse(chat, contentPrompt, attachment, (chunk) => {
                generatedText = chunk;
            });

            // 2. Determine Image for PDF
            let pdfImage = attachment?.data ? `data:${attachment.mimeType};base64,${attachment.data}` : undefined;

            // If no attachment, generate one
            if (!pdfImage) {
                 setMessages(prev => prev.map(msg => msg.id === botMsgId ? { ...msg, text: "Gerando texto e imagem ilustrativa..." } : msg));
                 const imagePrompt = `Uma imagem ilustrativa minimalista e profissional sobre ${topic}`;
                 const base64Image = await generateImage(imagePrompt);
                 if (base64Image) {
                     pdfImage = `data:image/png;base64,${base64Image}`;
                 }
            }

            // 3. Create PDF
            generatePdfFile(topic.toUpperCase(), generatedText, pdfImage);

            setMessages(prev => prev.map(msg => 
                msg.id === botMsgId 
                ? { 
                    id: botMsgId, 
                    role: Role.Model, 
                    text: `**PDF Criado com Sucesso!**\n\nO arquivo sobre "${topic}" já está disponível na sua biblioteca.`,
                    isStreaming: false 
                  } 
                : msg
            ));

        } catch (error) {
             setMessages(prev => prev.map(msg => msg.id === botMsgId ? { ...msg, text: "Erro ao gerar PDF. Tente novamente mais tarde.", isStreaming: false } : msg));
        } finally {
            setIsLoading(false);
            setIsPdfMode(false);
        }
        return;
    }

    // -- 2. IMAGE GENERATION/EDITING FLOW --
    const isImageRequest = text.toLowerCase().includes('crie uma imagem') || 
                           text.toLowerCase().includes('gere uma imagem') ||
                           text.toLowerCase().includes('desenhe') ||
                           (attachment && (text.toLowerCase().includes('editar') || text.toLowerCase().includes('adicione') || text.toLowerCase().includes('mude') || text.toLowerCase().includes('transforme') || text.toLowerCase().includes('deixe')));
    
    if (isImageRequest) {
        if (!requireAuth()) {
           const userMsgId = uuidv4();
           setMessages(prev => [...prev, { id: userMsgId, role: Role.User, text: text, attachment }]);
           setTimeout(() => {
                const botMsgId = uuidv4();
                setMessages((prev) => [...prev, { id: botMsgId, role: Role.Model, text: "Para criar ou editar imagens, você precisa fazer login.", isStreaming: false}]);
           }, 500);
           return;
        }
        
        const userMsgId = uuidv4();
        setMessages(prev => [...prev, { id: userMsgId, role: Role.User, text: text, attachment }]);
        setIsLoading(true);

        const botMsgId = uuidv4();
        setMessages((prev) => [
          ...prev,
          { id: botMsgId, role: Role.Model, text: '', isStreaming: true },
        ]);

        // Start 30s timer visualization
        let progress = 0;
        const interval = setInterval(() => {
            progress += 100 / 30; // 30 seconds to reach 100
            if (progress > 100) progress = 100;
            setLoadingProgress(progress);
        }, 1000);

        setMessages(prev => prev.map(m => m.id === botMsgId ? {...m, text: "Processando sua imagem (Aguarde 30s)..."} : m));

        try {
           const startTime = Date.now();
           // Attempt generation/editing
           const base64Image = await generateImage(text, attachment);
           
           if (!base64Image) {
               throw new Error("Falha na geração: API retornou vazio.");
           }

           // If successful, calculate remaining time to meet the 30s requirement
           const elapsed = Date.now() - startTime;
           const remainingTime = 30000 - elapsed;
           
           if (remainingTime > 0) {
              await new Promise(resolve => setTimeout(resolve, remainingTime));
           }

           clearInterval(interval);
           setLoadingProgress(0);

           setMessages(prev => prev.map(m => m.id === botMsgId ? {
               ...m, 
               text: `Imagem criada com sucesso: "${text}"`,
               attachment: {
                   type: 'image',
                   data: base64Image,
                   mimeType: 'image/png'
               },
               isStreaming: false
           } : m));

           // Add to library
           const newItem: LibraryItem = {
              id: uuidv4(),
              type: 'image',
              title: text.slice(0, 20) + '...',
              date: new Date().toLocaleDateString(),
              author: user.name || 'Aether Base',
              content: base64Image
           };
           setLibrary(l => [...l, newItem]);

        } catch (e) {
            clearInterval(interval);
            setLoadingProgress(0);
            console.error(e);
            setMessages(prev => prev.map(m => m.id === botMsgId ? {...m, text: "Não foi possível gerar a imagem. Erro no servidor ou API Key.", isStreaming: false} : m));
        } finally {
            setIsLoading(false);
        }
        return;
    }

    // -- 3. STANDARD CHAT / WEBSITE GENERATION --
    const userMsgId = uuidv4();
    const newUserMessage: ChatMessage = {
      id: userMsgId,
      role: Role.User,
      text: text,
      attachment: attachment
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setIsLoading(true);

    const botMsgId = uuidv4();
    setMessages((prev) => [
      ...prev,
      { id: botMsgId, role: Role.Model, text: '', isStreaming: true },
    ]);

    try {
      const chat = getChatSession();
      
      await streamResponse(chat, text, attachment, (currentText) => {
        setMessages((prev) => 
          prev.map((msg) => 
            msg.id === botMsgId 
              ? { ...msg, text: currentText } 
              : msg
          )
        );
      });

      // Post-processing: If site generated, add to library
      setMessages(prev => {
        const lastMsg = prev.find(m => m.id === botMsgId);
        if (lastMsg && (lastMsg.text.includes('```html') || lastMsg.text.includes('<!DOCTYPE html>'))) {
           if (user.isLoggedIn) {
             const newItem: LibraryItem = {
               id: uuidv4(),
               type: 'site',
               title: 'Website gerado por IA',
               date: new Date().toLocaleDateString(),
               author: user.name || 'Aether Base',
               content: lastMsg.text
             };
             // Avoid duplicates if re-rendering
             setLibrary(l => {
                 if (l.some(i => i.content === lastMsg.text)) return l;
                 return [...l, newItem];
             });
           }
        }
        return prev;
      });
      
    } catch (error) {
      console.error("Failed to generate response", error);
      setMessages((prev) => [
        ...prev,
        { id: uuidv4(), role: Role.Model, text: "Desculpe, ocorreu um erro. Verifique sua conexão ou tente novamente.", isStreaming: false }
      ]);
    } finally {
       setMessages((prev) => 
          prev.map((msg) => 
            msg.id === botMsgId 
              ? { ...msg, isStreaming: false } 
              : msg
          )
        );
      setIsLoading(false);
    }
  }, [hasStarted, user.isLoggedIn, requireAuth, user.name, isPdfMode]);

  const handleStartPdfMode = () => {
    if (!requireAuth()) return;
    
    if (!hasStarted) setHasStarted(true);
    setIsPdfMode(true);
    
    // Add system message prompting for topic
    setMessages(prev => [...prev, {
        id: uuidv4(),
        role: Role.Model,
        text: "Modo Criador de PDF ativado. **Qual é o tema do seu PDF?** (Digite o assunto, ex: 'História de Roma', 'Receita de Bolo')",
        isStreaming: false
    }]);
  };

  const handleSetMode = (mode: 'study' | 'site') => {
    if (!requireAuth()) return;
    if (!hasStarted) setHasStarted(true);

    const prompt = mode === 'study' 
      ? "Ative o Modo de Estudo. Ajude-me a focar, crie resumos e faça perguntas sobre o que eu estudar." 
      : "Ative o Criador de Sites. Crie um site completo em HTML/CSS/JS sobre um tema moderno. Mostre o código e o preview.";
    
    handleSendMessage(prompt);
  };

  const resetChat = () => {
    setMessages([]);
    setHasStarted(false);
    setIsPdfMode(false);
    chatSessionRef.current = null;
  };

  return (
    <div className="relative min-h-screen flex flex-col font-sans text-zinc-100 selection:bg-blue-500/30">
      <Background />
      <Header 
        user={user} 
        onLogin={() => setShowLoginModal(true)} 
        onOpenLibrary={() => setShowLibrary(true)}
        onNewChat={resetChat}
      />

      <main className={`flex-1 flex flex-col transition-all duration-700 ${hasStarted ? 'pt-24 pb-4' : 'justify-center items-center p-4'}`}>
        
        {!hasStarted && (
          <div className="w-full max-w-4xl mx-auto flex flex-col items-center text-center space-y-10 animate-fade-in z-10">
            
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium cursor-pointer hover:bg-blue-500/20 transition-colors">
              <span className="bg-blue-500 text-[10px] text-white px-1.5 py-0.5 rounded-sm font-bold">New</span>
              <span>Aether Base v2.0</span>
            </div>

            <div className="space-y-4">
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
                Crie algo <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">Aether Base</span>
              </h1>
              <p className="text-xl text-zinc-400 max-w-2xl mx-auto font-light">
                Desenvolva aplicativos, crie imagens, PDFs e estude com IA. <br/>
                Minimalista e sofisticado.
              </p>
            </div>

            <div className="w-full px-4">
              <ChatInput 
                onSend={handleSendMessage} 
                onCreatePdf={handleStartPdfMode}
                onSetMode={handleSetMode}
                isLoading={isLoading} 
              />
            </div>
          </div>
        )}

        {hasStarted && (
          <div className="w-full flex-1 flex flex-col h-full max-w-5xl mx-auto">
            <MessageList messages={messages} />
            
            {/* Loading Progress Bar for Images */}
            {isLoading && loadingProgress > 0 && (
                <div className="w-full max-w-3xl mx-auto px-4 mb-2">
                    <div className="flex justify-between text-xs text-blue-400 mb-1">
                        <span>Processando sua solicitação...</span>
                        <span>{Math.round(loadingProgress)}%</span>
                    </div>
                    <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-1000 ease-linear"
                            style={{ width: `${loadingProgress}%` }}
                        ></div>
                    </div>
                </div>
            )}

            <div className="p-4 sticky bottom-0 z-20">
               <div className="max-w-3xl mx-auto">
                  <ChatInput 
                    onSend={handleSendMessage} 
                    onCreatePdf={handleStartPdfMode}
                    onSetMode={handleSetMode}
                    isLoading={isLoading} 
                    compact={true} 
                  />
                  {isPdfMode && (
                      <div className="text-center mt-2 text-blue-400 text-xs animate-pulse">
                          Modo PDF Ativo: Digite o tema para gerar.
                      </div>
                  )}
                  <div className="text-center mt-2">
                    <p className="text-[10px] text-zinc-600">Aether Base pode cometer erros.</p>
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* Footer Credits */}
        <footer className="w-full py-4 text-center text-zinc-600 text-xs mt-auto">
            <p>Criado por <span className="text-zinc-400 font-medium">Davi Felipe</span>, aluno do 6º ano na Base.</p>
            <p className="italic mt-1 opacity-60">"Eu sou Davi Felipe, eu amo desenvolver esses projetos, criei este site de ia o Aether Base para ajudar outras pessoas nos estudos e em trabalhos"</p>
        </footer>

      </main>

      {/* Library Modal */}
      {showLibrary && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl animate-slide-up">
             <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                   <span className="bg-blue-500/20 text-blue-400 p-1.5 rounded-lg"><LibraryIcon /></span> Biblioteca
                </h2>
                <button onClick={() => setShowLibrary(false)} className="text-zinc-400 hover:text-white">✕</button>
             </div>
             <div className="p-4 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {library.length === 0 ? (
                    <div className="col-span-full text-center py-10 text-zinc-500">
                        Nenhum item criado ainda.
                    </div>
                ) : (
                    library.map(item => (
                        <div key={item.id} className="bg-zinc-800 rounded-xl p-4 hover:bg-zinc-750 border border-zinc-700 hover:border-blue-500/50 transition-all cursor-pointer group">
                            <div className="flex justify-between items-start mb-2">
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                                    item.type === 'pdf' ? 'bg-red-500/20 text-red-400' : 
                                    item.type === 'site' ? 'bg-green-500/20 text-green-400' : 
                                    'bg-purple-500/20 text-purple-400'
                                }`}>
                                    {item.type.toUpperCase()}
                                </span>
                                <span className="text-xs text-zinc-500">{item.date}</span>
                            </div>
                            <h3 className="font-semibold text-zinc-200 mb-1">{item.title}</h3>
                            <p className="text-xs text-zinc-500">Criado por: {item.author}</p>
                            
                            {item.type === 'pdf' && (
                                <button onClick={() => {
                                    const win = window.open();
                                    win?.document.write(`<iframe src="${item.content}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                                }} className="mt-3 text-xs bg-zinc-700 hover:bg-zinc-600 text-white px-3 py-2 rounded-lg w-full">
                                    Abrir PDF
                                </button>
                            )}
                             {item.type === 'site' && (
                                <button onClick={() => {
                                   /* Code view - would open code in chat usually */
                                }} className="mt-3 text-xs bg-zinc-700 hover:bg-zinc-600 text-white px-3 py-2 rounded-lg w-full">
                                    Ver Código Salvo
                                </button>
                            )}
                            {item.type === 'image' && (
                                <div className="mt-2 rounded-lg overflow-hidden h-32 w-full relative group-hover:opacity-90 transition-opacity">
                                    <img src={`data:image/png;base64,${item.content}`} className="w-full h-full object-cover" alt="Generated" />
                                    <a 
                                      href={`data:image/png;base64,${item.content}`} 
                                      download={`aether-image-${item.id}.png`}
                                      className="absolute bottom-2 right-2 bg-black/60 text-white p-1 rounded hover:bg-black/80"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                    </a>
                                </div>
                            )}
                        </div>
                    ))
                )}
             </div>
          </div>
        </div>
      )}

      {/* Realistic Google Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
           {isLoggingIn ? (
               // Loading State mimicking Google's check
               <div className="bg-white rounded-lg p-10 flex flex-col items-center shadow-2xl">
                   <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                   <p className="text-gray-600 font-medium">Verificando conta Google...</p>
               </div>
           ) : (
               // Account Chooser UI
               <div className="bg-[#fff] text-gray-900 border border-gray-200 rounded-lg max-w-[400px] w-full shadow-2xl relative overflow-hidden font-roboto">
                  <div className="p-8 pb-4 text-center">
                      <div className="w-10 h-10 mx-auto mb-4">
                          <GoogleIcon className="w-full h-full" />
                      </div>
                      <h2 className="text-2xl font-normal mb-2 text-gray-800">Fazer login</h2>
                      <p className="text-gray-600 mb-6 text-base">Prosseguir para Aether Base</p>
                  </div>

                  <div className="px-8 pb-6 space-y-2">
                      <div 
                        onClick={handleLoginStart}
                        className="flex items-center gap-3 p-3 hover:bg-gray-100 rounded cursor-pointer border-b border-gray-100 transition-colors"
                      >
                           <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold">U</div>
                           <div className="text-left flex-1">
                               <p className="font-medium text-sm text-gray-700">Usuário Aether</p>
                               <p className="text-xs text-gray-500">usuario@exemplo.com</p>
                           </div>
                      </div>
                      <div 
                        onClick={handleLoginStart}
                        className="flex items-center gap-3 p-3 hover:bg-gray-100 rounded cursor-pointer transition-colors"
                      >
                           <div className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500">
                               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                           </div>
                           <p className="font-medium text-sm text-gray-700">Usar outra conta</p>
                      </div>
                  </div>

                  <div className="px-8 py-6 bg-gray-50 flex justify-between items-center text-sm">
                      <button onClick={() => setShowLoginModal(false)} className="text-blue-600 font-medium hover:bg-blue-50 px-2 py-1 rounded">Cancelar</button>
                      <button className="text-blue-600 font-medium hover:bg-blue-50 px-2 py-1 rounded">Ajuda</button>
                  </div>
               </div>
           )}
        </div>
      )}

    </div>
  );
}

export default App;