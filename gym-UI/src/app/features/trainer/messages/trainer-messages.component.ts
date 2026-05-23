import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NutritionistNutritionService } from '../../nutritionist/services/nutritionist-nutrition.service';
import { NutritionMessagesComponent } from '../../nutritionist/utils/nutrition-messages.component';
import { finalize } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-trainer-messages',
  standalone: true,
  imports: [CommonModule, FormsModule, NutritionMessagesComponent],
  templateUrl: './trainer-messages.component.html',
  styleUrl: './trainer-messages.component.scss'
})
export class TrainerMessagesComponent implements OnInit {
  private api = inject(NutritionistNutritionService);

  conversations = signal<any[]>([]);
  isLoading = signal(true);
  searchQuery = signal('');
  selectedRecipientId = signal<string | null>(null);
  selectedRecipientName = signal<string>('');
  selectedRecipientPicture = signal<string | null>(null);

  filteredConversations = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const convs = this.conversations();
    if (!q) return convs;
    return convs.filter(conv =>
      (conv.name || '').toLowerCase().includes(q) ||
      (conv.last_message || '').toLowerCase().includes(q)
    );
  });

  ngOnInit() {
    this.loadConversations();
  }

  loadConversations() {
    this.isLoading.set(true);
    this.api.getConversations()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (res) => this.conversations.set(res.data || []),
        error: () => this.conversations.set([])
      });
  }

  selectConversation(conv: any) {
    this.selectedRecipientId.set(conv.id_user);
    this.selectedRecipientName.set(conv.name || 'User');
    this.selectedRecipientPicture.set(conv.profile_picture || null);
    this.loadConversations();
  }

  getImageUrl(path?: string): string | null {
    if (!path) return null;
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    const baseUrl = environment.apiUrl.replace('/api', '').replace(/\/$/, '');
    let cleanPath = path.replace(/^\//, '');
    if (!cleanPath.startsWith('storage/')) cleanPath = `storage/${cleanPath}`;
    return `${baseUrl}/${cleanPath}`;
  }
}
