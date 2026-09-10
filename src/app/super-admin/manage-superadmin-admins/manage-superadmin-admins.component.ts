import { Component, OnInit,OnDestroy, HostListener } from '@angular/core';
import { HttpClient, HttpHeaders, HttpClientModule } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';
import { ToastrService, ToastrModule } from 'ngx-toastr';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../confirm-dialog/confirm-dialog.component';
import { StatusToggleComponent } from '../../shared/status-toggle/status-toggle.component';
import { ThreeDotsButtonComponent } from '../../shared/three-dots-button/three-dots-button.component';
import { PopupMenuComponent } from '../../shared/popup-menu/popup-menu.component';
import { PopupMenuItem } from '../../shared/popup-menu/popup-menu.model';
import { PaginationFooterComponent, PageChangeEvent } from '../../shared/pagination-footer/pagination-footer.component';
import { UserService } from '../../services/user.service';
import { ShepherdService } from 'angular-shepherd';
@Component({
  selector: 'app-manage-superadmin-admins',
  templateUrl: './manage-superadmin-admins.component.html',
  styleUrls: ['./manage-superadmin-admins.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    RouterModule,
    ReactiveFormsModule,
    FormsModule,
    ToastrModule,
    ThreeDotsButtonComponent,
    PopupMenuComponent,
    PaginationFooterComponent,
    StatusToggleComponent
  ],
})
export class ManageSuperAdminAdminsComponent implements OnInit, OnDestroy {
  addAdminForm: FormGroup;
  token: string | null = localStorage.getItem('token');

  adminUsers: any[] = [];
  loading = false;
  isLoggingOut = false;

  search = '';
  totalItems = 0;
  pageSize = 10;
  currentPage = 1;
searchTimeout: any;

  activeMenuId: any = null;
  menuPopupPosition: { top: number; left: number } | null = null;
  selectedAdmin: any = null;

  canEnableDisable = true;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private toastr: ToastrService,
    private dialog: MatDialog,
    private userService: UserService,
    private shepherdService: ShepherdService,
  ) {
    this.addAdminForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      phone: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.fetchAdminUsers();
      this.startTourIfFirstVisit();

  }
