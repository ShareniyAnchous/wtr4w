import { useState, useRef, useEffect, useCallback } from 'react';
import { Message, getAIResponse, analyzeImage, generateId } from './utils/aiEngine';

function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: generateId(),
      role: 'system',
      content: 'Добро пожаловать в **Solar AI** 🌟',
      timestamp: new Date(),
    },
    {
      id: generateId(),
      role: 'assistant',
      content: 'Привет! 👋 Я **Solar** — ваш умный AI-ассистент!\n\n🌟 **Что я умею:**\n• 📐 Решать математические задачи\n• 📸 Анализировать изображения\n• 💬 Отвечать на вопросы\n• 🧮 Работать как калькулятор\n\nНапишите мне что-нибудь или загрузите фотографию!',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
  }, [input]);

  const handleFileDrop = useCallback((file: File) => {
    if (file.type.startsWith('image/')) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileDrop(file);
  }, [handleFileDrop]);

  const handleSend = async () => {
    if (!input.trim() && !selectedFile) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: input.trim(),
      image: previewImage || undefined,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      let response: string;

      if (selectedFile) {
        response = await analyzeImage(selectedFile, currentInput.trim());
      } else {
        await new Promise((r) => setTimeout(r, 600 + Math.random() * 800));
        response = getAIResponse(currentInput);
      }

      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const errorMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: '⚠️ Произошла ошибка при обработке. Попробуйте ещё раз!',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setPreviewImage(null);
      setSelectedFile(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileDrop(file);
  };

  const removePreview = () => {
    setPreviewImage(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const quickActions = [
    { icon: '📐', label: 'Математика', text: 'Реши 25 * 4 + 13' },
    { icon: '🧮', label: 'Калькулятор', text: 'sqrt(144) + 5^2' },
    { icon: '🌟', label: 'Привет', text: 'Привет, Solar!' },
    { icon: '❓', label: 'Помощь', text: 'Что ты умеешь?' },
    { icon: '😄', label: 'Шутка', text: 'Расскажи шутку' },
    { icon: '🌌', label: 'Космос', text: 'Расскажи о космосе' },
  ];

  const formatContent = (content: string) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-amber-300">$1</strong>')
      .replace(/\n/g, '<br/>')
      .replace(/• /g, '<span class="text-amber-400">•</span> ');
  };

  return (
    <div
      className="flex h-screen bg-gray-950 text-white overflow-hidden bg-pattern"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragOver && (
        <div className="fixed inset-0 z-[100] bg-gray-950/90 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="text-center animate-fadeIn">
            <div className="w-24 h-24 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-2xl shadow-orange-500/30">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-xl font-semibold text-white">Перетащите изображение сюда</p>
            <p className="text-sm text-gray-400 mt-1">Solar проанализирует его для вас</p>
          </div>
        </div>
      )}

      {/* Mobile sidebar overlay */}
      {showSidebar && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-gray-900/95 backdrop-blur-xl border-r border-gray-800/50 flex flex-col transform transition-transform duration-300 ease-out ${
          showSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="p-5 border-b border-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/25 relative overflow-hidden">
              <img src="https://image.qwenlm.ai/generated-images/d0634772-cc9c-4438-a458-df56fb54a039/_result.png" alt="Solar AI" className="w-full h-full object-cover" />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-400/20 via-transparent to-transparent"></div>
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-amber-300 via-orange-400 to-amber-300 bg-clip-text text-transparent">
                Solar AI
              </h1>
              <p className="text-[11px] text-gray-500 font-medium">Умный ассистент v1.0</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-4 flex-1 overflow-y-auto">
          <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-3 px-2">
            Быстрые команды
          </h3>
          <div className="space-y-1.5">
            {quickActions.map((action, i) => (
              <button
                key={i}
                onClick={() => {
                  setInput(action.text);
                  setShowSidebar(false);
                  textareaRef.current?.focus();
                }}
                className="w-full text-left px-3 py-2.5 rounded-xl bg-gray-800/30 hover:bg-gray-800/70 border border-gray-700/30 hover:border-amber-500/20 transition-all duration-200 text-sm text-gray-300 hover:text-white flex items-center gap-3 group"
              >
                <span className="text-base group-hover:scale-110 transition-transform">{action.icon}</span>
                <span className="font-medium">{action.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-6">
            <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-3 px-2">
              Возможности
            </h3>
            <div className="space-y-2.5 px-2">
              {[
                { icon: '📐', label: 'Математика', color: 'bg-blue-500/10 text-blue-400' },
                { icon: '📸', label: 'Анализ фото', color: 'bg-purple-500/10 text-purple-400' },
                { icon: '💬', label: 'Диалог', color: 'bg-green-500/10 text-green-400' },
                { icon: '🧮', label: 'Калькулятор', color: 'bg-amber-500/10 text-amber-400' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-gray-400">
                  <span className={`w-8 h-8 rounded-lg ${item.color} flex items-center justify-center text-sm`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 p-3 rounded-xl bg-gradient-to-r from-amber-500/5 to-orange-500/5 border border-amber-500/10">
            <p className="text-xs text-gray-400 leading-relaxed">
              💡 <span className="text-amber-400/80">Совет:</span> Перетащите изображение в чат для быстрого анализа!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800/50">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span>Solar AI • Готов к работе</span>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 border-b border-gray-800/50 bg-gray-900/50 backdrop-blur-xl flex items-center px-4 gap-4 shrink-0">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-md shadow-orange-500/20">
              <span className="text-sm">☀️</span>
            </div>
            <div>
              <h2 className="font-semibold text-sm leading-tight">Solar AI</h2>
              <p className="text-[11px] text-green-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                Онлайн
              </p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => {
                setMessages([
                  {
                    id: generateId(),
                    role: 'assistant',
                    content: 'Чат очищен! 🧹 Чем могу помочь?',
                    timestamp: new Date(),
                  },
                ]);
              }}
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
              title="Очистить чат"
            >
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center mr-2 mt-1 shrink-0 shadow-sm">
                    <span className="text-xs">☀️</span>
                  </div>
                )}
                <div
                  className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/15 rounded-br-md'
                      : msg.role === 'system'
                      ? 'bg-gray-800/30 border border-gray-700/30 text-gray-400 text-center w-full max-w-sm mx-auto text-xs py-2'
                      : 'bg-gray-800/60 border border-gray-700/30 text-gray-200 rounded-bl-md'
                  }`}
                >
                  {msg.image && (
                    <div className="mb-2 rounded-xl overflow-hidden border border-gray-700/30">
                      <img
                        src={msg.image}
                        alt="Uploaded"
                        className="max-w-full max-h-48 object-contain rounded-xl bg-gray-900/50"
                      />
                    </div>
                  )}
                  <div
                    className="text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }}
                  />
                  <div
                    className={`text-[10px] mt-1.5 ${
                      msg.role === 'user' ? 'text-amber-200/50' : 'text-gray-600'
                    }`}
                  >
                    {msg.timestamp.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-gray-700 flex items-center justify-center ml-2 mt-1 shrink-0">
                    <span className="text-xs">👤</span>
                  </div>
                )}
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start animate-fadeIn">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center mr-2 mt-1 shrink-0">
                  <span className="text-xs">☀️</span>
                </div>
                <div className="bg-gray-800/60 border border-gray-700/30 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className="text-xs text-gray-500">Solar думает...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Image Preview */}
        {previewImage && (
          <div className="px-4 pb-2">
            <div className="max-w-3xl mx-auto">
              <div className="relative inline-flex items-center gap-3 bg-gray-800/60 rounded-xl p-2.5 border border-gray-700/30">
                <img src={previewImage} alt="Preview" className="h-16 w-16 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-300 font-medium truncate">{selectedFile?.name}</p>
                  <p className="text-[10px] text-gray-500">
                    {selectedFile ? (selectedFile.size / 1024).toFixed(1) + ' КБ' : ''}
                  </p>
                  <p className="text-[10px] text-amber-400/70 mt-0.5">Готово к отправке</p>
                </div>
                <button
                  onClick={removePreview}
                  className="w-6 h-6 bg-red-500/20 hover:bg-red-500/40 rounded-full flex items-center justify-center text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-gray-800/50 bg-gray-900/50 backdrop-blur-xl p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2">
              {/* File upload button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="shrink-0 p-2.5 rounded-xl bg-gray-800/50 border border-gray-700/30 hover:border-amber-500/30 hover:bg-gray-800 transition-all duration-200 text-gray-400 hover:text-amber-400 group"
                title="Загрузить изображение"
              >
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Text input */}
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Напишите сообщение или загрузите фото..."
                  rows={1}
                  className="w-full bg-gray-800/50 border border-gray-700/30 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/10 resize-none transition-all duration-200"
                />
              </div>

              {/* Send button */}
              <button
                onClick={handleSend}
                disabled={isLoading || (!input.trim() && !selectedFile)}
                className="shrink-0 p-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-orange-500/15 hover:shadow-orange-500/30 disabled:shadow-none active:scale-95"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <p className="text-center text-[10px] text-gray-600 mt-2">
              Enter — отправить • Shift+Enter — новая строка • Перетащите фото в чат
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
