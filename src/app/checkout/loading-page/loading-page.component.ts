import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../auth.service';
import { Router } from '@angular/router';
import { UserPreferencesService } from '../../includes/common-sidebar/user-preferences.service';
import { LoadingService } from '../../services/loading.service';

@Component({
  selector: 'app-loading-page',
  standalone: true,
  imports: [],
  templateUrl: './loading-page.component.html',
  styleUrl: './loading-page.component.css'
})
export class LoadingPageComponent implements OnInit {

  constructor(
    private authService: AuthService,
    private router: Router,
    private userPreferencesService: UserPreferencesService,
    private loadingService: LoadingService,
  ) {}

  ngOnInit(): void {

    this.proceedWithLoading();
  }

  private proceedWithLoading(): void {

    this.loadingService.getLoading().subscribe(
      (res) => {
        try {
          localStorage.setItem('dashboardInfo', JSON.stringify(res));
          const action = res?.action;
          if (action === 'dashboard') {
            const target = res?.role_code === 'super_admin' ? '/dashboard' : '/user-dashboard';
            this.router.navigate([target]);
            return;
          }

          if (action === 'checkout') {

            if (
              res &&
              res.message &&
              typeof res.message === 'string' &&
              res.message.includes('Buffer ended. Please checkout to continue.')
            ) {
              try {
                this.authService.setLocalStorage(
                  'payment_made',
                  JSON.stringify(false),
                );
              } catch (e) {
                localStorage.setItem('payment_made', JSON.stringify(false));
              }
            }

            this.router.navigate(['/checkout'], {
              state: {
                user_id: res?.user_id ?? null,
                name: res?.name ?? null,
                email: res?.email ?? null,
                contact:res?.contact ?? null,
                planId: res?.assigned_plan_id ?? res?.plan?.id ?? null,
            
                plan: res?.plan ?? null,
                availablePlans: res?.available_plans ?? [],
                autopay: res?.autopay ?? false,
                includeSetupCost: res?.include_setup_cost ?? res?.first_time_payment ?? false,
                firstTimePayment: res?.first_time_payment ?? false,
                skip: res?.skip ?? false,
                message: res?.message ?? ''
              }
            });
            return;
          }

        
          if (action === 'subscription_expired') {
            this.router.navigate(['/subscription-expired'], {
              state: {
                message: res?.message ?? 'Your organization subscription has expired. Please contact your administrator.',
                admin_id: res?.admin_id ?? null,
                plan: res?.plan ?? null,
                name: res?.name ?? null,
              }
            });
            return;
          }

          console.warn('Unknown action from loading API:', action);
        } catch (e) {
          console.error('Error processing loading response', e);
        }
      },
      (err) => {
        console.error('loading error', err);

        if (err && err.status === 401) {
          this.router.navigate(['/login']);
        }
      },
    );
  }
}