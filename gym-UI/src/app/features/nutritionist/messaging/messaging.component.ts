import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NutritionistNutritionService } from '../services/nutritionist-nutrition.service';
import { NutritionMessagesComponent } from '../utils/nutrition-messages.component';
import { PageHeaderComponent } from '../../owner/components/page-header/page-header.component';
import { forkJoin, finalize, Subscription } from 'rxjs';

@Component({
  selector: 'app-nutritionist-messaging',
  standalone: true,
  imports: [CommonModule, FormsModule, NutritionMessagesComponent, PageHeaderComponent],
  template: `
    <div class="messaging-page animate-fade-in">
      <app-page-header
        [title]="'Communication Hub'"
        [subtitle]="'Manage direct bio-links with your assigned members and dietary clients.'"
      >
        <span header-icon class="material-symbols-rounded">forum</span>
      </app-page-header>

      <div class="messaging-layout">
        <aside class="conversations-sidebar">
          <div class="sidebar-header">
            <div class="title-row">
              <h3>Bio-Links</h3>
              <div class="tabs">
                <button [class.active]="activeSidebarTab() === 'chats'" (click)="activeSidebarTab.set('chats')">Chats</button>
                <button [class.active]="activeSidebarTab() === 'caseload'" (click)="activeSidebarTab.set('caseload')">Caseload</button>
              </div>
            </div>
            <div class="search-box">
              <span class="material-symbols-rounded">search</span>
              <input 
                type="text" 
                [ngModel]="searchQuery()" 
                (ngModelChange)="searchQuery.set($event)"
                placeholder="{{ activeSidebarTab() === 'chats' ? 'Search conversations...' : 'Search caseload...' }}"
              />
            </div>
          </div>

          <div class="conversations-list">
            @if (isLoading()) {
              <div class="loading-state">
                <div class="spinner"></div>
                <p>Synchronizing channels...</p>
              </div>
            } @else if (filteredDisplayList().length === 0) {
              <div class="empty-state">
                <span class="material-symbols-rounded">
                  {{ activeSidebarTab() === 'chats' ? 'chat_bubble_outline' : 'person_search' }}
                </span>
                <p>{{ activeSidebarTab() === 'chats' ? 'No bio-links match your query.' : 'No members found in your caseload.' }}</p>
              </div>
            } @else {
              @for (item of filteredDisplayList(); track item.id_user) {
                <div 
                  class="conversation-item" 
                  [class.active]="selectedRecipientId() === item.id_user"
                  (click)="selectConversation(item)"
                >
                  <div class="avatar">
                    @if (item.profile_picture) {
                      <img [src]="item.profile_picture" [alt]="item.name" />
                    } @else {
                      <div class="avatar-placeholder">{{ item.name.charAt(0) }}</div>
                    }
                  </div>
                  <div class="conv-info">
                    <div class="conv-header">
                      <span class="name">{{ item.name }}</span>
                      @if (item.created_at) {
                        <span class="time">{{ item.created_at | date:'shortTime' }}</span>
                      }
                    </div>
                    <p class="last-msg text-truncate">
                      @if (item.last_message) {
                        {{ item.is_outgoing ? 'You: ' : '' }}{{ item.last_message }}
                      } @else {
                        <span class="new-chat-hint">Start a new secure channel</span>
                      }
                    </p>
                  </div>
                </div>
              }
            }
          </div>
        </aside>

        <main class="chat-viewport">
          @if (selectedRecipientId()) {
            <app-nutrition-messages
              [recipientId]="selectedRecipientId()!"
              [recipientName]="selectedRecipientName()"
              [fullPage]="true"
              (close)="selectedRecipientId.set(null)"
            />
          } @else {
            <div class="no-selection">
              <div class="icon-wrapper">
                <span class="material-symbols-rounded">hub</span>
              </div>
              <h2>Bio-Link Command Center</h2>
              <p>Initialize a secure communication channel by selecting a member from your active professional caseload.</p>
            </div>
          }
        </main>
      </div>
    </div>
  `,
  styles: [`
    .messaging-page {
      padding: 0;
      height: calc(100vh - 140px);
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .messaging-layout {
      flex: 1;
      display: grid;
      grid-template-columns: 380px 1fr;
      gap: 0;
      min-height: 0;
      border: 1px solid var(--admin-glass-border);
      border-radius: 24px;
      overflow: hidden;
      background: var(--admin-glass);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
    }

    .conversations-sidebar {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border-right: 1px solid var(--admin-glass-border);
      background: rgba(255, 255, 255, 0.02);
    }

    .sidebar-header {
      padding: 1.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      
      .title-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.25rem;
        
        h3 { margin: 0; font-size: 1.25rem; font-weight: 800; color: var(--admin-text-primary); }
        
        .tabs {
          display: flex;
          background: rgba(255, 255, 255, 0.05);
          padding: 0.2rem;
          border-radius: 10px;
          gap: 0.2rem;

          button {
            padding: 0.4rem 0.8rem;
            border-radius: 8px;
            border: none;
            background: none;
            color: var(--admin-text-secondary);
            font-size: 0.75rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;

            &:hover { color: var(--admin-text-primary); }
            &.active {
              background: var(--admin-accent-indigo);
              color: white;
              box-shadow: 0 2px 8px rgba(var(--admin-accent-indigo-rgb), 0.3);
            }
          }
        }
      }

      .search-box {
        position: relative;
        .material-symbols-rounded {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          font-size: 1.2rem;
          color: var(--admin-text-secondary);
          opacity: 0.5;
        }
        input {
          width: 100%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 0.75rem 1rem 0.75rem 2.75rem;
          color: white;
          font-size: 0.9rem;
          &:focus { border-color: var(--admin-accent-indigo); outline: none; }
        }
      }
    }

    .conversations-list {
      flex: 1;
      overflow-y: auto;
      &::-webkit-scrollbar { width: 4px; }
      &::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
    }

    .conversation-item {
      padding: 1rem 1.5rem;
      display: flex;
      gap: 1rem;
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      border-bottom: 1px solid rgba(255, 255, 255, 0.02);

      &:hover { background: rgba(255, 255, 255, 0.04); }
      &.active { 
        background: rgba(var(--admin-accent-indigo-rgb), 0.12); 
        position: relative;
        &::after {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: var(--admin-accent-indigo);
          box-shadow: 0 0 10px var(--admin-accent-indigo);
        }
      }

      .avatar {
        width: 54px;
        height: 54px;
        border-radius: 16px;
        overflow: hidden;
        flex-shrink: 0;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        img { width: 100%; height: 100%; object-fit: cover; }
        .avatar-placeholder {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, var(--admin-accent-indigo), #6366f1);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 1.4rem;
        }
      }

      .conv-info {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        justify-content: center;

        .conv-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.25rem;
          .name { font-weight: 700; color: var(--admin-text-primary); font-size: 1rem; letter-spacing: -0.01em; }
          .time { font-size: 0.75rem; color: var(--admin-text-secondary); opacity: 0.6; }
        }
        .last-msg { 
          margin: 0; 
          font-size: 0.85rem; 
          color: var(--admin-text-secondary);
          opacity: 0.7;
          font-weight: 500;

          .new-chat-hint {
            color: var(--admin-accent-indigo);
            font-weight: 700;
            opacity: 0.9;
          }
        }
      }
    }

    .chat-viewport {
      background: rgba(0, 0, 0, 0.1);
      position: relative;
      display: flex;
      flex-direction: column;
    }

    .no-selection {
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: var(--admin-text-secondary);
      text-align: center;
      padding: 3rem;

      .icon-wrapper {
        width: 120px;
        height: 120px;
        background: rgba(var(--admin-accent-indigo-rgb), 0.05);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 2rem;
        border: 1px solid rgba(var(--admin-accent-indigo-rgb), 0.1);
        .material-symbols-rounded { font-size: 4rem; color: var(--admin-accent-indigo); }
      }
      
      h2 { margin-bottom: 0.75rem; color: var(--admin-text-primary); font-size: 1.75rem; font-weight: 800; }
      p { max-width: 350px; line-height: 1.6; font-size: 1.1rem; opacity: 0.6; }
    }

    .loading-state, .empty-state {
      padding: 4rem 2rem;
      text-align: center;
      color: var(--admin-text-secondary);
      .material-symbols-rounded { font-size: 3.5rem; margin-bottom: 1.5rem; opacity: 0.2; }
      p { font-weight: 600; font-size: 1.1rem; }
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid rgba(255, 255, 255, 0.05);
      border-top-color: var(--admin-accent-indigo);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1.5rem;
    }

    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class MessagingHubComponent implements OnInit {
  private api = inject(NutritionistNutritionService);

  conversations = signal<any[]>([]);
  caseload = signal<any[]>([]);
  isLoading = signal(true);
  activeSidebarTab = signal<'chats' | 'caseload'>('chats');
  searchQuery = signal('');
  selectedRecipientId = signal<string | null>(null);
  selectedRecipientName = signal<string>('');

  filteredDisplayList = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const source = this.activeSidebarTab() === 'chats' ? this.conversations() : this.caseload();
    
    if (!q) return source;
    
    return source.filter(item => 
      item.name.toLowerCase().includes(q) || 
      (item.last_message || '').toLowerCase().includes(q)
    );
  });

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);
    
    forkJoin({
      convs: this.api.getConversations(),
      clients: this.api.getClients()
    }).pipe(
      finalize(() => this.isLoading.set(false))
    ).subscribe({
      next: res => {
        this.conversations.set(res.convs.data || []);
        
        // Normalize caseload data to match conversation-item structure
        const clients = (res.clients.data || []).map((c: any) => ({
          id_user: c.id_user,
          name: `${c.name} ${c.last_name || ''}`.trim(),
          profile_picture: c.profile_picture,
          last_message: null,
          created_at: null
        }));
        this.caseload.set(clients);
      },
      error: () => {
        this.conversations.set([]);
        this.caseload.set([]);
      }
    });
  }

  selectConversation(item: any) {
    this.selectedRecipientId.set(item.id_user);
    this.selectedRecipientName.set(item.name);
  }
}
