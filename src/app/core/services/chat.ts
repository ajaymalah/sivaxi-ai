import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Chat {
  id: string;
  title: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: any;
}

export interface CreateChatResponse {
  chat_id: string;
  title: string;
  message: {
    type: string;
    content: Array<{
      type: string;
      text: string;
      extras?: {
        signature?: string;
      };
    }>;
  };
}

export interface SendMessageResponse {
  message: ChatMessage;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  private readonly http = inject(HttpClient);

  private readonly API_URL = 'http://localhost:8000';

  // Existing chats
  getChats(): Observable<Chat[]> {
    return this.http.get<Chat[]>(
      `${this.API_URL}/chat`
    );
  }

  // First message of a NEW chat
  createChatWithMessage(
    content: string
  ): Observable<CreateChatResponse> {

    return this.http.post<CreateChatResponse>(
      `${this.API_URL}/chat`,
      {
        message: content
      }
    );
  }

  // Existing chat messages
  getMessages(
    chatId: string
  ): Observable<ChatMessage[]> {

    return this.http.get<ChatMessage[]>(
      `${this.API_URL}/chat/${chatId}/messages`
    );
  }

  // Message inside an EXISTING chat
  sendMessage(
    chatId: string,
    content: string
  ): Observable<ChatMessage> {

    return this.http.post<ChatMessage>(
      `${this.API_URL}/chat/${chatId}/messages`,
      {
        message: content
      }
    );
  }

  getChat(
    chatId: string
  ): Observable<Chat> {

    return this.http.get<Chat>(
      `${this.API_URL}/chat/${chatId}`
    );
  }

  renameChat(
    chatId: string,
    title: string
  ): Observable<Chat> {

    return this.http.patch<Chat>(
      `${this.API_URL}/chat/${chatId}`,
      { title }
    );
  }

  deleteChat(
    chatId: string
  ): Observable<void> {

    return this.http.delete<void>(
      `${this.API_URL}/chat/${chatId}`
    );
  }
}