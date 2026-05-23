import { Component, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LanguageService } from './core/services/language.service';
import { AutoPageTranslationService } from './core/services/auto-page-translation.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('gym-ui');
  private languageService = inject(LanguageService);
  private autoPageTranslationService = inject(AutoPageTranslationService);

  constructor() {
    this.languageService.initialize();
    this.autoPageTranslationService.initialize();
  }
}
