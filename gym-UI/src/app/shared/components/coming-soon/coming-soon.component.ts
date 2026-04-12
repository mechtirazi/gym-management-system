import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-coming-soon',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="coming-soon-container">
      <div class="glass-card">
        <div class="icon-pulse">
          <span class="material-symbols-rounded">rocket_launch</span>
        </div>
        <h1>Feature Coming Soon</h1>
        <p>Our engineers are working hard to bring you this functionality. Stay tuned for the next major update!</p>
        <button class="btn-primary" routerLink="/">Return to Dashboard</button>
      </div>
    </div>
  `,
  styles: [`
    .coming-soon-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 80vh;
      padding: 2rem;
    }

    .glass-card {
      background: var(--admin-glass);
      backdrop-filter: blur(20px);
      border: 1px solid var(--admin-glass-border);
      border-radius: 2.5rem;
      padding: 4rem;
      text-align: center;
      max-width: 500px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.1);
      animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .icon-pulse {
      width: 100px;
      height: 100px;
      background: linear-gradient(135deg, rgba(79, 70, 229, 0.1), rgba(16, 185, 129, 0.1));
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 2rem;
      animation: pulse 2s infinite;

      span {
        font-size: 3rem;
        color: var(--admin-accent-indigo);
      }
    }

    h1 {
      font-size: 2.2rem;
      font-weight: 800;
      color: var(--text-main);
      margin-bottom: 1rem;
    }

    p {
      color: var(--text-muted);
      font-size: 1.1rem;
      line-height: 1.6;
      margin-bottom: 2.5rem;
    }

    .btn-primary {
      padding: 1rem 2.5rem;
      border-radius: 1.5rem;
      background: linear-gradient(135deg, var(--admin-accent-indigo), var(--admin-accent-blue));
      color: white;
      font-weight: 700;
      font-size: 1rem;
      border: none;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.3);

      &:hover {
        transform: translateY(-3px);
        box-shadow: 0 15px 25px -5px rgba(79, 70, 229, 0.4);
      }
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes pulse {
      0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.2); }
      70% { transform: scale(1.1); box-shadow: 0 0 0 20px rgba(79, 70, 229, 0); }
      100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(79, 70, 229, 0); }
    }
  `]
})
export class ComingSoonComponent {}
