import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
} from "@angular/core";

import { CommonModule } from "@angular/common";

import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import {
  PaginationFooterComponent,
  PageChangeEvent,
} from "../../shared/pagination-footer/pagination-footer.component";

import { DocumentRequestService } from "../../services/document-request.service";

import { Subject, debounceTime, distinctUntilChanged } from "rxjs";

@Component({
  selector: "app-payments-history",
  standalone: true,

  imports: [CommonModule, FormsModule, PaginationFooterComponent],

  templateUrl: "./payments-history.component.html",

  styleUrls: ["./payments-history.component.scss"],
})
export class PaymentsHistoryComponent implements OnInit, OnDestroy {
  // ============================================================
  // PAYMENT DATA
  // ============================================================

  payments: any[] = [];

  filteredPayments: any[] = [];

  loading = false;

  // ============================================================
  // SEARCH
  // ============================================================

  search = "";

  statusFilter = "";

  paymentDateFrom = "";

  paymentDateTo = "";

  /**
   * Search debounce subject
   */
  private searchSubject = new Subject<string>();

  // ============================================================
  // PAGINATION
  // ============================================================

  pageSize = 10;

  currentPage = 1;

  totalItems = 0;

  // ============================================================
  // SUMMARY CARDS
  // ============================================================

  totalReceived = 0;

  thisMonthReceived = 0;

  transactionCount = 0;

  paymentDue = 0;

  // ============================================================
  // INVOICE
  // ============================================================

  selectedPayment: any = null;

  showInvoice = false;
  showFilters = false;

  // ============================================================
  // CONSTRUCTOR
  // ============================================================

constructor(
  private documentRequestService: DocumentRequestService,
  private router: Router
) {}

  // ============================================================
  // LIFECYCLE
  // ============================================================

  ngOnInit(): void {
    /*
     * ========================================================
     * SEARCH DEBOUNCE
     * ========================================================
     */

    this.searchSubject
      .pipe(debounceTime(500), distinctUntilChanged())
      .subscribe((searchValue: string) => {
        this.search = searchValue;

        this.currentPage = 1;

        this.loadPayments();
      });

    /*
     * ========================================================
     * INITIAL LOAD
     * ========================================================
     */

    this.loadPayments();
  }

  // ============================================================
  // LOAD PAYMENTS
  // ============================================================

  loadPayments(): void {
    this.loading = true;

    /*
     * ========================================================
     * BACKEND REQUEST
     * ========================================================
     */

    const payload = {
      page: this.currentPage,

      pageSize: this.pageSize,

      search: this.search.trim(),

      status: this.statusFilter,

      paymentDateFrom: this.paymentDateFrom || null,

      paymentDateTo: this.paymentDateTo || null,
    };

    console.log("Payment History Request:", payload);

    this.documentRequestService
      .getAllServiceRequestPayments(payload)
      .subscribe({
        next: (response: any) => {
          console.log("Service Request Payments Response:", response);

          if (response?.success) {
            /*
             * ==================================================
             * PAYMENT DATA
             * ==================================================
             */

            this.payments = Array.isArray(response.data) ? response.data : [];

            /*
             * ==================================================
             * BACKEND ALREADY FILTERED
             * AND PAGINATED
             * ==================================================
             */

            this.filteredPayments = this.payments;

            /*
             * ==================================================
             * TOTAL ITEMS
             * ==================================================
             */

            this.totalItems = Number(response.totalItems || 0);

            /*
             * ==================================================
             * KEEP EXISTING SUMMARY LOGIC
             * ==================================================
             */

            this.calculateSummary();
          } else {
            this.resetPayments();
          }

          this.loading = false;
        },

        error: (error: any) => {
          this.loading = false;

          console.error("Error fetching service request payments:", error);

          this.resetPayments();
        },
      });
  }
openInvoicePayment(payment: any): void {
  console.log("Clicked Payment Object:", payment);

  const documentRequestId =
    payment?.documentRequestId ??
    payment?.document_request_id;

  if (!documentRequestId) {
    console.error("Document Request ID missing:", payment);
    return;
  }

  this.router.navigate(
    ["/service-view", documentRequestId],
    {
      queryParams: {
        tab: "payment"
      }
    }
  );
}
  // ============================================================
  // RESET
  // ============================================================

  resetPayments(): void {
    this.payments = [];

    this.filteredPayments = [];

    this.totalItems = 0;

    this.totalReceived = 0;

    this.thisMonthReceived = 0;

    this.transactionCount = 0;

    this.paymentDue = 0;
  }

  // ============================================================
  // SUMMARY
  // ============================================================

