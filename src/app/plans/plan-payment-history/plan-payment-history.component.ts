import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';
import { Router, RouterModule } from '@angular/router';
import jsPDF from 'jspdf';
import { PaymentService } from '../../services/payment.service';
import { PageChangeEvent, PaginationFooterComponent } from '../../shared/pagination-footer/pagination-footer.component';
import { PopupMenuItem } from '../../shared/popup-menu/popup-menu.model';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { PopupMenuComponent } from '../../shared/popup-menu/popup-menu.component';
import { ThreeDotsButtonComponent } from '../../shared/three-dots-button/three-dots-button.component';
import { MultiSelectHeaderComponent, MultiHeaderButton } from '../../shared/multi-select-header/multi-select-header.component';
import { CommonHeaderComponent } from '../../includes/common-header/common-header.component';
import { SidebarComponent } from '../../includes/sidebar/sidebar.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-plan-payment-history',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PageHeaderComponent, PopupMenuComponent, ThreeDotsButtonComponent, PaginationFooterComponent, MultiSelectHeaderComponent, CommonHeaderComponent, SidebarComponent],
  templateUrl: './plan-payment-history.component.html',
  styleUrls: ['./plan-payment-history.component.css']
})
export class PlanPaymentHistoryComponent implements OnInit {
  payments: any[] = [];
  role_code: string | null = null;
  admin = '';

  isLoading = false;
  searchTerm = '';
  pageSize = 10;
  currentPage = 1;

  sortCol = '';
  sortDir: 'asc' | 'desc' = 'asc';

  readonly skeletonRows = Array(10).fill(0);

  selectedItems: any[] = [];
  selectAll = false;


  activePopupItemId: number | string | null = null;
  popupPosition: { top: number; left: number } | null = null;
  popupItem: any = null;

  readonly actionMenuItems: PopupMenuItem[] = [
    { id: 'download', label: 'Download', icon: 'copy' },
    { id: 'view', label: 'View', icon: 'view' },
  ];

