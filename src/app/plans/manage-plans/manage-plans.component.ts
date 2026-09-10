import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { PlansService } from '../../services/plans.service';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../confirm-dialog/confirm-dialog.component';
import { ThreeDotsButtonComponent } from '../../shared/three-dots-button/three-dots-button.component';
import { PopupMenuComponent } from '../../shared/popup-menu/popup-menu.component';
import { PopupMenuConfig, PopupMenuItem } from '../../shared/popup-menu/popup-menu.model';

@Component({
  selector: 'app-manage-plans',
  standalone: true,
  imports: [CommonModule, FormsModule, ThreeDotsButtonComponent, PopupMenuComponent],
  templateUrl: './manage-plans.component.html',
  styleUrls: ['./manage-plans.component.css']
})
export class ManagePlansComponent implements OnInit, OnDestroy {
  plans: any[] = [];
  searchTimeout: any;

  activePopup: { index: number; pRef: any; config: PopupMenuConfig } | null = null;

  search: string = '';
  totalItems: number = 0;
  pageSize: number = 10;
  currentPage: number = 1;
  Math = Math;

  constructor(
    private service: PlansService,
    private router: Router,
    private toastr: ToastrService,
    private dialog: MatDialog
  ) {}

  @HostListener('document:click')
  onDocumentClick() {
    this.activePopup = null;
  }

  ngOnInit(): void {
    this.load(1);
  }

  ngOnDestroy(): void {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
  }

  openActionMenu(index: number, p: any, event: MouseEvent) {
    event.stopPropagation();

    if (this.activePopup?.index === index) {
      this.activePopup = null;
      return;
    }

    const btn = event.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();
    const width = 180;
    const popupHeight = 100;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const top = (spaceBelow < popupHeight && spaceAbove > spaceBelow)
      ? rect.top - popupHeight - 4
      : rect.bottom + 4;

    const items: PopupMenuItem[] = [
      { id: 'view', label: 'View / Edit', icon: 'edit' },
      { id: 'delete', label: 'Delete', icon: 'delete', variant: 'danger' }
    ];

    this.activePopup = {
      index,
      pRef: p,
      config: { title: 'Actions', items, width, position: { top, left: rect.right - width } }
    };
  }

  onMenuItemClick(item: PopupMenuItem) {
    const p = this.activePopup?.pRef;
    this.activePopup = null;
    if (!p) return;
    if (item.id === 'view')   this.view(p.id);
    if (item.id === 'delete') this.remove(p.id);
  }

  closePopup() { this.activePopup = null; }

  load(page: number = 1) {
    this.currentPage = page;
    const payload = {
      search: this.search.trim(),
      page: this.currentPage,
      limit: this.pageSize
    };
    this.service.list(payload).subscribe({
      next: (res: any) => {
        this.plans = res.data || [];
        this.totalItems = res.totalItems || 0;
      },
      error: () => this.toastr.error('Failed to load plans')
    });
  }

  onSearchChange() {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => this.load(1), 400);
  }

  onPageChange(p: number) {
    if (p < 1 || p > Math.ceil(this.totalItems / this.pageSize) || p === this.currentPage) return;
    this.load(p);
  }

  resetFilter() {
    this.search = '';
    this.load(1);
  }

  add() {
    this.router.navigate(['/add-plans']);
  }

  view(id: string) {
    this.router.navigate(['/add-plans', id], { queryParams: { viewMode: true } });
  }

  remove(id: string) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Confirm Delete',
        message: 'Are you sure you want to delete this plan?',
        yesLabel: 'Yes',
        noLabel: 'No'
      }
    });

    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result) {
        this.service.delete(id).subscribe({
          next: (res: any) => {
            this.toastr.success(res.message || 'Plan deleted successfully');
            this.load();
          },
          error: (err) => {
            this.toastr.error(err.error?.message || 'Delete failed');
          }
        });
      }
    });
  }
  get totalPages(): number[] {
  return Array.from({ length: Math.ceil(this.totalItems / this.pageSize) }, (_, i) => i + 1);
}
}
