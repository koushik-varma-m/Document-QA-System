import React, { useState, useEffect } from 'react';
import { UploadPane } from './components/UploadPane';
import { ChatWindow } from './components/ChatWindow';
import { Sidebar } from './components/Sidebar';
import { createChat, getChats, getChatMessages, deleteChat, deleteAllChats, getChatThreshold, updateChatThreshold } from './api/api';
import { Message } from './types';

interface ChatSession {
  _id: string;
  latest_question: string;
  latest_answer: string;
  latest_timestamp: string;
  message_count: number;
}

const STORAGE_KEYS = {
  CHATS: 'document_qa_chats',
  ACTIVE_CHAT: 'document_qa_active_chat',
  MESSAGES: 'document_qa_messages_',
  IS_UPLOADED: 'document_qa_is_uploaded',
  SIDEBAR_COLLAPSED: 'document_qa_sidebar_collapsed',
  THEME: 'document_qa_theme',
  THRESHOLD: 'document_qa_threshold',
  USER_PREFERENCES: 'document_qa_user_preferences'
};

function App() {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [chatThresholds, setChatThresholds] = useState<Record<string, number>>({});
  const [userPreferences, setUserPreferences] = useState({
    autoScroll: true,
    showTimestamps: true,
    compactMode: false,
    webSearchEnabled: false,
    webSearchAuto: true
  });

  useEffect(() => {
    // Clean up any invalid localStorage data first
    const cleanupInvalidData = () => {
      try {
        const savedActiveChat = localStorage.getItem(STORAGE_KEYS.ACTIVE_CHAT);
        if (savedActiveChat) {
          try {
            const parsed = JSON.parse(savedActiveChat);
            if (parsed === "null" || parsed === null || parsed === "undefined" || parsed === undefined) {
              localStorage.removeItem(STORAGE_KEYS.ACTIVE_CHAT);
              console.log('Cleaned up invalid activeChatId from localStorage');
            }
          } catch (e) {
            if (savedActiveChat === "null" || savedActiveChat === "undefined") {
              localStorage.removeItem(STORAGE_KEYS.ACTIVE_CHAT);
              console.log('Cleaned up invalid activeChatId string from localStorage');
            }

          }
        }
      } catch (error) {
        console.error('Error cleaning up localStorage:', error);
      }
    };
    
    cleanupInvalidData();
    loadFromLocalStorage();
    loadChats();
  }, []);

  useEffect(() => {
    saveToLocalStorage();
  }, [chats, activeChatId, currentMessages, sidebarCollapsed, theme, chatThresholds, userPreferences]);

  const loadFromLocalStorage = () => {
    try {
      const savedActiveChat = localStorage.getItem(STORAGE_KEYS.ACTIVE_CHAT);
      
      const savedSidebarCollapsed = localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED);
      const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
      const savedUserPreferences = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
      const savedChatThresholds = localStorage.getItem(STORAGE_KEYS.THRESHOLD);
      
      // Clean up invalid activeChatId values
      if (savedActiveChat) {
        try {
          const parsedActiveChat = JSON.parse(savedActiveChat);
          if (parsedActiveChat && parsedActiveChat !== "null" && parsedActiveChat !== null) {
            setActiveChatId(parsedActiveChat);
          } else {
            // Remove invalid activeChatId from localStorage
            localStorage.removeItem(STORAGE_KEYS.ACTIVE_CHAT);
          }
        } catch (parseError) {
          // If it's not valid JSON, check if it's a plain string
          if (savedActiveChat !== "null" && savedActiveChat !== "undefined") {
            setActiveChatId(savedActiveChat);
          } else {
            // Remove invalid activeChatId from localStorage
            localStorage.removeItem(STORAGE_KEYS.ACTIVE_CHAT);
          }
        }
      }
      
      if (savedSidebarCollapsed) {
        setSidebarCollapsed(JSON.parse(savedSidebarCollapsed));
      }
      if (savedTheme) {
        setTheme(JSON.parse(savedTheme));
      }
      if (savedUserPreferences) {
        setUserPreferences(JSON.parse(savedUserPreferences));
      }
      if (savedChatThresholds) {
        setChatThresholds(JSON.parse(savedChatThresholds));
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
  };

  const saveToLocalStorage = () => {
    try {
      if (activeChatId && activeChatId !== "null") {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_CHAT, JSON.stringify(activeChatId));
      } else {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_CHAT);
      }
      localStorage.setItem(STORAGE_KEYS.IS_UPLOADED, JSON.stringify(isUploaded));
      
      localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, JSON.stringify(sidebarCollapsed));
      localStorage.setItem(STORAGE_KEYS.THEME, JSON.stringify(theme));
      localStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(userPreferences));
      localStorage.setItem(STORAGE_KEYS.THRESHOLD, JSON.stringify(chatThresholds));
      
      localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(chats));
      
      if (activeChatId) {
        localStorage.setItem(STORAGE_KEYS.MESSAGES + activeChatId, JSON.stringify(currentMessages));
      }
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };

  const clearAllLocalStorage = async () => {
    try {
      // Delete all chats from the server
      await deleteAllChats();
      
      // Clear localStorage
      Object.values(STORAGE_KEYS).forEach(key => {
        if (key !== STORAGE_KEYS.MESSAGES) {
          localStorage.removeItem(key);
        }
      });
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_KEYS.MESSAGES)) {
          localStorage.removeItem(key);
        }
      }
      
      setChats([]);
      setActiveChatId(null);
      setCurrentMessages([]);
      setSidebarCollapsed(false);
      setTheme('light');
      setChatThresholds({});
      setUserPreferences({
        autoScroll: true,
        showTimestamps: true,
        compactMode: false,
        webSearchEnabled: false,
        webSearchAuto: true
      });
      
      console.log('All chats deleted from server and localStorage data cleared');
    } catch (error) {
      console.error('Error clearing all chats:', error);
      alert('Failed to clear all chats. Please try again.');
    }
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const updateThreshold = async (newThreshold: number) => {
    if (!activeChatId) return;
    
    try {
      await updateChatThreshold(activeChatId, newThreshold);
      
      setChatThresholds(prev => ({
        ...prev,
        [activeChatId]: newThreshold
      }));
      
      console.log(`Threshold updated to ${newThreshold} for chat ${activeChatId}`);
    } catch (error) {
      console.error('Error updating threshold:', error);
    }
  };

  const loadChatThreshold = async (chatId: string) => {
    try {
      const response = await getChatThreshold(chatId);
      const threshold = response.data.threshold;
      
      setChatThresholds(prev => ({
        ...prev,
        [chatId]: threshold
      }));
    } catch (error) {
      console.error('Error loading chat threshold:', error);
      setChatThresholds(prev => ({
        ...prev,
        [chatId]: 0.5
      }));
    }
  };

  const updateUserPreferences = (newPreferences: Partial<typeof userPreferences>) => {
    setUserPreferences(prev => ({ ...prev, ...newPreferences }));
  };

  useEffect(() => {
    // Additional safety check to ensure activeChatId is valid
    if (activeChatId && 
        activeChatId !== "null" && 
        activeChatId !== null && 
        activeChatId !== "undefined" && 
        activeChatId !== undefined &&
        typeof activeChatId === 'string' &&
        activeChatId.trim() !== '') {
      
      loadChatMessages(activeChatId);
      loadChatThreshold(activeChatId); // Load chat-specific threshold
      // Check if this chat has content to determine whether to show upload pane or chat window
      const activeChat = chats.find(chat => chat._id === activeChatId);
      if (activeChat) {
        const hasContent = activeChat.latest_question !== "Chat started" && activeChat.message_count > 1;
        if (hasContent) {
          setIsUploaded(true);
        } else {
          setIsUploaded(false);
        }
      }
    } else {
      // If no valid activeChatId, show upload pane
      setIsUploaded(false);
      // Clear any invalid activeChatId from state
      if (activeChatId) {
        setActiveChatId(null);
      }
    }
  }, [activeChatId, chats]);

  async function loadChats() {
    try {
      const response = await getChats();
      const serverChats = response.data.chats;
      
      // Merge with localStorage data (localStorage takes precedence for UI)
      const localChats = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHATS) || '[]');
      const mergedChats = [...serverChats, ...localChats.filter((localChat: any) => 
        !serverChats.some((serverChat: any) => serverChat._id === localChat._id)
      )];
      
      setChats(mergedChats);
      
      // Don't automatically set isUploaded to true when loading chats
      // Only set it if there are chats with actual content (not just empty placeholders)
      const hasContentChats = mergedChats.some((chat: any) => 
        chat.latest_question !== "Chat started" && chat.message_count > 1
      );
      if (hasContentChats && !isUploaded) {
        setIsUploaded(true);
      }
    } catch (error) {
      console.error('Error loading chats:', error);
    }
  }

  async function loadChatMessages(chatId: string) {
    try {
      // First try to load from localStorage
      const savedMessages = localStorage.getItem(STORAGE_KEYS.MESSAGES + chatId);
      if (savedMessages) {
        setCurrentMessages(JSON.parse(savedMessages));
      }
      
      // Then try to load from server as backup
      const response = await getChatMessages(chatId);
      const allMessages: Message[] = [];
      
      response.data.messages.forEach((msg: any, index: number) => {
        // Generate unique base ID for each message pair (user + assistant)
        const baseId = msg._id || `${Date.now()}_${index}`;
        
        // Add user message
        allMessages.push({
          id: `${baseId}_user`,
          text: msg.question,
          sender: 'user' as const,
          timestamp: msg.timestamp,
          metadata: {
            distance: msg.distance,
            threshold: msg.threshold,
            webSearchUsed: msg.web_search_used,
            webSearchReason: msg.web_search_reason
          }
        });
        
        // Add assistant message
        allMessages.push({
          id: `${baseId}_assistant`,
          text: msg.answer,
          sender: 'assistant' as const,
          timestamp: msg.timestamp,
          metadata: {
            distance: msg.distance,
            threshold: msg.threshold,
            webSearchUsed: msg.web_search_used,
            webSearchReason: msg.web_search_reason
          }
        });
      });
      
      // Use server messages if they exist, otherwise keep localStorage messages
      if (allMessages.length > 0) {
        setCurrentMessages(allMessages);
      }
    } catch (error) {
      console.error('Error loading chat messages:', error);
    }
  }

  async function startNewChat() {
    try {
      // Create a new chat session
      const response = await createChat();
      const newChatId = response.data.chat_id;
      
      // Set the new chat as active
      setActiveChatId(newChatId);
      setCurrentMessages([]);
      
      // Refresh the chat list to show the new chat
      await loadChats();
    } catch (error) {
      console.error('Error creating new chat:', error);
    }
  }

  function handleUpload() {
    // Create initial chat when document is uploaded
    if (!activeChatId) {
      startNewChat();
    }
  }

  function handleNewMessage(msg: Message) {
    setCurrentMessages(prev => [...prev, msg]);
  }

  async function handleDeleteChat(chatId: string) {
    try {
      // Delete from server
      await deleteChat(chatId);
      
      // Delete from localStorage
      const savedChats = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHATS) || '[]');
      const updatedChats = savedChats.filter((chat: any) => chat._id !== chatId);
      localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(updatedChats));
      
      // Remove messages from localStorage
      localStorage.removeItem(STORAGE_KEYS.MESSAGES + chatId);
      
      // If the deleted chat was the active chat, clear the active chat
      if (activeChatId === chatId) {
        setActiveChatId(null);
        setCurrentMessages([]);
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_CHAT);
      }
      
      // Refresh the chat list
      await loadChats();
    } catch (error) {
      console.error('Error deleting chat:', error);
      alert('Failed to delete chat. Please try again.');
    }
  }

  return (
    <div className={`h-screen flex ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}>
      {/* Sidebar - always visible */}
      <div className={`${sidebarCollapsed ? 'w-16' : 'w-80'} flex-shrink-0 bg-gray-50 border-r border-gray-200 transition-all duration-300`}>
      <Sidebar
          onNewChat={startNewChat}
          chats={chats}
          activeChatId={activeChatId}
          setActiveChatId={setActiveChatId}
          onRefreshChats={loadChats}
          onDeleteChat={handleDeleteChat}
          onClearAllChats={clearAllLocalStorage}
          collapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebar}
          theme={theme}
          onToggleTheme={toggleTheme}
          userPreferences={userPreferences}
          onUpdatePreferences={updateUserPreferences}
        />
      </div>
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {!activeChatId ? (
          <UploadPane onUpload={handleUpload} chatId={undefined} />
        ) : (
          <ChatWindow
            session={{
              id: activeChatId,
              messages: currentMessages
            }}
            onNewMessage={handleNewMessage}
            theme={theme}
            userPreferences={userPreferences}
            threshold={chatThresholds[activeChatId || ''] || 0.5}
            onUpdateThreshold={updateThreshold}
            onUpdatePreferences={updateUserPreferences}
          />
        )}
      </div>
    </div>
  );
}

export default App;