  readonly multiSelectButtons: MultiHeaderButton[] = [
    { id: 'download', label: 'Download', variant: 'default' },
  ];

  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeActionPopup();
  }

  constructor(
    private paymentService: PaymentService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.admin = environment.admin;
    this.role_code = localStorage.getItem('role_code');
    this.loadPayments();
  }

  loadPayments(): void {
    this.isLoading = true;
    const payload = { start: 0, length: 1000, search: { value: '' } };
    this.paymentService.getPaymentHistory(payload).subscribe(
      (resp: any) => {
        this.payments = this.normalizePaymentsResponse(resp);
        this.isLoading = false;
        this.currentPage = 1;
        this.selectedItems = [];
        this.selectAll = false;
      },
      () => {
        this.payments = [];
        this.isLoading = false;
      }
    );
  }

  
  private rowKey(item: any): any {
    return item?.id ?? item?.payment_id;
  }

  isSelected(item: any): boolean {
    const key = this.rowKey(item);
    return this.selectedItems.some((s) => this.rowKey(s) === key);
  }

  toggleSelect(item: any, checked: boolean): void {
    const key = this.rowKey(item);
    if (checked) {
      if (!this.isSelected(item)) this.selectedItems.push(item);
    } else {
      this.selectedItems = this.selectedItems.filter((s) => this.rowKey(s) !== key);
    }
    this.selectAll =
      this.selectedItems.length === this.payments.length &&
      this.payments.length > 0;
  }

  toggleSelectAll(checked: boolean): void {
    this.selectAll = checked;
    this.selectedItems = checked ? [...this.payments] : [];
  }

  get selectedCount(): number {
    return this.selectedItems.length;
  }

  clearSelection(): void {
    this.selectedItems = [];
    this.selectAll = false;
  }

  onMultiHeaderButtonClick(actionId: string): void {
    if (actionId === 'cross') {
      this.clearSelection();
    } else if (actionId === 'download') {
      this.selectedItems.forEach((item) => this.downloadInvoice(item));
      this.clearSelection();
    }
  }


  openActionPopup(item: any, event: MouseEvent): void {
    event.stopPropagation();
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.popupItem = item;
    this.activePopupItemId = this.rowKey(item);
    this.popupPosition = { top: rect.bottom + 4, left: rect.left - 160 };
  }

  closeActionPopup(): void {
    this.activePopupItemId = null;
    this.popupItem = null;
    this.popupPosition = null;
  }

  onPopupItemClick(menuItem: PopupMenuItem): void {
    if (!this.popupItem) return;
    switch (menuItem.id) {
      case 'download':
        this.downloadInvoice(this.popupItem);
        break;
      case 'view':
        this.viewPayment(this.popupItem.id || this.popupItem.payment_id);
        break;
    }
    this.closeActionPopup();
  }


  goToAdvancePayment(plan?: any) {
    const selected = plan || (this.payments && this.payments.length ? this.payments[0] : null);
    this.router.navigate(['/advance-payment'], { state: { plan: selected } });
  }

  viewPayment(id: any) {
    if (!id) return;
    this.router.navigate(['/payment-details/' + id]);
  }


  formatDate(val: any): string {
    if (!val) return 'N/A';
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return 'N/A';
      return d.toLocaleDateString('en-CA');
    } catch {
      return 'N/A';
    }
  }

  private normalizePaymentsResponse(response: any): any[] {
    if (!response) {
      return [];
    }

    if (Array.isArray(response)) {
      return response;
    }

    if (Array.isArray(response.planHistory)) {
      return response.planHistory;
    }

    if (Array.isArray(response.data)) {
      return response.data;
    }

    if (response.data && Array.isArray(response.data.details)) {
      return response.data.details;
    }

    if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
      return [response.data];
    }

    if (response.details && Array.isArray(response.details)) {
      return response.details;
    }

    return [];
  }


  onSearch(term: string): void {
    this.searchTerm = term?.toLowerCase() || '';
    this.currentPage = 1;
  }

  onPageSizeChange(event: Event): void {
    this.pageSize = Number((event.target as HTMLSelectElement).value);
    this.currentPage = 1;
  }

  onPageChange(event: PageChangeEvent): void {
    this.pageSize = event.pageSize;
    this.currentPage = event.page;
  }

  setSort(col: string): void {
    if (this.sortCol === col) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortCol = col;
      this.sortDir = 'asc';
    }
    this.currentPage = 1;
  }

  get filteredItems(): any[] {
    let list = this.payments;
    if (this.searchTerm) {
      list = list.filter((item) => {
        const planName = (item.Plan?.plan_name || item.plan_name || item.plan_id || '').toString().toLowerCase();
        const txId = (item.transaction_id || (item.metadata?.gateway_payment?.id) || '').toString().toLowerCase();
        return planName.includes(this.searchTerm) || txId.includes(this.searchTerm);
      });
    }
    if (this.sortCol) {
      list = [...list].sort((a, b) => {
        let av: any, bv: any;
        switch (this.sortCol) {
          case 'plan_name':
            av = (a.Plan?.plan_name || a.plan_name || a.plan_id || '').toString().toLowerCase();
            bv = (b.Plan?.plan_name || b.plan_name || b.plan_id || '').toString().toLowerCase();
            break;
          case 'amount':
            av = Number(a.amount) || 0;
            bv = Number(b.amount) || 0;
            break;
          case 'payment_date':
            av = new Date(a.payment_date || a.purchase_date || a.entry_created || a.paid_at || a.createdAt || 0).getTime();
            bv = new Date(b.payment_date || b.purchase_date || b.entry_created || b.paid_at || b.createdAt || 0).getTime();
            break;
          case 'expiration_date':
            av = new Date(a.expiration_date || 0).getTime();
            bv = new Date(b.expiration_date || 0).getTime();
            break;
          default:
            return 0;
        }
        if (av < bv) return this.sortDir === 'asc' ? -1 : 1;
        if (av > bv) return this.sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return list;
  }

  get pagedItems(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredItems.slice(start, start + this.pageSize);
  }


  downloadInvoice(record: any) {
    try {
      const doc = new jsPDF();
      const companyName = 'Resolvenest';
      const left = 14;
      let y = 20;

      doc.setFontSize(16);
      doc.text(companyName, left, y);
      doc.setFontSize(11);
      y += 8;
      doc.text('Invoice', left, y);

      y += 10;
      const paymentId = record.transaction_id || (record.metadata && record.metadata.gateway_payment && record.metadata.gateway_payment.id) || '';
      const purchaseDate = record.payment_date || record.purchase_date || record.entry_created || record.paid_at || record.createdAt || '';
      const expirationDate = record.expiration_date || '';

      doc.setFontSize(10);
      doc.text(`Payment ID: ${paymentId}`, left, y);
      doc.text(`Purchase Date: ${purchaseDate ? new Date(purchaseDate).toLocaleDateString('en-CA') : 'N/A'}`, 120, y);
      y += 6;
      doc.text(`Expiration Date: ${expirationDate ? new Date(expirationDate).toLocaleDateString('en-CA') : 'N/A'}`, left, y);
      y += 8;

      const items: Array<{ description: string; amount: number }> = [];
      if (record.metadata) {
        if (record.metadata.setup_cost) {
          items.push({ description: 'Setup Cost', amount: Number(record.metadata.setup_cost) });
        } else if (record.metadata.setup_cost === 0 && record.setup_cost) {
          items.push({ description: 'Setup Cost', amount: Number(record.setup_cost) });
        }
        if (record.metadata.addons && Array.isArray(record.metadata.addons)) {
          record.metadata.addons.forEach((a: any, idx: number) => {
            const name = a && a.item && a.item.name ? a.item.name : `Addon ${idx + 1}`;
            const amount = a && a.item && typeof a.item.amount !== 'undefined' ? Number(a.item.amount) / 100 : 0;
            const finalAmount = amount > 0 ? amount : (a && a.item && a.item.amount ? Number(a.item.amount) : 0);
            items.push({ description: name, amount: finalAmount });
          });
        }
      }
      if (items.length === 0) {
        items.push({ description: record.Plan?.plan_name || record.plan_name || `Plan ${record.plan_id || ''}`, amount: Number(record.amount) || 0 });
      }

      doc.text('Description', left, y);
      doc.text('Amount', 150, y);
      y += 6;

      let subtotal = 0;
      items.forEach((it) => {
        const amt = Number(it.amount) || 0;
        subtotal += amt;
        doc.text(it.description, left, y);
        doc.text(amt.toFixed(2).toString(), 150, y);
        y += 6;
        if (y > 270) { doc.addPage(); y = 20; }
      });

      const gstRate = (record.metadata && record.metadata.gst_rate) ? Number(record.metadata.gst_rate) : 18;
      const gstAmount = +(subtotal * (gstRate / 100));
      const total = subtotal + gstAmount;

      y += 6;
      doc.text(`Subtotal:`, 120, y);
      doc.text(subtotal.toFixed(2), 150, y);
      y += 6;
      doc.text(`GST (${gstRate}%):`, 120, y);
      doc.text(gstAmount.toFixed(2), 150, y);
      y += 6;
      doc.setFontSize(12);
      doc.text(`Total:`, 120, y);
      doc.text(total.toFixed(2), 150, y);

      y += 12;
      doc.setFontSize(9);
      doc.text('Company: Garage Futurist', left, y);
      y += 6;
      const companyGst = (record.metadata && record.metadata.company_gst) ? record.metadata.company_gst : 'GSTIN-0000';
      doc.text(`GSTIN: ${companyGst}`, left, y);

      const filename = `invoice_${paymentId || (record.id || 'unknown')}.pdf`;
      doc.save(filename);
    } catch (e) {
      console.error('Failed to generate invoice PDF:', e);
    }
  }
}
