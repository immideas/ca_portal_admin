import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import jsPDF from 'jspdf';
import { PaymentService } from '../../services/payment.service';
@Component({
  selector: 'app-payment-confirmation',
  standalone: true,

  imports: [CommonModule],
  templateUrl: './payment-confirmation.component.html',
  styleUrl: './payment-confirmation.component.css'
})
export class PaymentConfirmationComponent implements OnInit {
  plan: any = null;
  planName: string | null = null;

  payment: any = null;

  paymentSummary: any = null;
  autopay: boolean = false;
  razorpayPaymentId: string | null = null;
  paymentResponse: any = null;
  verificationResponse: any = null;
  hasState: boolean = true;
  showRaw: boolean = false;
  copiedField: string | null = null;

  loadingDetails: boolean = false;
  detailsError: string | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private paymentService: PaymentService
  ) {

    const nav = this.router.getCurrentNavigation();
    let state: any = null;

    if (nav && nav.extras && nav.extras.state) {
      state = nav.extras.state;
    } else if (history && (history.state as any)) {
      state = history.state;
    }

   if (state) {
      this.payment = state.payment ?? null;

      this.plan = state.plan ?? this.payment?.Plan ?? {};

      if (this.plan) {
        this.plan.starting_date =
          this.plan.starting_date ??
          this.payment?.starting_date ??
          this.payment?.Plan?.starting_date ??
          state.starting_date ??
          null;
        this.plan.expiration_date =
          this.plan.expiration_date ??
          this.payment?.expiration_date ??
          this.payment?.Plan?.expiration_date ??
          state.expiration_date ??
          null;
      }

      this.planName = state.planName ?? (this.plan && (this.plan.plan_name || this.plan.name)) ?? null;
      this.paymentSummary = state.paymentSummary ?? null;
      this.autopay = state.autopay === true;
      this.razorpayPaymentId = state.razorpay_payment_id ?? this.payment?.payment_id ?? null;
      this.paymentResponse = state.paymentResponse ?? state.verificationResponse ?? null;
      this.verificationResponse = state.verificationResponse ?? null;
    }
     else {
      this.hasState = false;
    }
  }



  get planSubtotal(): number | null {
    if (this.payment) return Number(this.payment.subtotal) - Number(this.payment.setup_cost_subtotal || 0);
    return this.paymentSummary ? Number(this.paymentSummary.planSubtotal) : null;
  }

  get setupSubtotal(): number | null {
    if (this.payment) return Number(this.payment.setup_cost_subtotal || 0);
    return this.paymentSummary ? Number(this.paymentSummary.setupSubtotal) : null;
  }

  get hasSetupCost(): boolean {
    const v = this.setupSubtotal;
    return !!v && v > 0;
  }

  get totalCGST(): number | null {
    if (this.payment) return Number(this.payment.cgst);
    return this.paymentSummary ? Number(this.paymentSummary.totalCGST) : null;
  }

  get totalSGST(): number | null {
    if (this.payment) return Number(this.payment.sgst);
    return this.paymentSummary ? Number(this.paymentSummary.totalSGST) : null;
  }

  get grandTotal(): number | null {
    if (this.payment) return Number(this.payment.amount);
    return this.paymentSummary ? Number(this.paymentSummary.grandTotal) : null;
  }

  get currency(): string {
    return this.payment?.currency || this.plan?.currency || 'INR';
  }

  get paymentStatusLabel(): string {
    const s = this.payment?.status;
    if (!s) return this.autopay ? 'Subscription Created' : 'Paid';
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  get paidAtFormatted(): string | null {
    if (!this.payment?.paid_at) return null;
    try {
      return new Date(this.payment.paid_at).toLocaleString('en-IN');
    } catch {
      return this.payment.paid_at;
    }
  }

  get orderOrSubscriptionLabel(): string {
    return this.autopay ? 'Subscription ID' : 'Order ID';
  }

  get orderOrSubscriptionId(): string | null {
    if (this.autopay) {
      return this.payment?.razorpay_subscription_id || this.paymentResponse?.razorpay_subscription_id || null;
    }
    return this.paymentResponse?.razorpay_order_id || this.payment?.payment_gateway_order_id || null;
  }

  ngOnInit(): void {

    if (!this.hasState) {
      const paymentMade = localStorage.getItem('payment_made');
      if (paymentMade === 'true') {

        this.hasState = true;
      }
    }

    const routeId = this.route.snapshot.paramMap.get('id');
    if (routeId) {
      this.fetchPaymentDetails(routeId);
    }
  }

  private fetchPaymentDetails(id: string | number): void {
    this.loadingDetails = true;
    this.detailsError = null;

    this.paymentService.getPaymentDetails({ id }).subscribe({
      next: (res: any) => {
        const data = res?.data ?? res;

        if (data) {
         
          this.payment = { ...this.payment, ...data };
          this.plan = { ...this.plan, ...(data.Plan || {}) };

          this.planName = this.plan?.plan_name || this.plan?.name || this.planName;
          this.razorpayPaymentId = this.razorpayPaymentId || data.payment_id || null;

          if (!this.autopay && data.subscription_id) {
            this.autopay = true;
          }

          this.hasState = true;
        }

        this.loadingDetails = false;
      },
      error: (err: any) => {
        console.error('Failed to load payment details:', err);
        this.detailsError = err?.error?.message || err?.message || 'Failed to load payment details.';
        this.loadingDetails = false;
      }
    });
  }

  get isConfirmed(): boolean {
    return !!this.razorpayPaymentId && !!this.paymentResponse;
  }

  copyToClipboard(field: string, text?: string | null): void {
    if (!text) return;

    const toCopy = String(text);

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(toCopy)
        .then(() => this.showCopyFeedback(field))
        .catch(() => this.fallbackCopy(toCopy, field));
    } else {
      this.fallbackCopy(toCopy, field);
    }
  }

  private fallbackCopy(text: string, field: string): void {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '-9999px';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);

      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);

      if (successful) {
        this.showCopyFeedback(field);
      }
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  }

  private showCopyFeedback(field: string): void {
    this.copiedField = field;
    setTimeout(() => {
      this.copiedField = null;
    }, 2000);
  }

  toggleRaw(): void {
    this.showRaw = !this.showRaw;
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
  closeConfirmation(): void {
    window.history.back();
  }

  downloadInvoice(): void {
    const invoiceNumber = 'INV-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const left = 48;
    const right = 555;
    let y = 56;

    const planTitle = this.planName || (this.plan && (this.plan.plan_name || this.plan.name)) || 'Plan';
    const paymentId = this.razorpayPaymentId || (this.paymentResponse && this.paymentResponse.razorpay_payment_id) || '';
    const orderId = this.paymentResponse?.razorpay_order_id || '';

    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text('Resolvenest', left, y);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const invoiceX = right;
    doc.text(`Invoice: ${invoiceNumber}`, invoiceX, y, { align: 'right' });
    y += 18;
    doc.text(`Date: ${this.formatDate(new Date().toISOString())}`, invoiceX, y, { align: 'right' });

    y += 18;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(planTitle, left, y);

    y += 28;
    doc.setLineWidth(0.5);
    doc.setDrawColor(220);
    doc.line(left, y - 6, right, y - 6);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Description', left, y);
    doc.text('Amount', right, y, { align: 'right' });

    y += 14;
    doc.setLineWidth(0.3);
    doc.setDrawColor(230);
    doc.line(left, y, right, y);
    y += 12;

    const setupCost = this.setupSubtotal || 0;
    const monthlyCost = this.planSubtotal || 0;
    const cgst = this.totalCGST || 0;
    const sgst = this.totalSGST || 0;


    const inr = new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    const fmt = (n: number) => n ? `Rs. ${inr.format(n)}` : '-';

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text('Plan Subtotal', left, y);
    doc.text(fmt(monthlyCost), right, y, { align: 'right' });
    y += 18;

    if (setupCost > 0) {
      doc.text('Setup Cost', left, y);
      doc.text(fmt(setupCost), right, y, { align: 'right' });
      y += 18;
    }

    doc.text('CGST', left, y);
    doc.text(fmt(cgst), right, y, { align: 'right' });
    y += 18;

    doc.text('SGST', left, y);
    doc.text(fmt(sgst), right, y, { align: 'right' });
    y += 22;

    const total = this.grandTotal ?? (setupCost + monthlyCost + cgst + sgst);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Total Paid', left, y);
    doc.text(fmt(total), right, y, { align: 'right' });
    y += 28;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Payment ID: ${paymentId}`, left, y);
    y += 16;
    doc.text(`${this.orderOrSubscriptionLabel}: ${this.orderOrSubscriptionId || orderId}`, left, y);

    y += 36;
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text('This is a system generated invoice.', left, y);

    doc.save(`${invoiceNumber}.pdf`);
  }

  private formatDate(dateIso: string): string {
    try {
      const d = new Date(dateIso);
      return d.toLocaleString();
    } catch (e) {
      return dateIso;
    }
  }
}
