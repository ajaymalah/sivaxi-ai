
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Chat {
  id: string;
  project_id: string | null;
  title: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ChatMessage {
  id: string;
  chat_id?: string;
  role: 'user' | 'assistant';
  content: any;
  created_at?: string;
}

export interface CreateChatResponse {
  chat_id: string;
  title: string;
  message: {
    type: string;
    content: any;
  };
}

export interface MessageResponse {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant';
  content: any;
  created_at: string;
}

export interface SendMessageResponse {
  chat_id: string;
  message: MessageResponse;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  private readonly http = inject(HttpClient);

  private readonly API_URL = 'http://localhost:8000';

  getChats(projectId?: string | null): Observable<Chat[]> {

    let params = new HttpParams();

    if (projectId) {
      params = params.set('project_id', projectId);
    }

    return this.http.get<Chat[]>(
      `${this.API_URL}/chat`,
      { params }
    );
  }

  createChatWithMessage(
    content: string,
    projectId: string | null = null
  ): Observable<CreateChatResponse> {

    return this.http.post<CreateChatResponse>(
      `${this.API_URL}/chat`,
      {
        message: content,
        project_id: projectId
      }
    );
  }

  getMessages(chatId: string): Observable<ChatMessage[]> {

    return this.http.get<ChatMessage[]>(
      `${this.API_URL}/chat/${chatId}/messages`
    );
  }

  sendMessage(
    chatId: string,
    content: string
  ): Observable<SendMessageResponse> {

    return this.http.post<SendMessageResponse>(
      `${this.API_URL}/chat/${chatId}/messages`,
      {
        message: content
      }
    );
  }

  getChat(chatId: string): Observable<Chat> {

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

  deleteChat(chatId: string): Observable<void> {

    return this.http.delete<void>(
      `${this.API_URL}/chat/${chatId}`
    );
  }
}

