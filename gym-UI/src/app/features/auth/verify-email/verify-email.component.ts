import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.scss'
})
export class VerifyEmailComponent implements OnInit {
  status = signal<'loading' | 'success' | 'error'>('loading');
  message = signal<string>('Verifying your email address...');

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      const hash = params.get('hash');
      
      this.route.queryParamMap.subscribe(queryParams => {
        const expires = queryParams.get('expires');
        const signature = queryParams.get('signature');

        if (id && hash && expires && signature) {
          const queryStr = `expires=${expires}&signature=${signature}`;
          this.authService.verifyEmail(id, hash, queryStr).subscribe({
            next: (res: any) => {
              this.status.set('success');
              this.message.set(res.message || 'Your email has been successfully verified!');
            },
            error: (err: any) => {
              this.status.set('error');
              this.message.set(err.error?.message || 'Verification link is invalid or has expired.');
            }
          });
        } else {
          this.status.set('error');
          this.message.set('Invalid verification link. Please check the URL from your email.');
        }
      });
    });
  }
}
