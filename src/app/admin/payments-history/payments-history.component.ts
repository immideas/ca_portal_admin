import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

import {
  PaginationFooterComponent,
  PageChangeEvent,
} from "../../shared/pagination-footer/pagination-footer.component";

import { DocumentRequestService } from "../../services/document-request.service";

@Component({
  selector: "app-payments-history",
  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    PaginationFooterComponent,
  ],

  templateUrl: "./payments-history.component.html",
  styleUrls: ["./payments-history.component.scss"],
})
export class PaymentsHistoryComponent implements OnInit {

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


  // ============================================================
  // CONSTRUCTOR
  // ============================================================

  constructor(
    private documentRequestService: DocumentRequestService
  ) {}


  // ============================================================
  // LIFECYCLE
  // ============================================================

  ngOnInit(): void {
    this.loadPayments();
  }


  // ============================================================
  // LOAD PAYMENTS
  // ============================================================

  loadPayments(): void {

    this.loading = true;

    this.documentRequestService
      .getAllServiceRequestPayments()
      .subscribe({

        next: (response: any) => {

          console.log(
            "Service Request Payments Response:",
            response
          );

          if (response?.success) {

            this.payments =
              Array.isArray(response.data)
                ? response.data
                : [];

            this.calculateSummary();

            this.applyFilters();

          } else {

            this.resetPayments();

          }

          this.loading = false;
        },

        error: (error: any) => {

          this.loading = false;

          console.error(
            "Error fetching service request payments:",
            error
          );

          this.resetPayments();
        },

      });
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
     * TOTAL RECEIVED
     */

    this.totalReceived =
      this.payments
        .filter(
          (payment: any) =>
            String(
              payment?.status || ""
            ).toUpperCase() === "PAID"
        )
        .reduce(
          (
            total: number,
            payment: any
          ) => {

            return (
              total +
              Number(
                payment?.amount || 0
              )
            );

          },
          0
        );


    /*
     * TRANSACTIONS
     */

    this.transactionCount =
      this.payments.filter(
        (payment: any) =>
          String(
            payment?.status || ""
          ).toUpperCase() === "PAID"
      ).length;


    /*
     * THIS MONTH
     */

    const now = new Date();

    this.thisMonthReceived =
      this.payments
        .filter(
          (payment: any) => {

            const status =
              String(
                payment?.status || ""
              ).toUpperCase();

            if (status !== "PAID") {
              return false;
            }

            if (!payment?.paidAt) {
              return false;
            }

            const paymentDate =
              new Date(
                payment.paidAt
              );

            if (
              isNaN(
                paymentDate.getTime()
              )
            ) {
              return false;
            }

            return (
              paymentDate.getMonth() ===
                now.getMonth() &&
              paymentDate.getFullYear() ===
                now.getFullYear()
            );
          }
        )
        .reduce(
          (
            total: number,
            payment: any
          ) => {

            return (
              total +
              Number(
                payment?.amount || 0
              )
            );

          },
          0
        );


    /*
     * PAYMENT DUE
     */

    this.paymentDue =
      this.payments
        .filter(
          (payment: any) => {

            const status =
              String(
                payment?.status || ""
              ).toUpperCase();

            return (
              status === "PENDING" ||
              status === "PAYMENT_DUE"
            );
          }
        )
        .reduce(
          (
            total: number,
            payment: any
          ) => {

            return (
              total +
              Number(
                payment?.amount || 0
              )
            );

          },
          0
        );
  }


  // ============================================================
  // SEARCH
  // ============================================================

  onSearchChange(): void {

    this.currentPage = 1;

    this.applyFilters();
  }


  // ============================================================
  // APPLY SEARCH + PAGINATION
  // ============================================================

