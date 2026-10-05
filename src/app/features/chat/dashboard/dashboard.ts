import {
  Component,
  afterNextRender,
  inject,
  signal
} from '@angular/core';

import {
  Project,
  ProjectService
} from '../../../core/services/project.service';

import {
  Chat,
  ChatMessage,
  ChatService
} from '../../../core/services/chat';
import { MarkdownRendererService } from '../../../core/services/markdown-renderer.service.ts';

interface ProjectChats {
  [projectId: string]: Chat[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard {

  private readonly chatService = inject(ChatService);
  private readonly projectService = inject(ProjectService);
  private readonly markdownRenderer = inject(MarkdownRendererService);

  // ============================================================
  // Projects
  // ============================================================

  readonly projects = signal<Project[]>([]);
  readonly selectedProject = signal<Project | null>(null);

  readonly expandedProjects = signal<Set<string>>(new Set());

  readonly projectChats = signal<ProjectChats>({});

  readonly loadingProjects = signal(false);
  readonly loadingProjectChats = signal<Set<string>>(new Set());

  readonly creatingProject = signal(false);

  // ============================================================
  // Normal / General Chats
  // ============================================================

  readonly normalChats = signal<Chat[]>([]);
  readonly loadingNormalChats = signal(false);

  // ============================================================
  // Selected Chat
  // ============================================================

  readonly selectedChat = signal<Chat | null>(null);

  readonly loadingMessages = signal(false);
  readonly deletingChat = signal(false);

  readonly messages = signal<ChatMessage[]>([]);

  // ============================================================
  // Composer
  // ============================================================

  readonly sendingMessage = signal(false);
  readonly messageInput = signal('');

  // ============================================================
  // Sidebar
  // ============================================================

  readonly sidebarOpen = signal(true);

  // ============================================================
  // Initial Load
  // ============================================================

  constructor() {
    afterNextRender(() => {
      this.loadProjects();
      this.loadNormalChats();
    });
  }

  // ============================================================
  // Projects
  // ============================================================

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
      }
    });
  }

  toggleProject(project: Project): void {
    const projectId = project.id;

    const next = new Set(this.expandedProjects());

    // Collapse: don't touch the current selection.
    if (next.has(projectId)) {
      next.delete(projectId);
      this.expandedProjects.set(next);
      return;
    }

    // Expand + select the project and open its first chat.
    next.add(projectId);
    this.expandedProjects.set(next);

    this.openProject(project);
  }

  selectProject(project: Project): void {
    this.openProject(project);
  }

  isProjectExpanded(projectId: string): boolean {
    return this.expandedProjects().has(projectId);
  }

  /**
   * Selects a project and opens its first chat.
   * If the project has no chats, the empty "new chat" state is shown.
   */
  private openProject(project: Project): void {
    this.selectedProject.set(project);
    this.selectedChat.set(null);
    this.messages.set([]);
    this.messageInput.set('');

    this.loadProjectChats(project, true);
  }

  private selectFirstChat(project: Project, chats: Chat[]): void {
    // Ignore if the user moved elsewhere while chats were loading.
    if (this.selectedProject()?.id !== project.id || this.selectedChat()) {
      return;
    }

    const first = chats[0];

    if (first) {
      this.selectedChat.set(first);
      this.loadMessages(first.id);
    }
  }

  // ============================================================
  // Project Chats
  // ============================================================

  loadProjectChats(project: Project, autoSelectFirst = false): void {
    const projectId = project.id;

    // Already loaded: use the cache.
    const cached = this.projectChats()[projectId];

    if (cached) {
      if (autoSelectFirst) {
        this.selectFirstChat(project, cached);
      }
      return;
    }

    // Already loading: don't fire a duplicate request.
    if (this.loadingProjectChats().has(projectId)) {
      return;
    }

    this.loadingProjectChats.update((ids) => new Set(ids).add(projectId));

    this.chatService.getChats(projectId).subscribe({
      next: (chats) => {
        this.projectChats.update((current) => ({
          ...current,
          [projectId]: chats
        }));

        this.loadingProjectChats.update((ids) => {
          const next = new Set(ids);
          next.delete(projectId);
          return next;
        });

        if (autoSelectFirst) {
          this.selectFirstChat(project, chats);
        }
      },

      error: (error) => {
        console.error(
          `Failed to load chats for project ${projectId}`,
          error
        );

        this.loadingProjectChats.update((ids) => {
          const next = new Set(ids);
          next.delete(projectId);
          return next;
        });
      }
    });
  }

  isLoadingProjectChats(projectId: string): boolean {
    return this.loadingProjectChats().has(projectId);
  }

  getProjectChats(projectId: string): Chat[] {
    return this.projectChats()[projectId] ?? [];
  }

  // ============================================================
  // Normal Chats
  // ============================================================

  loadNormalChats(): void {
    this.loadingNormalChats.set(true);

    /*
     * Backend returns all chats when project_id is omitted.
     *
     * We intentionally filter here so only:
     *
     *     project_id === null
     *
     * appear inside the global "Chats" section.
     *
     * Therefore project chats can never be duplicated here.
     */

    this.chatService.getChats().subscribe({
      next: (chats) => {
        const normalChats = chats.filter(
          chat => chat.project_id === null
        );

        this.normalChats.set(normalChats);
        this.loadingNormalChats.set(false);
      },

      error: (error) => {
        console.error('Failed to load normal chats', error);
        this.loadingNormalChats.set(false);
      }
    });
  }

  startGeneralChat(): void {
    this.selectedProject.set(null);
    this.selectedChat.set(null);

    this.messages.set([]);
    this.messageInput.set('');
  }

  selectNormalChat(chat: Chat): void {
    this.selectedProject.set(null);
    this.selectedChat.set(chat);

    this.loadMessages(chat.id);
  }

  // ============================================================
  // Start Project Chat
  // ============================================================

  startProjectChat(project: Project): void {
    /*
     * Important:
     *
     * We do NOT clear selectedProject here.
     * The new conversation belongs to this project.
     *
     * We call loadProjectChats WITHOUT autoSelectFirst so the user
     * gets a blank conversation instead of jumping to the first chat.
     */

    this.selectedProject.set(project);
    this.selectedChat.set(null);

    this.messages.set([]);
    this.messageInput.set('');

    const expanded = this.expandedProjects();

    if (!expanded.has(project.id)) {
      const next = new Set(expanded);

      next.add(project.id);

      this.expandedProjects.set(next);
    }

    this.loadProjectChats(project);
  }

  // ============================================================
  // Chat Selection
  // ============================================================

  selectChat(chat: Chat, project: Project): void {
    this.selectedProject.set(project);
    this.selectedChat.set(chat);

    this.loadMessages(chat.id);
  }

  // ============================================================
  // Messages
  // ============================================================

  loadMessages(chatId: string): void {
    this.loadingMessages.set(true);
    this.messages.set([]);

    this.chatService.getMessages(chatId).subscribe({
      next: (messages) => {
        // Ignore stale responses if the user switched chats meanwhile.
        if (this.selectedChat()?.id !== chatId) {
          return;
        }

        this.messages.set(messages);
        this.loadingMessages.set(false);
      },

      error: (error) => {
        console.error('Failed to load messages', error);
        this.loadingMessages.set(false);
      }
    });
  }

  // ============================================================
  // Composer
  // ============================================================

  updateMessageInput(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;

    this.messageInput.set(textarea.value);
  }

  handleComposerKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();

      this.sendMessage();
    }
  }

  sendMessage(): void {
    const content = this.messageInput().trim();

    if (!content) {
      return;
    }

    if (this.sendingMessage()) {
      return;
    }

    const chat = this.selectedChat();

    /*
     * No existing chat means this is the first message.
     *
     * selectedProject != null → project chat
     * selectedProject == null → normal chat
     */

    if (!chat) {
      this.createFirstChat(content);
      return;
    }

    this.sendToExistingChat(chat.id, content);
  }

  // ============================================================
  // Create First Chat
  // ============================================================

  private createFirstChat(content: string): void {
    this.sendingMessage.set(true);
    this.messageInput.set('');

    const projectId = this.selectedProject()?.id ?? null;

    this.chatService
      .createChatWithMessage(content, projectId)
      .subscribe({

        next: (response) => {

          const chat: Chat = {
            id: response.chat_id,
            project_id: projectId,
            title: response.title
          };

          this.selectedChat.set(chat);

          // Project chat
          if (projectId) {
            this.projectChats.update((current) => {
              const existing = current[projectId] ?? [];

              return {
                ...current,
                [projectId]: [chat, ...existing]
              };
            });
          }

          // Normal chat
          else {
            this.normalChats.update((chats) => [
              chat,
              ...chats
            ]);
          }

          this.loadMessages(chat.id);

          this.sendingMessage.set(false);
        },

        error: (error) => {
          console.error('Failed to create chat', error);

          this.sendingMessage.set(false);
        }
      });
  }

  // ============================================================
  // Existing Chat Message
  // ============================================================

  private sendToExistingChat(
    chatId: string,
    content: string
  ): void {

    this.sendingMessage.set(true);
    this.messageInput.set('');

    /*
     * Optimistic user message so it appears immediately
     * without waiting for the backend response.
     */
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      chat_id: chatId,
      role: 'user',
      content: {
        type: 'text',
        content
      }
    };

    this.messages.update((messages) => [
      ...messages,
      userMessage
    ]);

    this.chatService
      .sendMessage(chatId, content)
      .subscribe({

        next: (response) => {

          /*
           * The backend returns the persisted MessageResponse.
           * Use it directly instead of creating a local fake message.
           */
          if (response?.message) {
            this.messages.update((messages) => [
              ...messages,
              response.message
            ]);
          }

          this.sendingMessage.set(false);
        },

        error: (error) => {

          console.error('Failed to send message', error);

          /*
           * Backend may have saved the message even if the
           * response failed, so reload the authoritative history.
           */
          this.loadMessages(chatId);

          this.sendingMessage.set(false);
        }
      });
  }

  // ============================================================
  // Delete Project Chat
  // ============================================================

  deleteChat(
    chat: Chat,
    project: Project
  ): void {

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

        this.projectChats.update((current) => {
          const chats = current[project.id] ?? [];

          return {
            ...current,
            [project.id]: chats.filter(item => item.id !== chat.id)
          };
        });

        if (this.selectedChat()?.id === chat.id) {
          this.selectedChat.set(null);
          this.messages.set([]);
        }

        this.deletingChat.set(false);
      },

      error: (error) => {
        console.error('Failed to delete chat', error);

        this.deletingChat.set(false);
      }
    });
  }

  // ============================================================
  // Delete Normal Chat
  // ============================================================

  deleteNormalChat(chat: Chat): void {

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

        this.normalChats.update((chats) =>
          chats.filter(item => item.id !== chat.id)
        );

        if (this.selectedChat()?.id === chat.id) {
          this.selectedChat.set(null);
          this.selectedProject.set(null);
          this.messages.set([]);
        }

        this.deletingChat.set(false);
      },

      error: (error) => {
        console.error('Failed to delete chat', error);

        this.deletingChat.set(false);
      }
    });
  }

  // ============================================================
  // Create Project
  // ============================================================

  createProject(): void {

    if (this.creatingProject()) {
      return;
    }

    const name = window.prompt('Project name');

    if (!name?.trim()) {
      return;
    }

    this.creatingProject.set(true);

    this.projectService
      .createProject(name.trim())
      .subscribe({

        next: (project) => {

          this.projects.update((projects) => [
            project,
            ...projects
          ]);

          // A new project has no chats: select it with a blank conversation.
          this.selectedProject.set(project);
          this.selectedChat.set(null);
          this.messages.set([]);
          this.messageInput.set('');

          this.expandedProjects.update((projects) => {
            const next = new Set(projects);
            next.add(project.id);
            return next;
          });

          this.projectChats.update((current) => ({
            ...current,
            [project.id]: []
          }));

          this.creatingProject.set(false);
        },

        error: (error) => {
          console.error('Failed to create project', error);

          this.creatingProject.set(false);
        }
      });
  }

  // ============================================================
  // Markdown
  // ============================================================

  renderAssistantMessage(message: ChatMessage) {
    const content =
      message.content?.content?.[0]?.text
      ?? message.content
      ?? '';

    return this.markdownRenderer.render(content);
  }

  handleMarkdownClick(event: Event): void {
  this.markdownRenderer.handleClick(event);
}

  // ============================================================
  // Sidebar
  // ============================================================

  toggleSidebar(): void {
    this.sidebarOpen.update(open => !open);
  }
}