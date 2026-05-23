import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Inject, Injectable, OnDestroy, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subscription, firstValueFrom } from 'rxjs';
import { AppLanguage, LanguageService } from './language.service';

type TranslationMap = Record<string, string>;

@Injectable({
  providedIn: 'root'
})
export class AutoPageTranslationService implements OnDestroy {
  private readonly TRANSLATION_ASSET_PREFIX = '/assets/i18n/auto/';
  private readonly TRANSLATION_ASSET_SUFFIX = '.json';

  private readonly translatableAttributes = ['placeholder', 'title', 'aria-label', 'alt'];
  private readonly excludedTags = new Set([
    'SCRIPT',
    'STYLE',
    'NOSCRIPT',
    'CODE',
    'PRE',
    'TEXTAREA'
  ]);
  private readonly excludedClassNames = new Set([
    'material-symbols-rounded',
    'material-icons',
    'notranslate',
    'no-translate'
  ]);

  private readonly nodeSourceMap = new WeakMap<Text, string>();
  private readonly attrSourceMap = new WeakMap<Element, Map<string, string>>();
  private readonly translatedNodeSet = new WeakSet<Text>();
  private readonly translatedAttrMap = new WeakMap<Element, Set<string>>();

  private observer: MutationObserver | null = null;
  private activeLanguage: AppLanguage = 'en';
  private activeDictionary: TranslationMap = {};
  private activeReplacementEntries: Array<[string, string]> = [];
  private dictionaryByLanguage = new Map<AppLanguage, TranslationMap>();
  private replacementEntriesByLanguage = new Map<AppLanguage, Array<[string, string]>>();
  private languageLoadSequence = 0;
  private subscriptions: Subscription[] = [];

  private http = inject(HttpClient);
  private languageService = inject(LanguageService);
  private translateService = inject(TranslateService);

  constructor(@Inject(DOCUMENT) private document: Document) {}

  initialize(): void {
    this.activeLanguage = this.languageService.currentLanguage();

    this.subscriptions.push(
      this.translateService.onLangChange.subscribe(event => {
        const language = this.coerceLanguage(event.lang);
        this.switchLanguage(language);
      })
    );

    this.switchLanguage(this.activeLanguage);
    this.startObserver();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.stopObserver();
  }

  private switchLanguage(language: AppLanguage): void {
    const currentLoadSequence = ++this.languageLoadSequence;
    this.activeLanguage = language;
    this.loadDictionary(language).then(dictionary => {
      // Ignore stale async loads from a previous language switch.
      if (currentLoadSequence !== this.languageLoadSequence) {
        return;
      }
      this.activeDictionary = dictionary;
      this.activeReplacementEntries = this.getOrCreateReplacementEntries(
        language,
        dictionary
      );
      this.translateWholePage();
    });
  }

  private translateWholePage(): void {
    const root = this.document.body;
    if (!root) return;

    this.translateElementTree(root);
  }

  private translateElementTree(root: Element): void {
    this.translateAttributes(root);
    this.translateTextNodes(root);

    const showElement =
      typeof NodeFilter !== 'undefined' ? NodeFilter.SHOW_ELEMENT : 1;
    const walker = this.document.createTreeWalker(root, showElement);
    let current = walker.nextNode() as Element | null;
    while (current) {
      this.translateAttributes(current);
      this.translateTextNodes(current);
      current = walker.nextNode() as Element | null;
    }
  }

  private translateTextNodes(host: Element): void {
    if (!this.shouldProcessElement(host)) return;

    const childNodes = Array.from(host.childNodes);
    for (const node of childNodes) {
      if (node.nodeType !== Node.TEXT_NODE) continue;
      this.translateSingleTextNode(node as Text);
    }
  }

  private translateSingleTextNode(textNode: Text): void {
    const textContent = textNode.textContent ?? '';
    if (!textContent.trim()) return;

    const source = this.getOrStoreNodeSource(textNode, textContent);

    if (this.activeLanguage === 'en') {
      if (this.translatedNodeSet.has(textNode) && textContent !== source) {
        textNode.textContent = source;
      }
      this.translatedNodeSet.delete(textNode);
      return;
    }

    const translated = this.lookupTranslation(source);
    if (!translated || translated === source) return;

    const nextValue = this.mergeWithOriginalWhitespace(textContent, translated);
    if (textContent !== nextValue) {
      textNode.textContent = nextValue;
    }
    this.translatedNodeSet.add(textNode);
  }

  private translateAttributes(element: Element): void {
    if (!this.shouldProcessElement(element)) return;

    for (const attribute of this.translatableAttributes) {
      const currentValue = element.getAttribute(attribute);
      if (!currentValue || !currentValue.trim()) continue;

      const source = this.getOrStoreAttributeSource(element, attribute, currentValue);
      const translatedAttributes = this.getOrCreateTranslatedAttributes(element);

      if (this.activeLanguage === 'en') {
        if (translatedAttributes.has(attribute)) {
          element.setAttribute(attribute, source);
          translatedAttributes.delete(attribute);
        }
        continue;
      }

      const translated = this.lookupTranslation(source);
      if (!translated || translated === source) continue;

      element.setAttribute(attribute, translated);
      translatedAttributes.add(attribute);
    }
  }

