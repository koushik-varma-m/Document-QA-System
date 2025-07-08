export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  metadata?: {
    distance?: number;
    threshold?: number;
    webSearchUsed?: boolean;
    webSearchReason?: string;
  };
} 