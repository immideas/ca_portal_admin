import { Component, OnInit,OnDestroy, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpErrorResponse, HttpClientModule } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

import { MatDialog } from '@angular/material/dialog';
import { ToastrService, ToastrModule } from 'ngx-toastr';

import { environment } from '../../../environments/environment';
import { AuthService } from '../../auth.service';
import { ConfirmDialogComponent } from '../../confirm-dialog/confirm-dialog.component';

import { ThreeDotsButtonComponent } from '../../shared/three-dots-button/three-dots-button.component';
import { PopupMenuComponent } from '../../shared/popup-menu/popup-menu.component';
import { PopupMenuItem } from '../../shared/popup-menu/popup-menu.model';
import { PaginationFooterComponent, PageChangeEvent } from '../../shared/pagination-footer/pagination-footer.component';
import { StatusToggleComponent } from '../../shared/status-toggle/status-toggle.component';
import { PlanAccessService } from '../../services/plan-access.service';
import { UserService } from '../../services/user.service';

import { ShepherdService } from 'angular-shepherd';
@Component({
  selector: 'app-manage-admin-users',
  templateUrl: './manage-admin-users.component.html',
  styleUrls: ['./manage-admin-users.component.css'],
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
  ]
})
export class ManageAdminUsersComponent implements OnInit,OnDestroy {
  addSubAdminForm: FormGroup;
  token: string | null = localStorage.getItem('token');

  subAdminUsers: any[] = [];
  filteredUsers: any[] = [];
  loading = false;
  isLoggingOut = false;


  search = '';
  totalItems = 0;
  pageSize = 10;
  currentPage = 1;
searchTimeout: any;

  activeMenuId: any = null;
  menuPopupPosition: { top: number; left: number } | null = null;
  selectedSubAdmin: any = null;

  canList = false;
  canAdd = false;
  canEdit = false;
  canView = false;
  canEnableDisable = false;
  userLimit: number | null = null;

  get limitReached(): boolean {
    return !this.planAccess.canCreateMore('users', this.totalItems);
  }

  get limitLabel(): string {
    return this.userLimit === null ? 'Unlimited' : `${this.totalItems} / ${this.userLimit}`;
  }
  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private toastr: ToastrService,
    private authService: AuthService,
    private dialog: MatDialog,
        private planAccess: PlanAccessService,
          private userService: UserService,
 private shepherdService: ShepherdService,

  ) {
    this.addSubAdminForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      phone: ['', Validators.required]
    });

    const perms = (localStorage.getItem('permissions') || '').split(',');
    this.canList = perms.includes('sub_admin_users_list');
    this.canAdd = perms.includes('add_sub_admin_users');
    this.canEdit = perms.includes('edit_sub_admin_users');
    this.canView = perms.includes('view_sub_admin_users');
    this.canEnableDisable = perms.includes('enable/disable_sub_admin_users');
        this.userLimit = this.planAccess.maxUsers;

  }

  ngOnInit(): void {
    if (this.canList) {
      this.fetchSubAdminUsers();
    }
    this.startTourIfFirstVisit();
  }