  private getOrStoreNodeSource(node: Text, currentValue: string): string {
    const existing = this.nodeSourceMap.get(node);
    if (existing) return existing;

    const source = currentValue;
    this.nodeSourceMap.set(node, source);
    return source;
  }

  private getOrStoreAttributeSource(element: Element, attribute: string, currentValue: string): string {
    let attrs = this.attrSourceMap.get(element);
    if (!attrs) {
      attrs = new Map<string, string>();
      this.attrSourceMap.set(element, attrs);
    }

    const existing = attrs.get(attribute);
    if (existing) return existing;

    attrs.set(attribute, currentValue);
    return currentValue;
  }

  private getOrCreateTranslatedAttributes(element: Element): Set<string> {
    let translated = this.translatedAttrMap.get(element);
    if (!translated) {
      translated = new Set<string>();
      this.translatedAttrMap.set(element, translated);
    }
    return translated;
  }

  private lookupTranslation(source: string): string | null {
    const key = this.normalizeText(source);
    if (!key) return null;
    const exact = this.activeDictionary[key];
    if (exact) {
      return exact;
    }

    return this.lookupFragmentTranslation(key);
  }

  private lookupFragmentTranslation(source: string): string | null {
    if (this.activeReplacementEntries.length === 0) {
      return null;
    }
    if (source.length < 10 || !source.includes(' ')) {
      return null;
    }
    const wordCount = source.split(' ').length;
    if (wordCount < 3 && !/[,:;.!?]/.test(source)) {
      return null;
    }

    let translated = source;
    let changed = false;

    for (const [original, replacement] of this.activeReplacementEntries) {
      if (!translated.includes(original)) continue;
      translated = translated.split(original).join(replacement);
      changed = true;
    }

    return changed ? translated : null;
  }

  private normalizeText(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
  }

  private mergeWithOriginalWhitespace(original: string, translated: string): string {
    const leading = original.match(/^\s*/)?.[0] ?? '';
    const trailing = original.match(/\s*$/)?.[0] ?? '';
    return `${leading}${translated}${trailing}`;
  }

  private shouldProcessElement(element: Element): boolean {
    if (this.excludedTags.has(element.tagName)) return false;

    for (const cls of this.excludedClassNames) {
      if (element.classList.contains(cls)) return false;
    }

    return true;
  }

  private startObserver(): void {
    this.stopObserver();

    const root = this.document.body;
    if (!root) return;

    this.observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (const added of Array.from(mutation.addedNodes)) {
            if (added.nodeType === Node.ELEMENT_NODE) {
              this.translateElementTree(added as Element);
            } else if (added.nodeType === Node.TEXT_NODE && added.parentElement) {
              this.translateTextNodes(added.parentElement);
            }
          }
        }

        if (mutation.type === 'characterData') {
          const target = mutation.target;
          if (target.nodeType === Node.TEXT_NODE) {
            this.translateSingleTextNode(target as Text);
          }
        }
      }
    });

    this.observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  private stopObserver(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  private async loadDictionary(language: AppLanguage): Promise<TranslationMap> {
    if (language === 'en') {
      return {};
    }

    const cached = this.dictionaryByLanguage.get(language);
    if (cached) {
      return cached;
    }

    const url = `${this.TRANSLATION_ASSET_PREFIX}${language}${this.TRANSLATION_ASSET_SUFFIX}`;

    try {
      const dictionary = await firstValueFrom(this.http.get<TranslationMap>(url));
      const safeDictionary = dictionary ?? {};
      this.dictionaryByLanguage.set(language, safeDictionary);
      return safeDictionary;
    } catch {
      return {};
    }
  }

  private getOrCreateReplacementEntries(
    language: AppLanguage,
    dictionary: TranslationMap
  ): Array<[string, string]> {
    if (language === 'en') {
      return [];
    }

    const cached = this.replacementEntriesByLanguage.get(language);
    if (cached) {
      return cached;
    }

    const entries = Object.entries(dictionary)
      .map(([source, target]) => [this.normalizeText(source), this.normalizeText(target)] as [string, string])
      .filter(([source, target]) => {
        if (!source || !target || source === target) return false;
        if (source.length < 5) return false;
        return source.includes(' ') || /[,:;.!?]/.test(source);
      })
      .sort((a, b) => b[0].length - a[0].length);

    this.replacementEntriesByLanguage.set(language, entries);
    return entries;
  }

  private coerceLanguage(value: string): AppLanguage {
    return value === 'fr' ? 'fr' : 'en';
  }
}
