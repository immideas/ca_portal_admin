
import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgxUiLoaderModule, NgxUiLoaderService } from 'ngx-ui-loader';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';
import { PayoutService } from '../../services/payout.service';

@Component({
  selector: 'app-payout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NgxUiLoaderModule
  ],
  templateUrl: './payout.component.html',
  styleUrls: ['./payout.component.css']
})
export class PayoutComponent implements OnInit, OnDestroy {

  isLoading = false;
  isCashOutLoading = false;

  errorMessage = '';
  successMessage = '';

  payoutSummary: any = null;
  payouts: any[] = [];

  pageSize = 10;
  currentPage = 1;

  private subscriptions = new Subscription();

  constructor(
    private payoutService: PayoutService,
    private loader: NgxUiLoaderService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadPayoutData();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
// Amount still needed to reach the global minimum payout.
get amountNeeded(): number {
  const available = Number(this.payoutSummary?.availableAmount || 0);
  const minimum = Number(this.payoutSummary?.minimumAmount || 0);

  return Number(Math.max(0, minimum - available).toFixed(2));
}

// Check whether the balance has reached the minimum.
get isBelowMinimum(): boolean {
  const available = Number(this.payoutSummary?.availableAmount || 0);
  const minimum = Number(this.payoutSummary?.minimumAmount || 0);

  return available < minimum;
}
  // Load summary and payout history
  loadPayoutData(): void {
    this.loadPendingSummary();
    this.loadPayoutHistory();
  }

  // Get pending balance
  loadPendingSummary(): void {
    this.isLoading = true;
    this.loader.start();

    const sub = this.payoutService.getPendingPayoutSummary().subscribe({
      next: (response: any) => {
        this.payoutSummary = response?.data || null;
        this.isLoading = false;
        this.loader.stop();
      },
      error: (error: any) => {
        this.isLoading = false;
        this.loader.stop();

        this.errorMessage =
          error?.error?.message || 'Failed to load pending balance.';

        this.toastr.error(this.errorMessage, 'Error');
      }
    });

    this.subscriptions.add(sub);
  }

  // Get payout history
  loadPayoutHistory(): void {
    const sub = this.payoutService.getMyPayouts().subscribe({
      next: (response: any) => {
        this.payouts = Array.isArray(response?.data)
          ? response.data
          : [];

        this.currentPage = 1;
      },
      error: (error: any) => {
        console.error('Failed to load payout history:', error);
        this.toastr.error(
          error?.error?.message || 'Failed to load payout history.',
          'Error'
        );
      }
    });

    this.subscriptions.add(sub);
  }

  // Cash out available earnings
  cashOutNow(): void {
    if (
      !this.payoutSummary?.canCashOut ||
      this.isCashOutLoading
    ) {
      return;
    }

    const amount = Number(
      this.payoutSummary?.availableAmount || 0
    );

    if (amount <= 0) {
      this.toastr.warning('No earnings are available for payout.');
      return;
    }

    const confirmed = window.confirm(
      `Do you want to cash out ${this.formatAmount(amount)}?`
    );

    if (!confirmed) {
      return;
    }

    this.isCashOutLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const sub = this.payoutService.cashOutNow().subscribe({
      next: (response: any) => {
        this.isCashOutLoading = false;

        this.successMessage =
          response?.message || 'Payout request submitted.';

        this.toastr.success(this.successMessage, 'Success');

        this.loadPayoutData();
      },
      error: (error: any) => {
        this.isCashOutLoading = false;

        // HTTP 202 may represent an uncertain payout response.
        if (error?.status === 202) {
          this.toastr.warning(
            error?.error?.message ||
              'Payout status is being verified. Please do not retry yet.',
            'Payout Status'
          );

          this.loadPayoutData();
          return;
        }

        this.errorMessage =
          error?.error?.message || 'Failed to initiate payout.';

        this.toastr.error(this.errorMessage, 'Error');
      }
    });

    this.subscriptions.add(sub);
  }

  // Amount formatting
  formatAmount(amount: number | string | null | undefined): string {
    return Number(amount || 0).toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // Paginated payout history
  get paginatedPayouts(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;

    return this.payouts.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.payouts.length / this.pageSize));
  }

  get startEntry(): number {
    return this.payouts.length
      ? (this.currentPage - 1) * this.pageSize + 1
      : 0;
  }

  get endEntry(): number {
    return Math.min(
      this.currentPage * this.pageSize,
      this.payouts.length
    );
  }

  changePageSize(value: string | number): void {
    this.pageSize = Number(value) || 10;
    this.currentPage = 1;
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  // Status badge styling
  getStatusClass(status: string): string {
    switch ((status || '').toUpperCase()) {
      case 'PROCESSED':
      case 'PAID':
        return 'status-success';

      case 'PROCESSING':
      case 'PENDING':
      case 'QUEUED':
        return 'status-processing';

      case 'FAILED':
      case 'CANCELLED':
        return 'status-failed';

      default:
        return 'status-default';
    }
  }

  // Display Manual / Auto
  formatTriggeredBy(value: string): string {
    switch ((value || '').toUpperCase()) {
      case 'MANUAL':
        return 'Manual';
      case 'AUTO':
      case 'AUTOMATIC':
        return 'Automatic';
      default:
        return value || '-';
    }
  }

viewPayout(id: number): void {
  this.payoutService.getMyPayoutById(id).subscribe({
    next: (response: any) => {
      if (response?.success && response?.data) {
        this.toastr.info(
          `Payout #${response.data.id} — ${response.data.status}`,
          'Payout Details'
        );
      } else {
        this.toastr.error('Payout details not found.');
      }
    },
    error: (error: any) => {
      this.toastr.error(
        error?.error?.message || 'Failed to load payout details.'
      );
    }
  });
}

  // Back navigation
  cancel(): void {
    window.history.back();
  }
}
