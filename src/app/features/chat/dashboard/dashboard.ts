import { Component, afterNextRender, inject, signal } from '@angular/core';

import { ProjectService, Project } from '../../../core/services/project.service';
import { Chat, ChatMessage, ChatService } from '../../../core/services/chat';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  private readonly chatService = inject(ChatService);
  private readonly projectService = inject(ProjectService);

  // =========================
  // Projects
  // =========================

  readonly projects = signal<Project[]>([]);
  readonly selectedProject = signal<Project | null>(null);

  readonly loadingProjects = signal(false);
  readonly creatingProject = signal(false);

  // =========================
  // Chats
  // =========================

  readonly chats = signal<Chat[]>([]);
  readonly selectedChat = signal<Chat | null>(null);

  readonly loadingChats = signal(false);
  readonly creatingChat = signal(false);
  readonly deletingChat = signal(false);

  // =========================
  // Messages
  // =========================

  readonly messages = signal<ChatMessage[]>([]);

  readonly loadingMessages = signal(false);
  readonly sendingMessage = signal(false);

  readonly messageInput = signal('');

  // =========================
  // Initial load
  // =========================

  constructor() {
    afterNextRender(() => {
      this.loadProjects();
      this.loadChats();
    });
  }

  // =========================
  // Projects
  // =========================

  loadProjects(): void {
    this.loadingProjects.set(true);

    this.projectService.getProjects().subscribe({
      next: (projects) => {
        this.projects.set(projects);
        this.loadingProjects.set(false);
      },

      error: (error) => {
        console.error('Failed to load projects', error);

        this.loadingProjects.set(false);
      },
    });
  }

  selectProject(project: Project): void {
    this.selectedProject.set(project);
  }

  createProject(): void {
    if (this.creatingProject()) {
      return;
    }

    const name = window.prompt('Project name');

    if (!name?.trim()) {
      return;
    }

    this.creatingProject.set(true);

    this.projectService.createProject(name.trim()).subscribe({
      next: (project) => {
        this.projects.update((projects) => [project, ...projects]);

        this.selectedProject.set(project);

        this.creatingProject.set(false);
      },

      error: (error) => {
        console.error('Failed to create project', error);

        this.creatingProject.set(false);
      },
    });
  }

  // =========================
  // Chats
  // =========================

  loadChats(): void {
    this.loadingChats.set(true);

    this.chatService.getChats().subscribe({
      next: (chats) => {
        this.chats.set(chats);
        this.loadingChats.set(false);
      },

      error: (error) => {
        console.error('Failed to load chats', error);

        this.loadingChats.set(false);
      },
    });
  }

  selectChat(chat: Chat): void {
    this.selectedChat.set(chat);

    this.loadMessages(chat.id);
  }

  loadMessages(chatId: string): void {
    this.loadingMessages.set(true);

    this.messages.set([]);

    this.chatService.getMessages(chatId).subscribe({
      next: (messages) => {
        this.messages.set(messages);
        this.loadingMessages.set(false);
      },

      error: (error) => {
        console.error('Failed to load messages', error);

        this.loadingMessages.set(false);
      },
    });
  }

  // =========================
  // Message input
  // =========================

  updateMessageInput(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;

    this.messageInput.set(textarea.value);
  }

  // =========================
  // Send message
  // =========================

  sendMessage(): void {
    const content = this.messageInput().trim();

    if (!content) {
      return;
    }

    if (this.sendingMessage()) {
      return;
    }

    const chat = this.selectedChat();

    if (!chat) {
      this.sendFirstMessage(content);
      return;
    }

    this.sendToExistingChat(chat.id, content);
  }

  private sendFirstMessage(content: string): void {
    this.sendingMessage.set(true);
    this.messageInput.set('');

    this.chatService.createChatWithMessage(content).subscribe({
      next: (response) => {
        const chat: Chat = {
          id: response.chat_id,
          title: response.title,
        };

        // Add newly created chat to sidebar
        this.chats.update((chats) => [chat, ...chats]);

        // Open the newly created chat
        this.selectedChat.set(chat);

        // Now synchronize messages from backend
        this.loadMessages(chat.id);

        this.sendingMessage.set(false);
      },

      error: (error) => {
        console.error('Failed to create chat', error);

        this.sendingMessage.set(false);
      },
    });
  }

  startNewChat(): void {
    this.selectedChat.set(null);
    this.messages.set([]);
    this.messageInput.set('');
  }

  private sendToExistingChat(chatId: string, content: string): void {
    this.sendingMessage.set(true);
    this.messageInput.set('');

    // Optimistic user message append immediately
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
    };

    this.messages.update((messages) => [...messages, userMessage]);

    this.chatService.sendMessage(chatId, content).subscribe({
      next: (response:any) => {
        // Append the assistant response as well
        if (response && response.message) {
              this.messages.update((messages) => [...messages, {
            "id": Math.random().toString(),
            "content": response.message,
            "role": "assistant"
          }]);
        
        } else if (response) {
          // In case the backend returns the message directly or in another format
          this.messages.update((messages) => [...messages, response as unknown as ChatMessage]);
        }

        this.sendingMessage.set(false);
      },

      error: (error) => {
        console.error('Failed to send message', error);

        // Optionally revert or reload messages on error, but keep it smooth
        this.loadMessages(chatId);

        this.sendingMessage.set(false);
      },
    });
  }

  // =========================
  // Keyboard
  // =========================

  handleComposerKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();

      this.sendMessage();
    }
  }

  // =========================
  // Delete chat
  // =========================

  deleteChat(chat: Chat): void {
    if (this.deletingChat()) {
      return;
    }

    const confirmed = window.confirm('Delete this conversation?');

    if (!confirmed) {
      return;
    }

    this.deletingChat.set(true);

    this.chatService.deleteChat(chat.id).subscribe({
      next: () => {
        this.chats.update((chats) => chats.filter((item) => item.id !== chat.id));

        if (this.selectedChat()?.id === chat.id) {
          this.selectedChat.set(null);
          this.messages.set([]);
        }

        this.deletingChat.set(false);
      },

      error: (error) => {
        console.error('Failed to delete chat', error);

        this.deletingChat.set(false);
      },
    });
  }
}