startTourIfFirstVisit(): void {
  const seen = localStorage.getItem('adminsTourSeen');
  if (seen) return;

  this.shepherdService.defaultStepOptions = {
    cancelIcon: { enabled: true },
    // scrollTo: true,
      scrollTo: { behavior: 'smooth', block: 'center' },

  };
  this.shepherdService.modal = true;
  this.shepherdService.confirmCancel = false;

  this.shepherdService.addSteps([
    {
      id: 'add-admin-step',
      attachTo: { element: '.tour-add-admin', on: 'bottom' },
      title: 'Add Admin',
      text: 'Click here to add a new admin user.',
      buttons: [{ text: 'Next', action: () => this.shepherdService.next() }],
    },
    {
      id: 'search-step',
      attachTo: { element: '.tour-search', on: 'bottom' },
      title: 'Search',
      text: 'Search for any admin by name, email, or phone number.',
      buttons: [
        { text: 'Back', action: () => this.shepherdService.back() },
        { text: 'Next', action: () => this.shepherdService.next() },
      ],
    },
    {
      id: 'table-step',
      attachTo: { element: '.tour-table', on: 'top' },
      title: 'Admin List',
      text: 'All your admins are listed here. You can turn their access on or off using the status toggle.',
      buttons: [
        { text: 'Back', action: () => this.shepherdService.back() },
        { text: 'Next', action: () => this.shepherdService.next() },
      ],
    },
    {
      id: 'actions-step',
      attachTo: { element: '.tour-actions', on: 'left' },
      title: 'Actions Menu',
      text: 'Click this button to view more options for an admin — View, Edit, manage Permissions, Reset Password, or Enable/Disable the account.',
      buttons: [
        { text: 'Back', action: () => this.shepherdService.back() },
        {
          text: 'Finish',
          action: () => {
            localStorage.setItem('adminsTourSeen', 'true');
            this.shepherdService.complete();
          },
        },
      ],
    },
  ]);

  setTimeout(() => this.shepherdService.start(), 500);
}
ngOnDestroy(): void {
  if (this.searchTimeout) clearTimeout(this.searchTimeout);
}
  @HostListener('document:keydown.escape')
  onEscape() { this.closeMenu(); }

  get actionItems(): PopupMenuItem[] {
    const items: PopupMenuItem[] = [
      { id: 'view',        label: 'View' },
      { id: 'edit',        label: 'Edit' },
      { id: 'permissions', label: 'Permissions' },
      { id: 'forgot-password', label: 'Reset Password' },
      { id: 'update-theme', label: 'Update Theme' }
    ];

    if (this.canEnableDisable && this.selectedAdmin) {

     if (this.selectedAdmin.status === 0) {
  items.push({ id: 'enable', label: 'Enable User' });
} else {
  items.push({ id: 'disable', label: 'Disable User', variant: 'danger' });
}
    }

    return items;
  }

  get paginatedUsers() { return this.adminUsers; }

  fetchAdminUsers(): void {
    if (!this.token || this.isLoggingOut) {
      this.toastr.warning('Session expired or not logged in. Redirecting to login...', 'Warning');
      this.router.navigate(['/login']).then(() => window.location.reload());
      return;
    }

    this.loading = true;
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.token}`);
    const payload = {
      search: this.search,
      page: this.currentPage,
      limit: this.pageSize,
      roleCode: 'admin',
    };

    this.http.post<any>(`${environment.apiUrl}/users/getAllUsers`, payload, { headers }).subscribe(
      (response) => {
        const rawData = response?.data && Array.isArray(response.data)
          ? response.data
          : (Array.isArray(response) ? response : []);
        this.adminUsers = rawData;
        this.totalItems  = response.totalItems || 0;
        this.loading = false;
      },
      () => {
        this.toastr.error('Failed to fetch admin data', 'Error');
        this.loading = false;
      },
    );
  }

  onSearchChange() {
  if (this.searchTimeout) clearTimeout(this.searchTimeout);
  this.searchTimeout = setTimeout(() => {
    this.currentPage = 1;
    this.fetchAdminUsers();
  }, 400);
}
  resetFilter()  { this.search = ''; this.currentPage = 1; this.fetchAdminUsers(); }

  onPageChange(event: PageChangeEvent) {
    this.currentPage = event.page;
    this.pageSize    = event.pageSize;
    this.fetchAdminUsers();
  }

  onPageSizeChange(event: Event) {
    this.pageSize    = Number((event.target as HTMLSelectElement).value);
    this.currentPage = 1;
    this.fetchAdminUsers();
  }

openMenu(admin: any, event: MouseEvent) {
    event.stopPropagation();
    if (this.activeMenuId === admin.id) { this.closeMenu(); return; }
    this.selectedAdmin = admin;
    this.activeMenuId  = admin.id;

    const rect       = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const menuWidth  = 220;
    const menuHeight = 160;

    const spaceBelow = window.innerHeight - rect.bottom;
    const showAbove  = spaceBelow < menuHeight;

    this.menuPopupPosition = {
      top:  showAbove
              ? rect.top + window.scrollY - menuHeight
              : rect.bottom + window.scrollY,
      left: rect.right - menuWidth,
    };
}

  closeMenu() {
    this.menuPopupPosition = null;
    this.activeMenuId      = null;
    this.selectedAdmin     = null;
  }

  onMenuItemClick(item: PopupMenuItem) {
    if (!this.selectedAdmin) return;
    const id = this.selectedAdmin.id;
    const adminSnapshot = this.selectedAdmin;
    this.closeMenu();

    switch (item.id) {
      case 'view':        this.viewAdmin(id);          break;
      case 'edit':        this.router.navigate(['/edit-admin', id]); break;
      case 'permissions': this.managePermissions(id);  break;
      case 'forgot-password': this.confirmResetPassword(adminSnapshot); break;
      case 'update-theme': this.updateTheme(id); break;

   case 'disable':
  this.disableAdmin(id).subscribe({
    next: () => {
      this.toastr.success('Admin disabled');
      this.fetchAdminUsers();
    },
    error: () => {
      this.toastr.error('Failed to disable admin');
    }
  });
  break;

case 'enable':
  this.enableAdmin(id).subscribe({
    next: () => {
      this.toastr.success('Admin enabled');
      this.fetchAdminUsers();
    },
    error: () => {
      this.toastr.error('Failed to enable admin');
    }
  });
  break;
    }
  }

  addAdmin() { this.router.navigate(['/add-admin']); }

  viewAdmin(id: string) {
    this.router.navigate(['/view-admin', id], { queryParams: { viewMode: 'true' } });
  }

  managePermissions(id: string) {
    this.router.navigate(['/manage-admin-permissions'], { queryParams: { adminId: id } });
  }
confirmResetPassword(user: any): void {
  const dialogRef = this.dialog.open(ConfirmDialogComponent, {
    width: '450px',
    data: {
      message: `Are you sure you want to reset the password for ${user.name}? A new temporary password will be emailed to them.`,
    },
  });
 dialogRef.afterClosed().subscribe((confirmed: boolean) => {
    if (!confirmed) return;

    this.userService.resetUserPassword(user.id).subscribe({
      next: () => {
        this.toastr.success(`Password reset. New credentials sent to ${user.email}.`, 'Success');
      },
      error: (err) => {
        this.toastr.error(err.error?.message || 'Failed to reset password', 'Error');
      },
    });
  });
}
updateTheme(adminId: string): void {
  this.router.navigate(['/change-user-theme', adminId]);
}
disableAdmin(id: string) {
  const headers = new HttpHeaders().set('Authorization', `Bearer ${this.token}`);
  return this.http.post<any>(`${environment.apiUrl}/users/deleteUser`, { id }, { headers });
}

 enableAdmin(id: string) {
  const headers = new HttpHeaders().set('Authorization', `Bearer ${this.token}`);
  return this.http.post<any>(`${environment.apiUrl}/users/enableUser`, { id }, { headers });
}

hasDisabledAdmins(): boolean {
  return this.adminUsers.some((u: any) => u.status === 0);
}

onStatusToggle(admin: any, checked: boolean): void {
  admin.status = checked ? 1 : 0;

  const apiCall = checked
    ? this.enableAdmin(admin.id)
    : this.disableAdmin(admin.id);

  apiCall.subscribe({
    next: () => {
       this.toastr.success(
    checked ? 'Admin enabled successfully'
            : 'Admin disabled successfully'
  );
    },
    error: () => {
      admin.status = checked ? 0 : 1;
    }
  });
}
  logout() {
    this.isLoggingOut = true;
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }
}
