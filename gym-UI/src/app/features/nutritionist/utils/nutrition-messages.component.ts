import {
  Component, Input, Output, EventEmitter,
  OnInit, OnChanges, OnDestroy, SimpleChanges,
  inject, signal, ElementRef, ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NutritionistNutritionService } from '../services/nutritionist-nutrition.service';
import { AuthService } from '../../../core/services/auth.service';
import { NutritionMessage } from '../../../shared/models/nutrition.model';
import { finalize, Subscription } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-nutrition-messages',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="chat-shell" [class.full-page]="fullPage" [class.glass-card]="!fullPage" [class.animate-fade-in]="!fullPage">

      <!-- ── Header ── -->
      <header class="chat-header">
        <div class="chat-header__info">
          <div class="chat-header__avatar">
            @if (recipientAvatar()) {
              <img [src]="recipientAvatar()!" [alt]="recipientName" />
            } @else {
              <span>{{ (recipientName || '?').charAt(0).toUpperCase() }}</span>
            }
            <div class="chat-header__online"></div>
          </div>
          <div class="chat-header__text">
            <span class="chat-header__name">{{ recipientName }}</span>
            <span class="chat-header__status">
              <span class="status-dot"></span>
              Online
            </span>
          </div>
        </div>
        @if (!fullPage) {
          <button class="chat-close" (click)="close.emit()" aria-label="Close chat">
            <span class="material-symbols-rounded">close</span>
          </button>
        }
      </header>

      <!-- ── Messages ── -->
      <div class="chat-messages" #viewport>

        @if (isLoading()) {
          <div class="chat-loading">
            <div class="chat-loading__spinner"></div>
            <p>Loading messages…</p>
          </div>
        }

        @for (msg of messages(); track msg.created_at) {
          <div class="msg-row" [class.msg-row--out]="msg.id_sender === meId()">

            <!-- Incoming: sender avatar on the LEFT -->
            @if (msg.id_sender !== meId()) {
              <div class="msg-avatar msg-avatar--in">
                @if (getSenderAvatar(msg)) {
                  <img [src]="getSenderAvatar(msg)!" [alt]="msg.sender_name || recipientName" />
                } @else {
                  <span>{{ (msg.sender_name || recipientName || '?').charAt(0).toUpperCase() }}</span>
                }
              </div>
            }

            <!-- Bubble -->
            <div class="msg-bubble" [class.msg-bubble--out]="msg.id_sender === meId()">
              @if (msg.id_sender !== meId() && msg.sender_name) {
                <span class="msg-sender-name">{{ msg.sender_name }}</span>
              }
              <p>{{ msg.text }}</p>
              <span class="msg-time">{{ msg.created_at | date:'shortTime' }}</span>
            </div>

            <!-- Outgoing: my avatar on the RIGHT -->
            @if (msg.id_sender === meId()) {
              <div class="msg-avatar msg-avatar--out">
                @if (myAvatar()) {
                  <img [src]="myAvatar()!" alt="You" />
                } @else {
                  <span>{{ (myName() || 'Y').charAt(0).toUpperCase() }}</span>
                }
              </div>
            }

          </div>
        }

        @if (!isLoading() && messages().length === 0) {
          <div class="chat-empty">
            <span class="material-symbols-rounded">chat_bubble_outline</span>
            <p>No messages yet. Say hello!</p>
          </div>
        }

      </div>

      <!-- ── Input ── -->
      <footer class="chat-footer">
        <div class="chat-input-wrap">
          <input
            class="chat-input"
            [(ngModel)]="newMessage"
            (keyup.enter)="send()"
            placeholder="Type a message…"
            [disabled]="isSending()"
            autocomplete="off"
          />
          <button
            class="chat-send"
            (click)="send()"
            [disabled]="!newMessage.trim() || isSending()"
            aria-label="Send message"
          >
            <span class="material-symbols-rounded">{{ isSending() ? 'sync' : 'send' }}</span>
          </button>
        </div>
      </footer>

    </div>
  `,
  styles: [`
    /* ── Shell ─────────────────────────────────────────────────────────────── */
    .chat-shell {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 20px;
      overflow: hidden;
    }
    .chat-shell.full-page {
      background: var(--bg-card);
      border: none;
      border-radius: 0;
    }

    /* ── Header ─────────────────────────────────────────────────────────────── */
    .chat-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      background: var(--bg-card);
      border-bottom: 1px solid var(--border-color);
      flex-shrink: 0;
    }
    .chat-header__info {
      display: flex;
      align-items: center;
      gap: 0.875rem;
    }
    .chat-header__avatar {
      position: relative;
      width: 44px;
      height: 44px;
      border-radius: 14px;
      overflow: hidden;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
    }
    .chat-header__avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .chat-header__avatar span {
      color: #fff;
      font-size: 1.1rem;
      font-weight: 800;
    }
    .chat-header__online {
      position: absolute;
      bottom: 1px;
      right: 1px;
      width: 10px;
      height: 10px;
      background: #10b981;
      border-radius: 50%;
      border: 2px solid var(--bg-card);
      box-shadow: 0 0 6px rgba(16, 185, 129, 0.7);
    }
    .chat-header__text {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }
    .chat-header__name {
      font-size: 1rem;
      font-weight: 800;
      color: var(--text-main);
      letter-spacing: -0.01em;
    }
    .chat-header__status {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: #10b981;
    }
    .status-dot {
      width: 6px;
      height: 6px;
      background: #10b981;
      border-radius: 50%;
      animation: blink 2s ease-in-out infinite;
    }

    .chat-close {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      border: 1px solid var(--border-color);
      background: var(--bg-hover);
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    .chat-close .material-symbols-rounded { font-size: 1.1rem; }
    .chat-close:hover {
      background: rgba(244, 63, 94, 0.12);
      border-color: rgba(244, 63, 94, 0.35);
      color: #f43f5e;
    }

    /* ── Messages viewport ──────────────────────────────────────────────────── */
    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 1.25rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
      background: var(--bg-main);
    }
    .chat-messages::-webkit-scrollbar { width: 4px; }
    .chat-messages::-webkit-scrollbar-thumb {
      background: var(--border-color);
      border-radius: 10px;
    }

    /* ── Message row ────────────────────────────────────────────────────────── */
    .msg-row {
      display: flex;
      align-items: flex-end;
      gap: 0.625rem;
    }
    .msg-row--out { flex-direction: row-reverse; }

    /* ── Sender avatar ──────────────────────────────────────────────────────── */
    .msg-avatar {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      overflow: hidden;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      font-weight: 800;
      color: #fff;
      align-self: flex-end;
      margin-bottom: 2px;
    }
    .msg-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .msg-avatar--in {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      box-shadow: 0 3px 8px rgba(99, 102, 241, 0.3);
    }
    .msg-avatar--out {
      background: linear-gradient(135deg, #0ea5e9, #6366f1);
      box-shadow: 0 3px 8px rgba(14, 165, 233, 0.3);
    }

    /* ── Bubble ─────────────────────────────────────────────────────────────── */
    .msg-bubble {
      max-width: 68%;
      padding: 0.75rem 1rem;
      border-radius: 18px 18px 18px 4px;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    }
    .msg-bubble--out {
      background: #4f46e5;
      border-color: transparent;
      border-radius: 18px 18px 4px 18px;
      box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35);
    }
    .msg-bubble p {
      margin: 0 0 0.3rem;
      font-size: 0.92rem;
      line-height: 1.5;
      color: var(--text-main);
      word-break: break-word;
    }
    .msg-bubble--out p { color: #fff; }
    .msg-bubble--out .msg-time { color: rgba(255, 255, 255, 0.65); }

    .msg-sender-name {
      display: block;
      font-size: 0.72rem;
      font-weight: 800;
      color: #6366f1;
      margin-bottom: 0.3rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .msg-time {
      font-size: 0.68rem;
      color: var(--text-muted);
      display: block;
      text-align: right;
      margin-top: 0.1rem;
    }

    /* ── Loading / Empty ────────────────────────────────────────────────────── */
    .chat-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
      gap: 0.75rem;
      color: var(--text-muted);
      font-size: 0.875rem;
      font-weight: 600;
      padding: 3rem;
    }
    .chat-loading__spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--border-color);
      border-top-color: #6366f1;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    .chat-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
      gap: 0.75rem;
      color: var(--text-muted);
      opacity: 0.6;
      padding: 3rem;
      text-align: center;
    }
    .chat-empty .material-symbols-rounded { font-size: 2.5rem; }
    .chat-empty p { margin: 0; font-size: 0.9rem; font-weight: 600; }

    /* ── Footer / Input ─────────────────────────────────────────────────────── */
    .chat-footer {
      padding: 1rem 1.25rem;
      border-top: 1px solid var(--border-color);
      background: var(--bg-card);
      flex-shrink: 0;
    }
    .chat-input-wrap {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: var(--bg-input);
      border: 1.5px solid var(--border-color);
      border-radius: 16px;
      padding: 0.4rem 0.4rem 0.4rem 1rem;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .chat-input-wrap:focus-within {
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
    }
    .chat-input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: var(--text-main);
      font-size: 0.92rem;
      font-family: inherit;
      font-weight: 500;
    }
    .chat-input::placeholder {
      color: var(--text-muted);
      font-weight: 400;
    }
    .chat-input:disabled { opacity: 0.5; cursor: not-allowed; }

    .chat-send {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      border: none;
      background: #4f46e5;
      color: #fff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.2s;
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.35);
    }
    .chat-send .material-symbols-rounded { font-size: 1.2rem; }
    .chat-send:hover:not(:disabled) {
      transform: scale(1.08);
      box-shadow: 0 6px 16px rgba(79, 70, 229, 0.45);
    }
    .chat-send:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }

    /* ── Animations ─────────────────────────────────────────────────────────── */
    @keyframes spin  { to { transform: rotate(360deg); } }
    @keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0.35; } }
    .animate-fade-in { animation: fadeIn 0.3s ease-out both; }
    @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
  `]
})
export class NutritionMessagesComponent implements OnInit, OnChanges, OnDestroy {
  @Input() recipientId!: string;
  @Input() recipientName: string = 'User';
  @Input() recipientProfilePicture?: string;
  @Input() fullPage: boolean = false;
  @Output() close = new EventEmitter<void>();

  private api  = inject(NutritionistNutritionService);
  private auth = inject(AuthService);

  private readonly baseUrl = environment.apiUrl.replace('/api', '').replace(/\/$/, '');

  messages   = signal<NutritionMessage[]>([]);
  isLoading  = signal(true);
  isSending  = signal(false);
  newMessage = '';

  private readonly pollIntervalMs = 3000;
  private pollSub: Subscription | null = null;
  private isFetching = false;

  @ViewChild('viewport') viewport!: ElementRef;

  meId()   { return this.auth.currentUser()?.id_user; }
  myName() { return this.auth.currentUser()?.name; }

  myAvatar(): string | null {
    return this.resolveUrl(this.auth.currentUser()?.profile_picture);
  }

  recipientAvatar(): string | null {
    return this.resolveUrl(this.recipientProfilePicture ?? null);
  }

  getSenderAvatar(_msg: NutritionMessage): string | null {
    return this.recipientAvatar();
  }

  private resolveUrl(path?: string | null): string | null {
    if (!path) return null;
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    const clean = path.replace(/^\//, '');
    return `${this.baseUrl}/${clean.startsWith('storage/') ? clean : 'storage/' + clean}`;
  }

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
      finalize(() => { this.isLoading.set(false); this.isFetching = false; })
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
        this.messages.update(m => [...m, this.resolvePayload(res, text)]);
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

  private resolvePayload(res: any, fallbackText: string): NutritionMessage {
    const p = res?.data ?? res;
    if (p?.id_sender && p?.id_receiver && p?.text) return p as NutritionMessage;
    return {
      id_sender:   String(this.meId() ?? ''),
      id_receiver: String(this.recipientId),
      text:        fallbackText,
      created_at:  new Date().toISOString()
    };
  }

  private scrollToBottom() {
    if (this.viewport) {
      this.viewport.nativeElement.scrollTop = this.viewport.nativeElement.scrollHeight;
    }
  }
}
