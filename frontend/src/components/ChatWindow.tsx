import React, { useState, useEffect, useRef } from 'react';
import { queryDocument } from '../api/api';
import { Message } from '../types';

interface ChatWindowProps {
  session: { id: string | null; messages: Message[] };
  onNewMessage: (msg: Message) => void;
  theme?: 'light' | 'dark';
  userPreferences?: {
    autoScroll: boolean;
    showTimestamps: boolean;
    compactMode: boolean;
    webSearchEnabled: boolean;
    webSearchAuto: boolean;
  };
  threshold?: number;
  onUpdateThreshold?: (threshold: number) => void;
  onUpdatePreferences?: (preferences: any) => void;
}

export function ChatWindow({ session, onNewMessage, theme = 'light', userPreferences, threshold = 0.5, onUpdateThreshold, onUpdatePreferences }: ChatWindowProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (userPreferences?.autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); 
    }
  }, [session.messages, userPreferences?.autoScroll]);

  const sendMessage = async () => {
    if (!input.trim() || !session.id) return;

    const timestamp = Date.now();
    const userMessage: Message = {
      id: `${timestamp}_user`,
      text: input,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };

    onNewMessage(userMessage);
    setInput('');

    try {
      setLoading(true);
      
      let useWebSearch = userPreferences?.webSearchEnabled || false;
      
      if (userPreferences?.webSearchEnabled && userPreferences?.webSearchAuto) {
        const question = input.toLowerCase();
        const needsWebSearch = 
          question.includes('latest') || 
          question.includes('current') || 
          question.includes('recent') || 
          question.includes('today') || 
          question.includes('now') ||
          question.includes('update') ||
          question.includes('news') ||
          question.includes('2024') ||
          question.includes('2025');
        
        useWebSearch = needsWebSearch;
      }

      const response = await queryDocument(input, session.id, threshold, useWebSearch);
      
      const assistantMessage: Message = {
        id: `${timestamp}_assistant`,
        text: response.data.answer,
        sender: 'assistant',
        timestamp: new Date().toISOString(),
        metadata: {
          distance: response.data.debug_dist,
          threshold: response.data.threshold,
          webSearchUsed: response.data.web_search_used,
          webSearchReason: response.data.web_search_reason
        }
      };

      onNewMessage(assistantMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: `${timestamp}_error`,
        text: 'Sorry, I encountered an error. Please try again.',
        sender: 'assistant',
        timestamp: new Date().toISOString(),
      };
      onNewMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const bgColor = theme === 'dark' ? 'bg-gray-800' : 'bg-white';
  const textColor = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const borderColor = theme === 'dark' ? 'border-gray-600' : 'border-gray-200';

  return (
    <div className={`flex-1 flex flex-col ${bgColor} rounded-xl shadow-md p-6 space-y-4`}>
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <h2 className={`text-xl font-semibold ${textColor}`}>Chat</h2>
          <span className={`text-xs px-2 py-1 rounded ${theme === 'dark' ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
            Threshold: {threshold}
          </span>
          {userPreferences?.webSearchEnabled && (
            <span className={`text-xs px-2 py-1 rounded ${theme === 'dark' ? 'bg-green-600 text-green-200' : 'bg-green-100 text-green-800'}`}>
              🌐 Web Search {userPreferences?.webSearchAuto ? '(Auto)' : '(Manual)'}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          ⚙️ Settings
        </button>
      </div>

      {showSettings && (
        <div className={`p-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg space-y-3`}>
          <div className="flex items-center gap-4 mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                AI Threshold:
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={threshold || 0.5}
                onChange={(e) => onUpdateThreshold?.(parseFloat(e.target.value))}
                className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400 w-8">
                {threshold?.toFixed(1) || '0.5'}
              </span>
            </div>
            
            <div className="flex items-center gap-4 ml-4 pl-4 border-l border-gray-300 dark:border-gray-600">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="webSearchEnabled"
                  checked={userPreferences?.webSearchEnabled || false}
                  onChange={(e) => onUpdatePreferences?.({
                    ...userPreferences,
                    webSearchEnabled: e.target.checked
                  })}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <label htmlFor="webSearchEnabled" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Web Search
                </label>
              </div>
              
              {userPreferences?.webSearchEnabled && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="webSearchAuto"
                    checked={userPreferences?.webSearchAuto || false}
                    onChange={(e) => onUpdatePreferences?.({
                      ...userPreferences,
                      webSearchAuto: e.target.checked
                    })}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <label htmlFor="webSearchAuto" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Auto
                  </label>
                </div>
              )}
            </div>
          </div>
          
          <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Lower = More strict (fewer answers), Higher = More lenient (more answers)
          </div>
          
          {userPreferences?.webSearchEnabled && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">🌐 Web Search Cost Control</h4>
              <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                <p>• <strong>No separate API cost</strong> - uses your existing OpenAI quota</p>
                <p>• <strong>Increased token usage</strong> - web searches add ~500-1000 tokens per query</p>
                <p>• <strong>Auto mode</strong> - automatically enables for current/recent questions</p>
                <p>• <strong>Manual mode</strong> - only when explicitly enabled</p>
                <p>• <strong>Smart fallback</strong> - only when document similarity is low</p>
                <p>• <strong>Cost protection</strong> - skips web search for irrelevant queries</p>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <span className={`text-sm ${textColor}`}>Auto-scroll:</span>
            <input
              type="checkbox"
              checked={userPreferences?.autoScroll}
              onChange={(e) => userPreferences && onUpdatePreferences?.({ autoScroll: e.target.checked })}
              className="ml-2"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <span className={`text-sm ${textColor}`}>Show timestamps:</span>
            <input
              type="checkbox"
              checked={userPreferences?.showTimestamps}
              onChange={(e) => userPreferences && onUpdatePreferences?.({ showTimestamps: e.target.checked })}
              className="ml-2"
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto space-y-4">
        {session.messages.length === 0 ? (
          <div className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            No messages yet. Start a conversation!
          </div>
        ) : (
          session.messages.map((message, index) => {
            // Debug logging
            console.log('Message text:', message.text, 'Type:', typeof message.text);
            
            return (
              <div
                key={message.id || index}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.sender === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                  }`}
                >
                  <div className="text-sm">
                    {message.text}
                  </div>
                  
                  {/* Show metadata for assistant messages */}
                  {message.sender === 'assistant' && message.metadata && (
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                      {message.metadata.webSearchUsed && (
                        <div className="flex items-center gap-1">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            🌐 Web Search Used
                          </span>
                          {message.metadata.webSearchReason && (
                            <span className="text-gray-400">({message.metadata.webSearchReason})</span>
                          )}
                        </div>
                      )}
                      {!message.metadata.webSearchUsed && message.metadata.webSearchReason && (
                        <div className="flex items-center gap-1">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                            ⚠️ Web Search Skipped
                          </span>
                          <span className="text-gray-400">({message.metadata.webSearchReason})</span>
                        </div>
                      )}
                      {message.metadata.distance !== undefined && (
                        <div>Similarity: {(1 - message.metadata.distance).toFixed(3)}</div>
                      )}
                      {message.metadata.threshold !== undefined && (
                        <div>Threshold: {message.metadata.threshold.toFixed(1)}</div>
                      )}
                    </div>
                  )}
                  
                  {userPreferences?.showTimestamps && (
                    <div className={`text-xs mt-1 ${
                      message.sender === 'user' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      
      <div className="flex">
        <input
          className={`flex-1 px-4 py-2 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${borderColor} ${theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'}`}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' ? sendMessage() : null}
          placeholder="Type your question..."
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          className={`px-6 py-2 font-semibold rounded-r-lg ${
            loading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-green-500 hover:bg-green-600'
          } text-white`}
        >
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
}

