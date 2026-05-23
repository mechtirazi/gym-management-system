import { Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type AppLanguage = 'en' | 'fr';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private readonly LANGUAGE_STORAGE_KEY = 'language';

  readonly supportedLanguages: readonly AppLanguage[] = ['en', 'fr'];
  readonly fallbackLanguage: AppLanguage = 'en';
  readonly currentLanguage = signal<AppLanguage>(this.fallbackLanguage);

  constructor(private translate: TranslateService) {}

  initialize(): AppLanguage {
    this.translate.addLangs([...this.supportedLanguages]);
    this.translate.setFallbackLang(this.fallbackLanguage);

    const preferredLanguage =
      this.getStoredLanguage() ??
      this.getBrowserLanguage() ??
      this.fallbackLanguage;

    this.applyLanguage(preferredLanguage, true);
    return preferredLanguage;
  }

  setLanguage(language: AppLanguage): void {
    this.applyLanguage(language, true);
  }

  private applyLanguage(language: AppLanguage, persist: boolean): void {
    const safeLanguage = this.isSupportedLanguage(language)
      ? language
      : this.fallbackLanguage;

    this.currentLanguage.set(safeLanguage);
    this.translate.use(safeLanguage);

    if (persist && this.hasWindow()) {
      localStorage.setItem(this.LANGUAGE_STORAGE_KEY, safeLanguage);
    }
  }

  private getStoredLanguage(): AppLanguage | null {
    if (!this.hasWindow()) {
      return null;
    }

    const savedLanguage = localStorage.getItem(this.LANGUAGE_STORAGE_KEY);
    return this.isSupportedLanguage(savedLanguage) ? savedLanguage : null;
  }

  private getBrowserLanguage(): AppLanguage | null {
    if (!this.hasWindow()) {
      return null;
    }

    const browserLanguage = this.translate.getBrowserLang();
    return this.isSupportedLanguage(browserLanguage) ? browserLanguage : null;
  }

  private isSupportedLanguage(language: string | null | undefined): language is AppLanguage {
    return !!language && this.supportedLanguages.includes(language as AppLanguage);
  }

  private hasWindow(): boolean {
    return typeof window !== 'undefined';
  }
}