  calculateSummary(): void {
    /*
     * ========================================================
     * TOTAL RECEIVED
     * ========================================================
     */

    this.totalReceived = this.payments

      .filter(
        (payment: any) =>
          String(payment?.status || "").toUpperCase() === "PAID",
      )

      .reduce((total: number, payment: any) => {
        return total + Number(payment?.amount || 0);
      }, 0);

    /*
     * ========================================================
     * TRANSACTIONS
     * ========================================================
     */

    this.transactionCount = this.payments.filter(
      (payment: any) => String(payment?.status || "").toUpperCase() === "PAID",
    ).length;

    /*
     * ========================================================
     * THIS MONTH
     * ========================================================
     */

    const now = new Date();

    this.thisMonthReceived = this.payments

      .filter((payment: any) => {
        const status = String(payment?.status || "").toUpperCase();

        if (status !== "PAID") {
          return false;
        }

        if (!payment?.paidAt) {
          return false;
        }

        const paymentDate = new Date(payment.paidAt);

        if (isNaN(paymentDate.getTime())) {
          return false;
        }

        return (
          paymentDate.getMonth() === now.getMonth() &&
          paymentDate.getFullYear() === now.getFullYear()
        );
      })

      .reduce((total: number, payment: any) => {
        return total + Number(payment?.amount || 0);
      }, 0);

    /*
     * ========================================================
     * PAYMENT DUE
     * ========================================================
     */

    this.paymentDue = this.payments

      .filter((payment: any) => {
        const status = String(payment?.status || "").toUpperCase();

        return status === "PENDING" || status === "PAYMENT_DUE";
      })

      .reduce((total: number, payment: any) => {
        return total + Number(payment?.amount || 0);
      }, 0);
  }

  // ============================================================
  // SEARCH
  // ============================================================

  onSearchChange(): void {
    /*
     * Send search value to debounce subject.
     *
     * API will be called only after
     * user stops typing for 500ms.
     */

    this.searchSubject.next(this.search);
  }

  // ============================================================
  // FILTER
  // ============================================================

  onFilterChange(): void {
    this.currentPage = 1;

    this.loadPayments();
  }
  getActiveFilterCount(): number {
  let count = 0;

  if (this.statusFilter) {
    count++;
  }

  if (this.paymentDateFrom) {
    count++;
  }

  if (this.paymentDateTo) {
    count++;
  }

  return count;
}
resetFilters(): void {
  this.statusFilter = "";
  this.paymentDateFrom = "";
  this.paymentDateTo = "";

  this.currentPage = 1;
  this.loadPayments();
}
toggleFilters(event: MouseEvent): void {
  event.preventDefault();
  event.stopPropagation();

  this.showFilters = !this.showFilters;
}

closeFilters(): void {
  this.showFilters = false;
}

applyFilters(): void {
  this.currentPage = 1;
  this.loadPayments();
  this.showFilters = false;
}
  // ============================================================
  // PAGINATION
  // ============================================================

  onPageChange(event: PageChangeEvent | any): void {
    /*
     * Same event handling logic
     * as your previous implementation.
     */

    if (event && typeof event === "object" && "page" in event) {
      this.currentPage = event.page;

      this.pageSize = event.pageSize;
    } else {
      this.currentPage = event;
    }

    /*
     * Backend pagination
     */

    this.loadPayments();
  }

  // ============================================================
  // PAGE SIZE
  // ============================================================

  onPageSizeChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;

    this.pageSize = Number(selectElement.value);

    this.currentPage = 1;

    /*
     * Backend pagination
     */

    this.loadPayments();
  }

  // ============================================================
  // SERVICES
  // ============================================================

  getServices(payment: any): any[] {
    if (Array.isArray(payment?.services) && payment.services.length > 0) {
      return payment.services;
    }

    if (payment?.service) {
      return [payment.service];
    }

    return [];
  }

  // ============================================================
  // PRIMARY SERVICE
  // ============================================================

  getPrimaryService(payment: any): any {
    const services = this.getServices(payment);

    return services.length ? services[0] : null;
  }

  // ============================================================
  // ADDITIONAL SERVICES
  // ============================================================

  getAdditionalServices(payment: any): any[] {
    const services = this.getServices(payment);

    return services.length > 1 ? services.slice(1) : [];
  }

  // ============================================================
  // FORMAT AMOUNT
  // ============================================================

  formatAmount(amount: any): string {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",

      currency: "INR",

      maximumFractionDigits: 2,
    }).format(Number(amount || 0));
  }

  // ============================================================
  // FORMAT DATE
  // ============================================================

  formatDate(date: any): string {
    if (!date) {
      return "—";
    }

    const parsedDate = new Date(date);

    if (isNaN(parsedDate.getTime())) {
      return "—";
    }

    return parsedDate.toLocaleDateString("en-IN", {
      day: "2-digit",

      month: "short",

      year: "numeric",
    });
  }

  // ============================================================
  // STATUS CLASS
  // ============================================================

  getStatusClass(status: string): string {
    switch (String(status || "").toUpperCase()) {
      case "PAID":
        return "status-paid";

      case "PENDING":

      case "PAYMENT_DUE":
        return "status-pending";

      case "FAILED":
        return "status-failed";

      case "REFUNDED":
        return "status-refunded";

      default:
        return "status-default";
    }
  }

  // ============================================================
  // VIEW INVOICE
  // ============================================================

  viewInvoice(payment: any): void {
    this.selectedPayment = payment;

    this.showInvoice = true;

    document.body.style.overflow = "hidden";
  }

  // ============================================================
  // CLOSE INVOICE
  // ============================================================

  closeInvoice(): void {
    this.showInvoice = false;

    this.selectedPayment = null;

    document.body.style.overflow = "";
  }

  // ============================================================
  // TRACK BY
  // ============================================================

  trackByPayment(index: number, payment: any): any {
    return payment?.id || index;
  }

  // ============================================================
  // DESTROY
  // ============================================================

  ngOnDestroy(): void {
    this.searchSubject.complete();
  }
}
