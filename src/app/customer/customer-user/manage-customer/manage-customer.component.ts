import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { CustomerService } from '../../../services/customer-group.service';
import { ConfirmDialogComponent } from '../../../confirm-dialog/confirm-dialog.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PopupMenuComponent } from '../../../shared/popup-menu/popup-menu.component';
import { ThreeDotsButtonComponent } from '../../../shared/three-dots-button/three-dots-button.component';
import { PopupMenuItem, PopupMenuConfig } from '../../../shared/popup-menu/popup-menu.model';
import { PlanAccessService } from '../../../services/plan-access.service';
@Component({
  selector: 'app-manage-customer',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, PopupMenuComponent, ThreeDotsButtonComponent],
  templateUrl: './manage-customer.component.html',
  styleUrl: './manage-customer.component.css'
})
export class ManageCustomerComponent implements OnInit {
  Math = Math;

  customers: any[] = [];
  projects: any[] = [];
  projectId: any = null;
  searchQuery: string = '';
  searchTimeout: any;

  currentPage = 1;
  pageSize = 10;
  totalItems = 0;

  canEdit = false;
  isProjectFilterLocked = false;

  activePopup: { index: number; customerRef: any; config: PopupMenuConfig } | null = null;
  customerLimit: number | null = null;

 get limitReached(): boolean {
  return !this.planAccess.canCreateMore('customers', this.totalItems);
}

get limitLabel(): string {
  return this.customerLimit === null
    ? 'Unlimited'
    : `${this.totalItems} / ${this.customerLimit}`;
}
  constructor(
    private service: CustomerService,
    public router: Router,
    private route: ActivatedRoute,
    private toastr: ToastrService,
    private dialog: MatDialog,
          private planAccess: PlanAccessService

  ) {
    const perms = (localStorage.getItem('permissions') || '').split(',');
    this.canEdit = perms.includes('edit_customer');
          this.customerLimit = this.planAccess.maxCustomers;

  }

  @HostListener('document:click')
  onDocumentClick() {
    this.activePopup = null;
  }

  ngOnInit(): void {
    this.loadProjects();

    this.route.queryParams.subscribe(params => {
      if (params['projectId']) {
        this.projectId = +params['projectId'];
        this.isProjectFilterLocked = true;
      }
      this.load(1);
    });
  }

  loadProjects(): void {
    this.service.listProjects({ search: '', page: 1, limit: 100 }).subscribe({
      next: (res: any) => {
        this.projects = (res.data || []).filter((p: any) => p.accessType === 'closed');
      }
    });
  }

  load(page: number = 1) {
    this.currentPage = page;
    const params: any = {
      search: this.searchQuery.trim(),
      page: this.currentPage,
      limit: this.pageSize
    };

    if (this.projectId != null) {
      params.projectId = this.projectId;
    }

    this.service.listCustomers(params).subscribe({
      next: (res: any) => {
        this.customers = res.data || [];
        this.totalItems = res.totalItems || 0;
      },
      error: () => this.toastr.error('Failed to load customers')
    });
  }

  openActionMenu(index: number, customer: any, event: MouseEvent) {
    event.stopPropagation();

    if (this.activePopup?.index === index) {
      this.activePopup = null;
      return;
    }

    const btn = event.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();
    const width = 200;
    const popupHeight = 120;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const top =
      spaceBelow < popupHeight && spaceAbove > spaceBelow
        ? rect.top - popupHeight - 4
        : rect.bottom + 4;

    const items: PopupMenuItem[] = [];

    if (this.canEdit) {
      items.push({ id: 'edit', label: 'Edit', icon: 'edit' });
    } else {
      items.push({ id: 'view', label: 'View', icon: 'view' });
    }

    items.push({ id: 'delete', label: 'Delete', icon: 'delete' });

    this.activePopup = {
      index,
      customerRef: customer,
      config: {
        title: 'Actions',
        items,
        width,
        position: { top, left: rect.right - width }
      }
    };
  }

  onMenuItemClick(item: PopupMenuItem) {
    const customer = this.activePopup?.customerRef;
    this.activePopup = null;
    if (!customer) return;

    if (item.id === 'view' || item.id === 'edit') this.view(customer.id);
    if (item.id === 'delete') this.remove(customer.id);
  }

  closePopup() {
    this.activePopup = null;
  }

  onProjectFilterChange(): void {
    this.load(1);
  }

  onSearchChange() {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => this.load(1), 400);
  }

  resetFilter() {
    this.searchQuery = '';
    if (!this.isProjectFilterLocked) {
      this.projectId = null;
    }
    this.load(1);
  }

  addCustomer() {
    if (this.projectId) {
      this.router.navigate(['/add-customer'], {
        queryParams: { projectId: this.projectId }
      });
    } else {
      this.router.navigate(['/add-customer']);
    }
  }

  importCustomers() {
    this.router.navigate(['/import-customer'], {
      queryParams: this.projectId ? { projectId: this.projectId } : {}
    });
  }

  view(id: string) {
    this.router.navigate(['/add-customer', id], {
      queryParams: {
        viewMode: true,
        projectId: this.projectId || undefined
      }
    });
  }

  remove(id: string) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Confirm Deletion',
        message: 'Are you sure you want to delete this customer?',
        yesLabel: 'Delete',
        noLabel: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result) {
        this.service.deleteCustomer(id).subscribe({
          next: (res: any) => {
            this.toastr.success(res.message || 'Deleted successfully');
            this.load(this.currentPage);
          },
          error: (err) => {
            this.toastr.error(err.error?.message || 'Failed to delete customer');
          }
        });
      }
    });
  }

  onPageChange(page: number) {
    const maxPage = Math.ceil(this.totalItems / this.pageSize);
    if (page < 1 || page > maxPage || page === this.currentPage) return;
    this.load(page);
  }

  cancel() {
    return this.router.navigate(['/manage-projects']);
  }
}
