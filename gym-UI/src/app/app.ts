import { Component, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('gym-ui');
  private translate = inject(TranslateService);

  constructor() {
    this.translate.addLangs(['en', 'fr']);
    const browserLang = this.translate.getBrowserLang() || 'en';
    const defaultLang = localStorage.getItem('language') || (browserLang.match(/en|fr/) ? browserLang : 'en');
    this.translate.setFallbackLang(defaultLang);
    this.translate.use(defaultLang);
  }
}
