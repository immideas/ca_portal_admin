import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location, CommonModule } from '@angular/common';
import { PaymentService } from '../../services/payment.service';
import { CommonHeaderComponent } from '../../includes/common-header/common-header.component';
import { SidebarComponent } from '../../includes/sidebar/sidebar.component';

@Component({
  selector: 'app-plan-payment',
  standalone: true,
  imports: [CommonModule, CommonHeaderComponent, SidebarComponent],
  templateUrl: './plan-payment.component.html',
  styleUrls: ['./plan-payment.component.css']
})
export class PlanPaymentComponent implements OnInit {


  paymentDetail: any = null;
  loading = false;
  error = '';
  role_code: string | null = null;
  admin = 'admin';
  superAdmin = 'superAdmin';

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    private paymentService: PaymentService
  ) {}

  ngOnInit(): void {
    try {
      this.role_code = localStorage.getItem('role_code');
    } catch (e) {
      this.role_code = null;
    }
    const id = this.route.snapshot.paramMap.get('id') || this.route.snapshot.params['id'];
    if (id) {
      this.loading = true;
      this.paymentService.getPaymentDetails({ id }).subscribe({
        next: (res: any) => {
          this.paymentDetail = this.normalizePaymentDetail(res, id);
          this.loading = false;
        },
        error: (err: any) => {
          this.error = err?.message || 'Failed to load payment details';
          this.loading = false;
        }
      });
    } else {
      this.error = 'No id provided in route';
    }
  }

 get paymentTitle(): string {
    const p = this.paymentDetail?.PlanHistoryById || this.paymentDetail?.data?.[0] || this.paymentDetail;

    return p?.payment_id || p?.transaction_id || p?.subscription_id || p?.razorpay_subscription_id || p?.payment_gateway_order_id || p?.plan_id || 'Payment Details';
  }

  private normalizePaymentDetail(response: any, requestedId?: string | number | null): any {
    if (!response) {
      return null;
    }

    if (response.PlanHistoryById) {
      return response.PlanHistoryById;
    }

    if (Array.isArray(response.data) && response.data.length) {

      if (requestedId != null) {
        const match = response.data.find(
          (rec: any) => String(rec?.id ?? rec?.payment_id) === String(requestedId)
        );
        if (match) return match;
      }
      return response.data[0];
    }

    if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
      return response.data;
    }

    if (response.details && typeof response.details === 'object') {
      return response.details;
    }

    if (response.success === true && Array.isArray(response.data) && response.data.length === 0) {
      return null;
    }

    return response;
  }

  goBack(): void {
    this.location.back();
  }

}
