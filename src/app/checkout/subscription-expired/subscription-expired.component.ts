import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../auth.service';
import { RedirectStateService } from '../../services/redirect-state.service';

@Component({
  selector: 'app-subscription-expired',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './subscription-expired.component.html',
  styleUrl: './subscription-expired.component.css'
})
export class SubscriptionExpiredComponent implements OnInit {
  message = 'Your organization subscription has expired. Please contact your administrator.';
  planName: string | null = null;
  isChecking = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private redirectState: RedirectStateService
  ) {}

  ngOnInit(): void {
    
    const handoff = this.redirectState.consume();
    const nav = this.router.getCurrentNavigation();
    let state: any =
      handoff ||
      (nav && nav.extras && nav.extras.state) ||
      (history && (history.state as any)) ||
      {};

    if (!state?.message) {
      try {
        const cached = localStorage.getItem('dashboardInfo');
        if (cached) {
          state = { ...JSON.parse(cached), ...state };
        }
      } catch {
        /* ignore */
      }
    }

    this.message = state?.message || this.message;
    this.planName = state?.plan?.plan_name ?? null;
  }


  checkAgain(): void {
    this.isChecking = true;
    this.router.navigate(['/loading-redirect']);
  }

  logout(): void {
    this.authService.logout();
  }
}