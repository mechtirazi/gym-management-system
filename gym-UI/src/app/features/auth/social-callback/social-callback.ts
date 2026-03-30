import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-social-callback',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './social-callback.html',
  styleUrl: './social-callback.scss',
})
export class SocialCallback implements OnInit {
  status = signal('Processing login...');
  isError = signal(false);

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    const params = this.route.snapshot.queryParams;
    if (this.authService.handleSocialLogin(params)) {
      this.status.set('Login successful! Redirecting...');
      this.router.navigate(['/dashboard'], { replaceUrl: true });
    } else {
      this.route.queryParams.subscribe(params => {
        if (this.authService.handleSocialLogin(params)) {
          this.status.set('Login successful! Redirecting...');
          this.router.navigate(['/dashboard'], { replaceUrl: true });
        } else if (params['token'] || params['u'] || params['user']) {
           this.isError.set(true);
           this.status.set('Social login failed: Error parsing user data.');
        } else {
          this.isError.set(true);
          this.status.set('Social login failed: Missing credentials.');
        }
      });
    }
  }
}
