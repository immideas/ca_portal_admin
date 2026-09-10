import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import { LoadingService } from './services/loading.service';
import { RedirectStateService } from './services/redirect-state.service';

export const paymentStatusGuard: CanActivateFn = () => {
  const loadingService = inject(LoadingService);
  const router = inject(Router);
  const redirectState = inject(RedirectStateService);

  return loadingService.getLoading().pipe(
    map((res) => {
      if (res?.action === 'dashboard') {
        return true;
      }

      if (res?.action === 'checkout') {
        // FIX: Agar 'skip' true hai (buffer window active hai aur admin ne payment skip kiya hai),
        // toh navigation allow (true) karein taaki loop na bane aur user dashboard dekh sake.
        if (res?.skip === true) {
          return true;
        }

        const paymentData: any = {
          user_id: res?.user_id ?? null,
          name: res?.name ?? null,
          plan: res?.plan ?? null,
          autopay: res?.autopay ?? false,
          message: res?.message ?? '',
          skip: res?.skip ?? false,
          admin_id: res?.admin_id ?? null,
          first_time_payment: res?.first_time_payment ?? false,
          email: res?.email ?? false,
          contact_no: res?.contact_no ?? false,
        };

        redirectState.set({ paymentData });
        return router.parseUrl('/checkout');
      }

      if (res?.action === 'subscription_expired') {
        redirectState.set({
          message: res?.message ?? 'Your organization subscription has expired. Please contact your administrator.',
          admin_id: res?.admin_id ?? null,
          plan: res?.plan ?? null,
        });
        return router.parseUrl('/subscription-expired');
      }

      console.warn('paymentStatusGuard: unknown action from loading API:', res?.action);
      return router.parseUrl('/login');
    }),
    catchError((err) => {
      console.error('paymentStatusGuard error:', err);
      return of(router.parseUrl('/login'));
    })
  );
};
