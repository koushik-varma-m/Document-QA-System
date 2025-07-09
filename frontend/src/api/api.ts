import axios from 'axios';
import { BACKEND_URL } from '../config/config';

const BASE_URL = BACKEND_URL;

export async function uploadDocument(file: File, chatId?: string) {
  const formData = new FormData();
  formData.append('file', file);
  
  const url = chatId 
    ? `${BASE_URL}/upload/?chat_id=${chatId}`
    : `${BASE_URL}/upload/`;
    
  return axios.post(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
}

export async function queryDocument(question: string, chatId?: string, threshold?: number, useWebSearch?: boolean) {
  const payload: any = { question };
  if (chatId) payload.chat_id = chatId;
  
  const thresholdValue = threshold || 0.5; // Default to 0.5 if not provided
  const webSearchParam = useWebSearch ? '&use_web_search=true' : '';
  
  return axios.post(`${BASE_URL}/query/?threshold=${thresholdValue}${webSearchParam}`, payload);
}

export async function createChat() {
  return axios.post(`${BASE_URL}/chats/`);
}

export async function getChats() {
  return axios.get(`${BASE_URL}/chats/`);
}

export async function getChatMessages(chatId: string) {
  return axios.get(`${BASE_URL}/chats/${chatId}/messages`);
}

export async function deleteChat(chatId: string) {
  return axios.delete(`${BASE_URL}/chats/${chatId}`);
}

export async function deleteAllChats() {
  return axios.delete(`${BASE_URL}/chats/all`);
}

export async function getChatDocuments(chatId: string) {
  return axios.get(`${BASE_URL}/chats/${chatId}/documents`);
}

export async function getAllDocuments() {
  return axios.get(`${BASE_URL}/documents/`);
}

export async function getChatThreshold(chatId: string) {
  return axios.get(`${BASE_URL}/chats/${chatId}/threshold`);
}

export async function updateChatThreshold(chatId: string, threshold: number) {
  return axios.post(`${BASE_URL}/chats/${chatId}/threshold`, { threshold });
}