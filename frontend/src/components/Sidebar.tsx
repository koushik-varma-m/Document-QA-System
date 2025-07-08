import React, { useState, useEffect } from 'react';
import { getChatDocuments } from '../api/api';

interface ChatSession {
  _id: string;
  latest_question: string;
  latest_answer: string;
  latest_timestamp: string;
  message_count: number;
}

interface Document {
  document_id: string;
  filename: string;
  content_type: string;
  uploaded_at: string;
}

interface SidebarProps {
  onNewChat: () => void;
  chats: ChatSession[];
  activeChatId: string | null;
  setActiveChatId: (chatId: string) => void;
  onRefreshChats: () => void;
  onDeleteChat: (chatId: string) => void;
  onClearAllChats: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  userPreferences?: {
    autoScroll: boolean;
    showTimestamps: boolean;
    compactMode: boolean;
  };
  onUpdatePreferences?: (preferences: any) => void;
}

export function Sidebar({ onNewChat, chats, activeChatId, setActiveChatId, onRefreshChats, onDeleteChat, onClearAllChats, collapsed = false, onToggleCollapse, theme = 'light', onToggleTheme, userPreferences, onUpdatePreferences }: SidebarProps) {
  const [chatDocuments, setChatDocuments] = useState<Record<string, Document[]>>({});

  useEffect(() => {
    const loadChatDocuments = async () => {
      const documents: Record<string, Document[]> = {};
      for (const chat of chats) {
        try {
          const response = await getChatDocuments(chat._id);
          documents[chat._id] = response.data.documents;
        } catch (error) {
          documents[chat._id] = [];
        }
      }
      setChatDocuments(documents);
    };

    if (chats.length > 0) {
      loadChatDocuments();
    }
  }, [chats]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const truncateText = (text: string, maxLength: number = 50) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const handleDeleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this chat? This action cannot be undone.')) {
      onDeleteChat(chatId);
    }
  };

  if (collapsed) {
    return (
      <div className="h-full p-2 space-y-2">
        <div className="flex flex-col items-center space-y-2">
          <button
            onClick={onToggleCollapse}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded"
            title="Expand sidebar"
          >
            →
          </button>
          <button
            onClick={onToggleTheme}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded"
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
        
        <div className="space-y-1">
          {chats.map((chat) => (
            <button
              key={chat._id}
              onClick={() => setActiveChatId(chat._id)}
              className={`w-full p-2 rounded text-xs ${
                activeChatId === chat._id 
                  ? 'bg-blue-200 text-blue-800' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={truncateText(chat.latest_question, 30)}
            >
              💬
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-4 space-y-4 overflow-y-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800">Chat History</h2>
        <div className="flex space-x-1">
          <button
            onClick={onToggleCollapse}
            className="px-2 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
            title="Collapse sidebar"
          >
            ←
          </button>
          <button
            onClick={onRefreshChats}
            className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            title="Refresh chats"
          >
            ↻
          </button>
        </div>
      </div>
      
      <div className="flex items-center justify-between p-2 bg-gray-100 rounded">
        <span className="text-sm text-gray-700">Theme:</span>
        <button
          onClick={onToggleTheme}
          className="px-3 py-1 text-sm bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
        >
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
      </div>
      
      <button
        onClick={onNewChat}
        className="w-full px-4 py-2 bg-yellow-400 text-gray-800 font-semibold rounded hover:bg-yellow-500"
      >
        New Chat
      </button>
      
      {chats.length > 0 && (
        <button
          onClick={() => {
            if (window.confirm('Are you sure you want to clear all chats? This action cannot be undone.')) {
              onClearAllChats();
            }
          }}
          className="w-full px-4 py-2 bg-red-500 text-white font-semibold rounded hover:bg-red-600"
        >
          Clear All Chats
        </button>
      )}
      
      <div className="space-y-2">
        {chats.map((chat) => {
          const chatDocs = chatDocuments[chat._id] || [];
          const hasDocument = chatDocs.length > 0;
          
          return (
            <div
              key={chat._id}
              className={`relative rounded-lg border transition-colors ${
                activeChatId === chat._id 
                  ? 'bg-blue-200 border-blue-300' 
                  : 'bg-white border-gray-200 hover:bg-gray-100'
              }`}
            >
              <button
                onClick={() => setActiveChatId(chat._id)}
                className="w-full text-left p-3 pr-12"
              >
                <div className="font-medium text-sm text-gray-900 mb-1">
                  {truncateText(chat.latest_question)}
                </div>
                <div className="text-xs text-gray-600 mb-1">
                  {truncateText(chat.latest_answer)}
                </div>
                
                {hasDocument && (
                  <div className="text-xs text-green-600 mb-1">
                    📄 {chatDocs[0].filename}
                  </div>
                )}
                
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>{formatTimestamp(chat.latest_timestamp)}</span>
                  <span>{chat.message_count} messages</span>
                </div>
              </button>
              
      <button
                onClick={(e) => handleDeleteChat(chat._id, e)}
                className="absolute top-2 right-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded"
                title="Delete chat"
              >
                🗑️
              </button>
            </div>
          );
        })}
      </div>
      
      {chats.length === 0 && (
        <div className="text-center text-gray-500 text-sm py-8">
          No chat history yet. Start a new chat!
        </div>
      )}
    </div>
  );
}