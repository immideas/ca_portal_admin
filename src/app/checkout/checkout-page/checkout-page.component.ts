import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PaymentService } from '../../services/payment.service';
import { environment } from '../../../environments/environment';
import { PlansService } from '../../services/plans.service';
import { RedirectStateService } from '../../services/redirect-state.service';
import { AuthService } from '../../auth.service';
import { RazorpayService } from '../../services/razorpay.service';

@Component({
  selector: 'app-checkout-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './checkout-page.component.html',
  styleUrl: './checkout-page.component.css'
})
export class CheckoutPageComponent implements OnInit {
  user_id: any;
  displayName: string | null = null;
  planId: number | null = null;
  planFromState: any = null;
  autopay = false;
  includeSetupCost = false;
  firstTimePayment = false;
  skipAllowed = false;

  plansLoading = true;
  selectedPlan: any = null;

  availablePlans: any[] = [];
  showPlanModal = false;
  paymentSummary = {
    planSubtotal: 0,
    setupSubtotal: 0,
    subtotal: 0,

    planCGST: 0,
    planSGST: 0,
    setupCGST: 0,
    setupSGST: 0,

    totalCGST: 0,
    totalSGST: 0,

    grandTotal: 0
  };

  isLoading = false;

  constructor(
    private paymentService: PaymentService,
    private planService: PlansService,
    private router: Router,
    private redirectState: RedirectStateService,
    private authService: AuthService,
      private razorpayService: RazorpayService

  ) {

    const handoff = this.redirectState.consume();
    const nav = this.router.getCurrentNavigation();
    const state: any =
      handoff ||
      (nav && nav.extras && nav.extras.state) ||
      (history && (history.state as any)) ||
      {};


    const src = state.paymentData ?? state;

    this.user_id = src.user_id ?? localStorage.getItem('user_id');
    this.displayName = src.name ?? localStorage.getItem('name');
    this.planId = src.planId ?? src.plan?.id ?? null;
    this.planFromState = src.plan ?? null;
    this.autopay = src.autopay === true;
    this.includeSetupCost = src.includeSetupCost === true || src.first_time_payment === true;
    this.firstTimePayment = src.firstTimePayment === true || src.first_time_payment === true;

    if (
      src.skip === true ||
      src.message === 'Within buffer period. Checkout with skip allowed.'
    ) {
      this.skipAllowed = true;
    }
  }

  ngOnInit(): void {

    if (this.planFromState) {
      this.selectedPlan = this.planFromState;
      this.preparePaymentSummary();
      this.plansLoading = false;
      return;
    }


    if (!this.planId) {
      this.router.navigate(['/login']);
      return;
    }
    this.getPlan();
  }

  getPlan(): void {
    this.plansLoading = true;

    this.planService.getPaidPlans().subscribe({
      next: (res: any) => {
        const plans = res?.data ?? res ?? [];
        this.selectedPlan = Array.isArray(plans)
          ? plans.find((p: any) => p.id === this.planId) ?? null
          : null;
        if (!this.selectedPlan) {
        }
        this.preparePaymentSummary();
        this.plansLoading = false;
      },
      error: (err: any) => {
        console.error('Failed to load plan:', err);
        this.plansLoading = false;
      }
    });
  }

  preparePaymentSummary(): void {
    if (!this.selectedPlan) {
      return;
    }

    const p = this.selectedPlan;

    this.paymentSummary.planSubtotal = Number(p.plan_price_subtotal) || 0;
    this.paymentSummary.planCGST = Number(p.plan_price_cgst) || 0;
    this.paymentSummary.planSGST = Number(p.plan_price_sgst) || 0;

    if (this.includeSetupCost) {
      this.paymentSummary.setupSubtotal = Number(p.setup_cost_subtotal) || 0;
      this.paymentSummary.setupCGST = Number(p.setup_cost_cgst) || 0;
      this.paymentSummary.setupSGST = Number(p.setup_cost_sgst) || 0;
    } else {
      this.paymentSummary.setupSubtotal = 0;
      this.paymentSummary.setupCGST = 0;
      this.paymentSummary.setupSGST = 0;
    }

    this.paymentSummary.subtotal =
      this.paymentSummary.planSubtotal + this.paymentSummary.setupSubtotal;

    this.paymentSummary.totalCGST =
      this.paymentSummary.planCGST + this.paymentSummary.setupCGST;

    this.paymentSummary.totalSGST =
      this.paymentSummary.planSGST + this.paymentSummary.setupSGST;

    this.paymentSummary.grandTotal =
      this.paymentSummary.subtotal +
      this.paymentSummary.totalCGST +
      this.paymentSummary.totalSGST;
  }