  applyFilters(): void {

    let data =
      [...this.payments];

    const searchValue =
      this.search
        .trim()
        .toLowerCase();


    if (searchValue) {

      data =
        data.filter(
          (payment: any) => {

            const invoiceNumber =
              String(
                payment?.invoiceNumber || ""
              ).toLowerCase();

            const requestCode =
              String(
                payment?.requestCode || ""
              ).toLowerCase();

            const clientName =
              String(
                payment?.client?.clientName ||
                payment?.clientName ||
                ""
              ).toLowerCase();

            const fileNo =
              String(
                payment?.client?.fileNo ||
                ""
              ).toLowerCase();

            const taskName =
              String(
                payment?.taskName || ""
              ).toLowerCase();

            const serviceName =
              String(
                payment?.service?.serviceName ||
                payment?.serviceName ||
                ""
              ).toLowerCase();

            const paymentMethod =
              String(
                payment?.paymentMethod || ""
              ).toLowerCase();

            const transactionId =
              String(
                payment?.transactionId || ""
              ).toLowerCase();


            return (
              invoiceNumber.includes(searchValue) ||
              requestCode.includes(searchValue) ||
              clientName.includes(searchValue) ||
              fileNo.includes(searchValue) ||
              taskName.includes(searchValue) ||
              serviceName.includes(searchValue) ||
              paymentMethod.includes(searchValue) ||
              transactionId.includes(searchValue)
            );
          }
        );
    }


    /*
     * TOTAL FILTERED ITEMS
     */

    this.totalItems =
      data.length;


    /*
     * PAGINATION
     */

    const startIndex =
      (this.currentPage - 1) *
      this.pageSize;

    const endIndex =
      startIndex +
      this.pageSize;


    this.filteredPayments =
      data.slice(
        startIndex,
        endIndex
      );
  }


  // ============================================================
  // PAGINATION
  // ============================================================

  onPageChange(
    event: PageChangeEvent | any
  ): void {

    /*
     * Same logic used by
     * DocumentRequestListComponent.
     */

    if (
      event &&
      typeof event === "object" &&
      "page" in event
    ) {

      this.currentPage =
        event.page;

      this.pageSize =
        event.pageSize;

    } else {

      this.currentPage =
        event;
    }


    this.applyFilters();
  }


  // ============================================================
  // PAGE SIZE
  // ============================================================

  onPageSizeChange(
    event: Event
  ): void {

    const selectElement =
      event.target as HTMLSelectElement;

    this.pageSize =
      Number(
        selectElement.value
      );

    this.currentPage = 1;

    this.applyFilters();
  }


  // ============================================================
  // SERVICES
  // ============================================================

  getServices(
    payment: any
  ): any[] {

    if (
      Array.isArray(
        payment?.services
      ) &&
      payment.services.length > 0
    ) {

      return payment.services;
    }


    if (payment?.service) {

      return [
        payment.service
      ];
    }


    return [];
  }


  // ============================================================
  // PRIMARY SERVICE
  // ============================================================

  getPrimaryService(
    payment: any
  ): any {

    const services =
      this.getServices(
        payment
      );

    return services.length
      ? services[0]
      : null;
  }


  // ============================================================
  // ADDITIONAL SERVICES
  // ============================================================

  getAdditionalServices(
    payment: any
  ): any[] {

    const services =
      this.getServices(
        payment
      );

    return services.length > 1
      ? services.slice(1)
      : [];
  }


  // ============================================================
  // FORMAT AMOUNT
  // ============================================================

  formatAmount(
    amount: any
  ): string {

    return new Intl.NumberFormat(
      "en-IN",
      {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
      }
    ).format(
      Number(
        amount || 0
      )
    );
  }


  // ============================================================
  // FORMAT DATE
  // ============================================================

  formatDate(
    date: any
  ): string {

    if (!date) {
      return "—";
    }

    const parsedDate =
      new Date(date);

    if (
      isNaN(
        parsedDate.getTime()
      )
    ) {
      return "—";
    }

    return parsedDate.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  }


  // ============================================================
  // STATUS CLASS
  // ============================================================

  getStatusClass(
    status: string
  ): string {

    switch (
      String(
        status || ""
      ).toUpperCase()
    ) {

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

  viewInvoice(
    payment: any
  ): void {

    this.selectedPayment =
      payment;

    this.showInvoice =
      true;

    document.body.style.overflow =
      "hidden";
  }


  // ============================================================
  // CLOSE INVOICE
  // ============================================================

  closeInvoice(): void {

    this.showInvoice =
      false;

    this.selectedPayment =
      null;

    document.body.style.overflow =
      "";
  }


  // ============================================================
  // TRACK BY
  // ============================================================

  trackByPayment(
    index: number,
    payment: any
  ): any {

    return (
      payment?.id ||
      index
    );
  }

}