import { Component, Input, Output, EventEmitter, OnInit, OnChanges, OnDestroy, SimpleChanges, inject, signal, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NutritionistNutritionService } from '../services/nutritionist-nutrition.service';
import { AuthService } from '../../../core/services/auth.service';
import { NutritionMessage } from '../../../shared/models/nutrition.model';
import { finalize, Subscription } from 'rxjs';

@Component({
  selector: 'app-nutrition-messages',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="messenger-shell" [class.full-page]="fullPage" [class.glass-card]="!fullPage" [class.animate-fade-in]="!fullPage">
      <header class="messenger-header">
        <div class="bio-status">
          <div class="dot live"></div>
          <span>Direct Bio-Link: {{ recipientName }}</span>
        </div>
        @if (!fullPage) {
          <button class="close-messenger" (click)="close.emit()">✕</button>
        }
      </header>

      <div class="messages-viewport" #viewport>
        @if (isLoading()) {
          <div class="loading-pulse">Synchronizing secure channel...</div>
        }

        @for (msg of messages(); track msg.created_at) {
          <div class="message-row" [class.outgoing]="msg.id_sender === meId()">
            <div class="bubble">
              <p>{{ msg.text }}</p>
              <span class="time">{{ msg.created_at | date:'shortTime' }}</span>
            </div>
          </div>
        }

        @if (!isLoading() && messages().length === 0) {
          <div class="empty-channel">
            <span class="material-symbols-rounded">forum</span>
            <p>Channel established. Initialize first directive.</p>
          </div>
        }
      </div>

      <footer class="messenger-footer">
        <input 
          [(ngModel)]="newMessage" 
          (keyup.enter)="send()" 
          placeholder="Transmit directive..." 
          [disabled]="isSending()"
        />
        <button (click)="send()" [disabled]="!newMessage.trim() || isSending()">
          <span class="material-symbols-rounded">{{ isSending() ? 'sync' : 'send' }}</span>
        </button>
      </footer>
    </div>
  `,
  styles: [`
    .messenger-shell {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--admin-glass);
      border: 1px solid var(--admin-glass-border);
      border-radius: 20px;
      overflow: hidden;

      &.full-page {
        background: transparent;
        border: none;
        border-radius: 0;
      }
    }

    .messenger-header {
      padding: 1.25rem;
      background: rgba(255, 255, 255, 0.03);
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      display: flex;
      justify-content: space-between;
      align-items: center;

      .bio-status {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-size: 0.85rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--admin-text-primary);

        .dot.live {
          width: 8px;
          height: 8px;
          background: #10b981;
          border-radius: 50%;
          box-shadow: 0 0 10px #10b981;
          animation: pulse 2s infinite;
        }
      }

      .close-messenger {
        background: none;
        border: none;
        color: var(--admin-text-secondary);
        cursor: pointer;
        &:hover { color: var(--admin-text-primary); }
      }
    }

    .messages-viewport {
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;

      &::-webkit-scrollbar { width: 4px; }
      &::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
    }

    .message-row {
      display: flex;
      &.outgoing {
        justify-content: flex-end;
        .bubble {
          background: var(--admin-accent-indigo);
          color: white;
          border-radius: 18px 18px 4px 18px;
        }
      }

      &:not(.outgoing) .bubble {
        background: rgba(255, 255, 255, 0.07);
        color: var(--admin-text-primary);
        border-radius: 18px 18px 18px 4px;
      }

      .bubble {
        max-width: 80%;
        padding: 0.8rem 1.2rem;
        position: relative;
        
        p { margin: 0; font-size: 0.95rem; line-height: 1.4; }
        .time {
          font-size: 0.7rem;
          opacity: 0.6;
          display: block;
          margin-top: 0.4rem;
          text-align: right;
        }
      }
    }

    .messenger-footer {
      padding: 1.25rem;
      background: rgba(255, 255, 255, 0.03);
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      display: flex;
      gap: 1rem;

      input {
        flex: 1;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 0.8rem 1.2rem;
        color: white;
        font-size: 0.9rem;
        &:focus { border-color: var(--admin-accent-indigo); outline: none; }
      }

      button {
        width: 45px;
        height: 45px;
        border-radius: 12px;
        background: var(--admin-accent-indigo);
        border: none;
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        &:hover:not(:disabled) { transform: scale(1.05); filter: brightness(1.1); }
        &:disabled { opacity: 0.5; cursor: not-allowed; }
      }
    }

    .loading-pulse {
      text-align: center;
      font-size: 0.8rem;
      color: var(--admin-text-secondary);
      animation: pulse 1.5s infinite;
    }

    .empty-channel {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: var(--admin-text-secondary);
      opacity: 0.5;
      .material-symbols-rounded { font-size: 3rem; margin-bottom: 1rem; }
    }

    @keyframes pulse {
      0% { opacity: 0.6; }
      50% { opacity: 1; }
      100% { opacity: 0.6; }
    }
  `]
})
export class NutritionMessagesComponent implements OnInit, OnChanges, OnDestroy {
  @Input() recipientId!: string;
  @Input() recipientName: string = 'Consultant';
  @Input() fullPage: boolean = false;
  @Output() close = new EventEmitter<void>();

  private api = inject(NutritionistNutritionService);
  private auth = inject(AuthService);

  messages = signal<NutritionMessage[]>([]);
  isLoading = signal(true);
  isSending = signal(false);
  newMessage = '';
  private readonly pollIntervalMs = 2000;
  private pollSub: Subscription | null = null;
  private isFetching = false;

  @ViewChild('viewport') viewport!: ElementRef;

  meId() { return this.auth.currentUser()?.id_user; }

  ngOnInit() {
    this.load();
    this.startPolling();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['recipientId'] && !changes['recipientId'].firstChange) {
      this.messages.set([]);
      this.load();
      this.startPolling();
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  load(showLoading = true) {
    if (!this.hasRecipient() || this.isFetching) {
      this.isLoading.set(false);
      return;
    }

    if (showLoading) this.isLoading.set(true);
    this.isFetching = true;

    this.api.getMessages(this.recipientId).pipe(
      finalize(() => {
        this.isLoading.set(false);
        this.isFetching = false;
      })
    ).subscribe({
      next: res => {
        this.messages.set(res.data || []);
        setTimeout(() => this.scrollToBottom(), 100);
      }
    });
  }

  send() {
    if (!this.hasRecipient() || !this.newMessage.trim() || this.isSending()) return;

    const text = this.newMessage.trim();
    this.isSending.set(true);
    this.api.sendMessage(this.recipientId, text).pipe(
      finalize(() => this.isSending.set(false))
    ).subscribe({
      next: (res: any) => {
        const message = this.resolveMessagePayload(res, text);
        this.messages.update(m => [...m, message]);
        this.newMessage = '';
        setTimeout(() => this.scrollToBottom(), 100);
      }
    });
  }

  private startPolling() {
    this.stopPolling();
    if (!this.hasRecipient()) return;
    this.pollSub = new Subscription();
    const timer = setInterval(() => this.load(false), this.pollIntervalMs);
    this.pollSub.add(() => clearInterval(timer));
  }

  private stopPolling() {
    this.pollSub?.unsubscribe();
    this.pollSub = null;
  }

  private hasRecipient(): boolean {
    return !!String(this.recipientId ?? '').trim();
  }

  private resolveMessagePayload(res: any, fallbackText: string): NutritionMessage {
    const payload = res?.data ?? res;
    if (payload?.id_sender && payload?.id_receiver && payload?.text) {
      return payload as NutritionMessage;
    }

    return {
      id_sender: String(this.meId() ?? ''),
      id_receiver: String(this.recipientId),
      text: fallbackText,
      created_at: new Date().toISOString()
    };
  }

  private scrollToBottom() {
    if (this.viewport) {
      this.viewport.nativeElement.scrollTop = this.viewport.nativeElement.scrollHeight;
    }
  }
}