  loadAvailablePlans(): void {
    this.planService.getPaidPlans().subscribe({
      next: (res: any) => {
        const plans = res?.data ?? res ?? [];
        this.availablePlans = Array.isArray(plans) ? plans : [];
        this.showPlanModal = true;
      },
      error: (err: any) => {
        console.error('Failed to load available plans:', err);
      }
    });
  }

  selectPlan(plan: any): void {
    this.selectedPlan = plan;
    this.showPlanModal = false;

    this.preparePaymentSummary();
  }

  proceedToPayment(): void {
    if (!this.user_id) {
      return;
    }
    if (!this.selectedPlan) {
      return;
    }

    this.isLoading = true;

    if (this.autopay) {
      this.createSubscriptionPayment();
    } else {
      this.createOrderPayment();
    }
  }
private createOrderPayment(): void {
  this.paymentService.createRazorpayOrder({
    plan_id: this.selectedPlan.id
  }).subscribe({
    next: async (res: any) => {

      this.isLoading = false;

      const order = res?.data?.order;
      const razorpayKeyId =
        res?.data?.razorpayKeyId || environment.razorpayKeyId;

      if (!order?.id) {
        console.error('Razorpay order not found:', res);
        return;
      }

      const options: any = {
        key: razorpayKeyId,
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        name: 'Resolvenest',
        description: this.selectedPlan.plan_name,

        handler: (response: any) => {
          this.verifyPayment(response);
        },

        prefill: {
          name: localStorage.getItem('name') || '',
          email: localStorage.getItem('email') || '',
          contact: localStorage.getItem('mobile') || ''
        },

        theme: {
          color: '#3399cc'
        }
      };

      try {
        const response =
          await this.razorpayService.openPaymentModal(options);

        console.log('Payment response:', response);

      } catch (error: any) {
        console.log('Payment cancelled:', error);
      }
    },

    error: (err: any) => {
      this.isLoading = false;
      console.error('Create order failed:', err);
    }
  });
}


  private createSubscriptionPayment(): void {
    this.paymentService.createSubscription({ plan_id: this.selectedPlan.id }).subscribe({
      next: async (response: any) => {
        this.isLoading = false;

        if (!response?.subscription_id) {
          return;
        }

        const options: any = {
          key: response.key || environment.razorpayKeyId,
          subscription_id: response.subscription_id,

          amount: response.amount,
          name: 'Resolvenest',
          description: this.selectedPlan.plan_name,
          handler: (response: any) => {

            console.log('Subscription Success:', response);
            localStorage.setItem('payment_made', 'true');
            this.router.navigate(['/payment-confirmation'], {
              state: {
                plan: this.selectedPlan,
                paymentSummary: this.paymentSummary,
                autopay: this.autopay,
                razorpay_payment_id: response.razorpay_payment_id,
                paymentResponse: response
              }
            });
          },
          prefill: {
            name: localStorage.getItem('name') || '',
            email: localStorage.getItem('email') || '',
            contact: localStorage.getItem('mobile') || ''
          },
          theme: { color: '#3399cc' }
        };

try {

  await this.razorpayService.openPaymentModal(options);

} catch (error) {

  console.log('Subscription payment cancelled:', error);

}
      },
      error: (err) => {
        this.isLoading = false;
      }
    });
  }

  private verifyPayment(response: any): void {
    if (!response || !response.razorpay_order_id || !response.razorpay_payment_id || !response.razorpay_signature) {
      console.error('Payment verification failed: Missing required fields in response.', response);
      return;
    }

    const payload = {
      order_id: response.razorpay_order_id,
      payment_id: response.razorpay_payment_id,
      razorpay_signature: response.razorpay_signature
    };

    this.paymentService.verifyPayment(payload).subscribe({
      next: (res: any) => {
        localStorage.setItem('payment_made', 'true');

        this.router.navigate(['/payment-confirmation'], {
          state: {
            plan: res.plan || this.selectedPlan,
            payment: res.payment || null,
            paymentSummary: this.paymentSummary,
            autopay: this.autopay,
            razorpay_payment_id: response.razorpay_payment_id,
            paymentResponse: response,
            verificationResponse: res
          }
        });
      },
      error: (err) => {
        console.error('Payment verification failed:', err);
      }
    });
  }

  logout(): void {
    this.authService.logout();
  }


  goToDashboard(): void {
    let target = '/user-dashboard';
    try {
      const info = JSON.parse(localStorage.getItem('dashboardInfo') || '{}');
      target = info?.role_code === 'super_admin' ? '/dashboard' : '/user-dashboard';
    } catch (e) {
      target = '/user-dashboard';
    }
    this.router.navigateByUrl(target);
  }


}