ngOnDestroy(): void {
  if (this.searchTimeout) clearTimeout(this.searchTimeout);
}
startTourIfFirstVisit(): void {
  const seen = localStorage.getItem('subAdminsTourSeen');
  if (seen) return;

  this.shepherdService.defaultStepOptions = {
    cancelIcon: { enabled: true },
    // scrollTo: true,
      scrollTo: { behavior: 'smooth', block: 'center' },   

  };
  this.shepherdService.modal = true;
  this.shepherdService.confirmCancel = false;

  const steps: any[] = [];

  if (this.canAdd) {
    steps.push({
      id: 'add-subadmin-step',
      attachTo: { element: '.tour-add-subadmin', on: 'bottom' },
      title: 'Add User',
      text: 'Click here to add a new sub-admin user.',
      buttons: [{ text: 'Next', action: () => this.shepherdService.next() }],
    });
  }

  steps.push({
    id: 'search-subadmin-step',
    attachTo: { element: '.tour-search-subadmin', on: 'bottom' },
    title: 'Search',
    text: 'Search for any sub-admin by name, email, or phone number.',
    buttons: [
      { text: 'Back', action: () => this.shepherdService.back() },
      { text: 'Next', action: () => this.shepherdService.next() },
    ],
  });

  steps.push({
    id: 'table-subadmin-step',
    attachTo: { element: '.tour-table-subadmin', on: 'top' },
    title: 'Sub-Admin List',
    text: 'All your sub-admin users are listed here. You can turn their access on or off using the status toggle.',
    buttons: [
      { text: 'Back', action: () => this.shepherdService.back() },
      { text: 'Next', action: () => this.shepherdService.next() },
    ],
  });

  steps.push({
    id: 'actions-subadmin-step',
    attachTo: { element: '.tour-actions-subadmin', on: 'left' },
    title: 'Actions Menu',
    text: 'Click this button to view more options — View, Edit, manage Permissions, Reset Password, or Enable/Disable the account.',
    buttons: [
      { text: 'Back', action: () => this.shepherdService.back() },
      {
        text: 'Finish',
        action: () => {
          localStorage.setItem('subAdminsTourSeen', 'true');
          this.shepherdService.complete();
        },
      },
    ],
  });

  this.shepherdService.addSteps(steps);
  setTimeout(() => this.shepherdService.start(), 500);
}

  @HostListener('document:keydown.escape')
  onEscape() { this.closeMenu(); }

  get actionItems(): PopupMenuItem[] {
    const items: PopupMenuItem[] = [];

    if (this.canView) {
      items.push({ id: 'view', label: 'View' });
    }
    if (this.canEdit) {
      items.push({ id: 'edit', label: 'Edit' });
    }

    items.push({ id: 'permissions', label: 'Permissions' });
  items.push({ id: 'forgot-password', label: 'Reset Password' });   // 👈 naya

    if (this.canEnableDisable && this.selectedSubAdmin) {

       if (this.selectedSubAdmin.status === 0) {
        items.push({ id: 'enable', label: 'Enable User' });
      } else {
        items.push({ id: 'disable', label: 'Disable User', variant: 'danger' });
      }
    }

    return items;
  }

  get paginatedUsers(): any[] { return this.filteredUsers; }

  fetchSubAdminUsers(): void {
    if (!this.token || this.isLoggingOut) {
      this.toastr.warning('Session expired or not logged in. Redirecting to login...', 'Warning');
      this.router.navigate(['/login']);
      return;
    }

    const adminId = localStorage.getItem('adminId');
    if (!adminId) {
      this.toastr.error('Admin user ID not found. Please log in again.');
      this.router.navigate(['/login']);
      return;
    }

    this.loading = true;
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.token}`);
    const payload = {
      createdBy: adminId,
      search: this.search,
      page: this.currentPage,
      limit: this.pageSize
    };

    this.http.post<any>(`${environment.apiUrl}/users/getAllUsers`, payload, { headers }).subscribe(
      (response) => {
        const rawData = (response?.data && Array.isArray(response.data))
          ? response.data
          : (Array.isArray(response) ? response : []);

        this.subAdminUsers = rawData;
        this.filteredUsers = rawData;
        this.totalItems = response.totalItems || 0;
        this.loading = false;
      },
      (error: HttpErrorResponse) => {
        this.loading = false;
        console.error('Error fetching user data:', error);
        if (error.status === 400 && error.error.error === 'jwt expired') {
          this.toastr.error('Session expired. Please log in again.');
          localStorage.removeItem('token');
          this.router.navigate(['/login']);
        } else if (error.status === 401) {
          this.toastr.error('Unauthorized access. Please log in again.');
          localStorage.removeItem('token');
          this.router.navigate(['/login']).then(() => window.location.reload());
        } else {
          this.toastr.error(`Failed to fetch user data: ${error.message}`);
        }
      }
    );
  }

  onSearchChange() {
  if (this.searchTimeout) clearTimeout(this.searchTimeout);
  this.searchTimeout = setTimeout(() => {
    this.currentPage = 1;
    this.fetchSubAdminUsers();
  }, 400);
}
  resetFilter(): void { this.search = ''; this.currentPage = 1; this.fetchSubAdminUsers(); }

  onPageChange(event: PageChangeEvent | any): void {
    if (event && typeof event === 'object' && 'page' in event) {
      this.currentPage = event.page;
      this.pageSize    = event.pageSize;
    } else {
      this.currentPage = event;
    }
    this.fetchSubAdminUsers();
  }

  onPageSizeChange(event: Event): void {
    this.pageSize    = Number((event.target as HTMLSelectElement).value);
    this.currentPage = 1;
    this.fetchSubAdminUsers();
  }

  openMenu(subAdmin: any, event: MouseEvent): void {
    event.stopPropagation();

    if (this.activeMenuId === subAdmin.id) { this.closeMenu(); return; }

    this.selectedSubAdmin = subAdmin;
    this.activeMenuId     = subAdmin.id;

    const rect      = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const menuWidth = 220;
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

  closeMenu(): void {
    this.menuPopupPosition = null;
    this.activeMenuId      = null;
    this.selectedSubAdmin  = null;
  }

  onMenuItemClick(item: PopupMenuItem): void {
    if (!this.selectedSubAdmin) return;
    const id = this.selectedSubAdmin.id;
      const subAdminSnapshot = this.selectedSubAdmin;   // 👈 naya — closeMenu se pehle snapshot

    this.closeMenu();

    switch (item.id) {
      case 'view':        this.viewSubAdmin(id);        break;
      case 'edit':        this.editSubAdmin(id);        break;
      case 'permissions': this.managePermissions(id);   break;
    case 'forgot-password': this.confirmResetPassword(subAdminSnapshot); break;  // 👈 naya

   case 'disable':
  this.disableSubAdmin(id).subscribe({
    next: () => {
      this.toastr.success('Sub-Admin disabled');
      this.fetchSubAdminUsers();
    },
    error: () => {
      this.toastr.error('Failed to disable sub-admin');
    }
  });
  break;

case 'enable':
  this.enableSubAdmin(id).subscribe({
    next: () => {
      this.toastr.success('Sub-Admin enabled');
      this.fetchSubAdminUsers();
    },
    error: () => {
      this.toastr.error('Failed to enable sub-admin');
    }
  });
  break;
    }
  }

  addSubAdmin(): void {
    if (!this.canAdd) return;
    this.router.navigate(['/add-users']);
  }

  editSubAdmin(id: string): void {
    if (!this.canEdit) return;
    this.router.navigate(['/edit-users', id]);
  }

  viewSubAdmin(id: string): void {
    if (!this.canView) return;
    this.router.navigate(['/view-users', id], { queryParams: { viewMode: 'true' } });
  }

  managePermissions(id: string): void {
    this.router.navigate(['/manage-user-permissions'], { queryParams: { subAdminId: id } });
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
disableSubAdmin(id: string) {
  const headers = new HttpHeaders()
    .set('Authorization', `Bearer ${this.token}`);

  return this.http.post(
    `${environment.apiUrl}/users/deleteUser`,
    { id },
    { headers }
  );
}
 enableSubAdmin(id: string) {
  const headers = new HttpHeaders()
    .set('Authorization', `Bearer ${this.token}`);

  return this.http.post(
    `${environment.apiUrl}/users/enableUser`,
    { id },
    { headers }
  );
}


 hasDisabledUsers(): boolean {
    return this.subAdminUsers.some((u: any) => u.status === 0);
  }
  logout(): void {
    this.isLoggingOut = true;
    this.authService.logout();
    this.toastr.info('Logged out successfully.');
  }

onStatusToggle(user: any, checked: boolean): void {
  user.status = checked ? 1 : 0;

  const apiCall = checked
    ? this.enableSubAdmin(user.id)
    : this.disableSubAdmin(user.id);

  apiCall.subscribe({
    next: () => {
      this.toastr.success(
    checked ? 'Sub-Admin enabled successfully'
            : 'Sub-Admin disabled successfully'
  );
    },
    error: () => {
      user.status = checked ? 0 : 1;
      this.toastr.error('Update failed');
    }
  });
}
}

