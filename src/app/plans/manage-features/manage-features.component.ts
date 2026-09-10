import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { MatDialog } from '@angular/material/dialog';
import { FeaturesService } from '../../services/features.service';
import { ConfirmDialogComponent } from '../../confirm-dialog/confirm-dialog.component';
import { ThreeDotsButtonComponent } from '../../shared/three-dots-button/three-dots-button.component';
import { PopupMenuComponent } from '../../shared/popup-menu/popup-menu.component';
import { PopupMenuConfig, PopupMenuItem } from '../../shared/popup-menu/popup-menu.model';

@Component({
  selector: 'app-manage-features',
  standalone: true,
  imports: [CommonModule, FormsModule, ThreeDotsButtonComponent, PopupMenuComponent],
  templateUrl: './manage-features.component.html',
  styleUrls: ['./manage-features.component.css']
})
export class ManageFeaturesComponent implements OnInit, OnDestroy {
  features: any[] = [];
  searchTimeout: any;

  activePopup: { index: number; pRef: any; config: PopupMenuConfig } | null = null;

  search: string = '';
  statusFilter: string = '';
  totalItems: number = 0;
  pageSize: number = 10;
  currentPage: number = 1;
  Math = Math;

  constructor(
    private service: FeaturesService,
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

  openActionMenu(index: number, f: any, event: MouseEvent) {
    event.stopPropagation();

    if (this.activePopup?.index === index) {
      this.activePopup = null;
      return;
    }

    const btn = event.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();
    const width = 190;
    const popupHeight = 140;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const top = (spaceBelow < popupHeight && spaceAbove > spaceBelow)
      ? rect.top - popupHeight - 4
      : rect.bottom + 4;

    const items: PopupMenuItem[] = [
      { id: 'view', label: 'View / Edit', icon: 'edit' },
      { id: 'toggle', label: f.status === 1 ? 'Deactivate' : 'Activate' },
      { id: 'delete', label: 'Delete', icon: 'delete', variant: 'danger' }
    ];

    this.activePopup = {
      index,
      pRef: f,
      config: { title: 'Actions', items, width, position: { top, left: rect.right - width } }
    };
  }

  onMenuItemClick(item: PopupMenuItem) {
    const f = this.activePopup?.pRef;
    this.activePopup = null;
    if (!f) return;
    if (item.id === 'view') this.view(f.id);
    if (item.id === 'delete') this.remove(f.id);
    if (item.id === 'toggle') this.toggleStatus(f);
  }

  closePopup() { this.activePopup = null; }

  load(page: number = 1) {
    this.currentPage = page;
    const payload = {
      search_key: this.search.trim(),
      status: this.statusFilter,
      page: this.currentPage,
      limit: this.pageSize
    };
    this.service.list(payload).subscribe({
      next: (res: any) => {
        this.features = res.data || [];              // 👈 res.data khud hi array hai
        this.totalItems = res.totalItems ?? 0;        // 👈 totalItems top-level pe hai, res.data ke andar nahi
      },
      error: () => this.toastr.error('Failed to load features')
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
    this.statusFilter = '';
    this.load(1);
  }

  add() {
    this.router.navigate(['/add-features']);
  }

  view(id: string) {
    this.router.navigate(['/add-features', id], { queryParams: { viewMode: true } });
  }

  toggleStatus(f: any) {
    const newStatus = f.status === 1 ? 0 : 1;
    this.service.changeStatus(f.id, newStatus).subscribe({
      next: (res: any) => {
        this.toastr.success(res.message || 'Status updated');
        this.load(this.currentPage);
      },
      error: (err) => this.toastr.error(err.error?.message || 'Status update failed')
    });
  }

  remove(id: string) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Confirm Delete',
        message: 'Are you sure you want to delete this feature?',
        yesLabel: 'Yes',
        noLabel: 'No'
      }
    });

    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result) {
        this.service.delete(id).subscribe({
          next: (res: any) => {
            this.toastr.success(res.message || 'Feature deleted successfully');
            this.load();
          },
          error: (err) => {
            this.toastr.error(err.error?.message || 'Delete failed');
          }
        });
      }
    });
  }
}