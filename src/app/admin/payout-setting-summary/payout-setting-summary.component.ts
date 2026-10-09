import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NgxUiLoaderModule, NgxUiLoaderService } from 'ngx-ui-loader';
import { ToastrService } from 'ngx-toastr';

import { PayoutSettingService } from '../../services/payout-setting.service';

import { ThreeDotsButtonComponent } from '../../shared/three-dots-button/three-dots-button.component';
import { PopupMenuComponent } from '../../shared/popup-menu/popup-menu.component';
import { PopupMenuItem } from '../../shared/popup-menu/popup-menu.model';
import {
  PaginationFooterComponent,
  PageChangeEvent,
} from '../../shared/pagination-footer/pagination-footer.component';

@Component({
  selector: 'app-payout-setting-summary',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NgxUiLoaderModule,
    ThreeDotsButtonComponent,
    PopupMenuComponent,
    PaginationFooterComponent,
  ],
  templateUrl: './payout-setting-summary.component.html',
  styleUrls: ['./payout-setting-summary.component.css'],
})
export class PayoutSettingSummaryComponent implements OnInit, OnDestroy {
  // =========================================================
  // VARIABLES
  // =========================================================

  setting: any = null;

  loading = false;
  isDeleting = false;
  errorMessage = '';

  // Table state
  search = '';
  pageSize = 10;
  currentPage = 1;
  totalItems = 0;
  pagedSettings: any[] = [];
  searchTimeout: any = null;

  // Three-dots menu
  activeMenuId: number | string | null = null;
  menuPopupPosition: { top: number; left: number } | null = null;
  selectedSetting: any = null;

  constructor(
    private payoutSettingService: PayoutSettingService,
    private router: Router,
    private loader: NgxUiLoaderService,
    private toastr: ToastrService,
  ) {}

  // =========================================================
  // LIFECYCLE
  // =========================================================

  ngOnInit(): void {
    this.loadSetting();
  }

  ngOnDestroy(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = null;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeMenu();
  }

  // =========================================================
  // LOAD
  // =========================================================

  loadSetting(): void {
    this.loading = true;
    this.errorMessage = '';
    this.loader.start();

    this.payoutSettingService.getPayoutSetting().subscribe({
      next: (response: any) => {
        this.loading = false;
        this.loader.stop();

        this.setting =
          response?.success && response?.data ? response.data : null;

        this.applyTableState();
      },
      error: (error: any) => {
        this.loading = false;
        this.loader.stop();
        this.setting = null;

        if (error?.status !== 404) {
          this.errorMessage =
            error?.error?.message || 'Unable to load payout settings.';
          this.toastr.error(this.errorMessage, 'Error');
        }

        this.applyTableState();
      },
    });
  }

  // =========================================================
  // TABLE: SEARCH + PAGINATION (client side)
  // =========================================================

  private applyTableState(): void {
    let rows: any[] = this.setting ? [this.setting] : [];

    const term = this.search.trim().toLowerCase();

    if (term) {
      rows = rows.filter((row) =>
        [
          row.account_holder_name,
          row.bank_ifsc,
          row.upi_vpa,
          row.frequency,
          row.mode,
          row.payout_mode,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term)),
      );
    }

    this.totalItems = rows.length;

    const start = (this.currentPage - 1) * this.pageSize;
    this.pagedSettings = rows.slice(start, start + this.pageSize);
  }

  onSearchChange(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    this.searchTimeout = setTimeout(() => {
      this.currentPage = 1;
      this.applyTableState();
    }, 300);
  }

  onPageChange(event: PageChangeEvent | any): void {
    if (event && typeof event === 'object' && 'page' in event) {
      this.currentPage = event.page;
      this.pageSize = event.pageSize;
    } else {
      this.currentPage = event;
    }

    this.applyTableState();
  }

  onPageSizeChange(event: Event): void {
    this.pageSize = Number((event.target as HTMLSelectElement).value);
    this.currentPage = 1;
    this.applyTableState();
  }

  // =========================================================
  // ROW HELPERS
  // =========================================================

  isUpiRow(row: any): boolean {
    return row?.payout_mode === 'UPI' || Boolean(row?.upi_vpa);
  }

  isRegistered(row: any): boolean {
    return Boolean(row?.razorpay_contact_id && row?.razorpay_fund_account_id);
  }

  getMaskedAccount(row: any): string {
    const accountNumber = String(row?.bank_account_number || '').trim();

    if (!accountNumber) {
      return '—';
    }

    if (accountNumber.includes('*') || accountNumber.includes('•')) {
      return accountNumber;
    }

    return `••••••${accountNumber.slice(-4)}`;
  }

  // =========================================================
  // THREE-DOTS MENU
  // =========================================================

  get actionItems(): PopupMenuItem[] {
    return [
      { id: 'edit', label: 'Edit' },
      { id: 'delete', label: 'Delete', variant: 'danger' },
    ];
  }

  openMenu(item: any, event: MouseEvent): void {
    event.stopPropagation();

    if (this.activeMenuId === item.id) {
      this.closeMenu();
      return;
    }

    this.selectedSetting = item;
    this.activeMenuId = item.id;

    const targetElement = event.currentTarget as HTMLElement;

    if (!targetElement) {
      return;
    }

    const rect: DOMRect = targetElement.getBoundingClientRect();
    const menuWidth = 220;
    const menuHeight = 120;
    const showAbove = window.innerHeight - rect.bottom < menuHeight;

    this.menuPopupPosition = {
      top: showAbove
        ? rect.top + window.scrollY - menuHeight
        : rect.bottom + window.scrollY,
      left: rect.right - menuWidth,
    };
  }

  closeMenu(): void {
    this.menuPopupPosition = null;
    this.activeMenuId = null;
    this.selectedSetting = null;
  }

  onMenuItemClick(item: PopupMenuItem): void {
    if (!this.selectedSetting) {
      return;
    }

    this.closeMenu();

    switch (item.id) {
      case 'edit':
        this.editSetting();
        break;

      case 'delete':
        this.deleteSetting();
        break;
    }
  }

  // =========================================================
  // NAVIGATION
  // =========================================================

  editSetting(): void {
    this.router.navigate(['/payout-setting']);
  }

  addSetting(): void {
    this.router.navigate(['/payout-setting']);
  }

  goBack(): void {
    this.router.navigate(['/user-dashboard']);
  }

  // =========================================================
  // DELETE
  // =========================================================

  deleteSetting(): void {
    if (!this.setting?.id) {
      this.toastr.warning('No payout setting found to delete.');
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to delete this payout setting?',
    );

    if (!confirmed) {
      return;
    }

    this.isDeleting = true;
    this.loader.start();

    this.payoutSettingService.deletePayoutSetting(this.setting.id).subscribe({
      next: (response: any) => {
        this.isDeleting = false;
        this.loader.stop();

        if (response?.success) {
          this.toastr.success('Payout setting deleted successfully.');
          this.setting = null;
          this.currentPage = 1;
          this.applyTableState();
        } else {
          this.toastr.error(
            response?.message || 'Failed to delete payout setting.',
          );
        }
      },
      error: (error: any) => {
        this.isDeleting = false;
        this.loader.stop();
        this.toastr.error(
          error?.error?.message || 'Something went wrong while deleting.',
        );
      },
    });
  }
}