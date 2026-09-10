import { Component, OnInit, HostListener } from '@angular/core';
import { forkJoin } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PaginationFooterComponent, PageChangeEvent } from '../../shared/pagination-footer/pagination-footer.component';
import { ThreeDotsButtonComponent } from '../../shared/three-dots-button/three-dots-button.component';
import { PopupMenuComponent } from '../../shared/popup-menu/popup-menu.component';
import { PopupMenuItem } from '../../shared/popup-menu/popup-menu.model';
import { FilterPanelComponent, FilterState } from '../../shared/filter-panel/filter-panel.component';

import { UserService } from '../../services/user.service';
import { UserSessionService } from '../../services/user.session.service';
import { RoleService } from '../../services/role.service';

@Component({
  selector: 'app-users-history',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PaginationFooterComponent,
    ThreeDotsButtonComponent,
    PopupMenuComponent,
    FilterPanelComponent,   
  ],
  templateUrl: './users-history.component.html',
  styleUrl: './users-history.component.css',
})
export class UsersHistoryComponent implements OnInit {

  currentUser: any = {};
  isSuperAdmin = false;

  admins: any[] = [];
  selectedAdmin: any = null;
  adminDropdownDisabled = false;

  roles: any[] = [];
  selectedRole: any = null;

  subAdmins: any[] = [];
  selectedSubAdmin: any = null;
  loadingSubAdmins = false;

  sessions: any[] = [];
  loadingSessions = false;
  showSessionTable = false;

  filterPanelOpen = false;

  selectedRange      = 'all';
  selectedRangeLabel = 'All';
  customRangeStart   = '';
  customRangeEnd     = '';

  sessionPage     = 1;
  sessionPageSize = 10;

  get pagedSessions(): any[] {
    const start = (this.sessionPage - 1) * this.sessionPageSize;
    return this.sessions.slice(start, start + this.sessionPageSize);
  }

  activePopupId: any = null;
  popupPosition: { top: number; left: number } = { top: 0, left: 0 };
  actionMenuItems: PopupMenuItem[] = [
    { id: 'login-details',    label: 'Login Details',    icon: 'view' },
    { id: 'activity-details', label: 'Activity Details', icon: 'view' },
  ];

  userDetailsPanelOpen = true;

  get showUserColumns(): boolean {
    return (
      this.selectedRole?.shortCode === 'all' ||
      this.selectedSubAdmin?.id === 'all'
    );
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.activePopupId !== null) this.closeActionPopup();
  }

  constructor(
    private userService: UserService,
    private userSessionService: UserSessionService,
    private roleService: RoleService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    const lsRoleCode = (localStorage.getItem('roleCode') || '').trim().toLowerCase();
    const roleCode = (
      lsRoleCode ||
      this.currentUser?.roleCode ||
      this.currentUser?.role_code ||
      this.currentUser?.Role?.shortCode ||
      this.currentUser?.role?.shortCode ||
      ''
    ).toString().trim().toLowerCase();

    this.isSuperAdmin = roleCode === 'super_admin';

    if (this.isSuperAdmin) {
      this.adminDropdownDisabled = false;
      this.selectedAdmin = null;
      this.roles = [];
      this.subAdmins = [];
      this.fetchAdmins();
    } else {
      this.adminDropdownDisabled = true;
      this.selectedAdmin = {
        id: this.currentUser.id,
        name:
          `${this.currentUser.first_name || ''} ${this.currentUser.last_name || ''}`.trim()
          || this.currentUser.name
          || this.currentUser.email,
      };
      this.fetchRolesAndUsersForAdmin(this.currentUser.id, true);
    }
  }

  fetchAdmins(): void {
    this.userService.getAllUsers({ page: 1, limit: 500, search: '' }).subscribe({
      next: (res: any) => {
        const raw = this.extractArray(res);
        const adminOnly = raw.filter((u: any) => {
          const rc = (
            u.roleCode || u.role_code || u.Role?.shortCode || u.role?.shortCode || ''
          ).toString().toLowerCase();
          return rc === 'admin';
        });
        this.admins = adminOnly.map((a: any) => ({
          ...a,
          name: a.name || `${a.first_name || ''} ${a.last_name || ''}`.trim() || a.email || '—',
        }));
      },
      error: () => { this.admins = []; },
    });
  }

  fetchRolesAndUsersForAdmin(adminId: string, autoShow = false): void {
    this.roles = [];
    this.subAdmins = [];
    this.loadingSubAdmins = true;

    const roles$ = this.roleService.listAllRoles({ createdBy: adminId, page: 1, limit: 100 });
    const users$ = this.userService.getAllUsers({ createdBy: adminId, page: 1, limit: 500, search: '' });

    forkJoin({ roles: roles$, users: users$ }).subscribe({
      next: ({ roles: rolesRes, users }: any) => {
        const roleList = this.extractArray(rolesRes);
if (this.isSuperAdmin) {
  this.roles = [{ roleName: 'All Roles', shortCode: 'all' }, ...roleList];
  this.selectedRole = this.roles[0];
} else {
  this.roles = roleList;
  this.selectedRole = null;
}
        const userList = this.extractArray(users);
  if (this.isSuperAdmin) {
  this.subAdmins = [{ id: 'all', name: 'All Users' }, ...userList];
  this.selectedSubAdmin = this.subAdmins[0];
} else {
  this.subAdmins = [];
  this.selectedSubAdmin = null;
}
        this.loadingSubAdmins = false;

        if (autoShow) this.onShowClick();
      },
      error: () => {
        this.roles = [{ roleName: 'All Roles', shortCode: 'all' }];
        this.selectedRole = this.roles[0];
        this.subAdmins = [{ id: 'all', name: 'All Users' }];
        this.selectedSubAdmin = this.subAdmins[0];
        this.loadingSubAdmins = false;
        if (autoShow) this.onShowClick();
      },
    });
  }

  fetchAllUsers(adminId: string): void {
    this.loadingSubAdmins = true;
    this.userService.getAllUsers({ createdBy: adminId, page: 1, limit: 500, search: '' }).subscribe({
      next: (res: any) => {
        const users = this.extractArray(res);
        this.subAdmins = this.isSuperAdmin
  ? [{ id: 'all', name: 'All Users' }, ...users]
  : users;
        this.loadingSubAdmins = false;
      },
      error: () => {
        this.subAdmins = [{ id: 'all', name: 'All Users' }];
        this.loadingSubAdmins = false;
      },
    });
  }

  fetchUsersForRole(adminId: string, roleCode: string): void {
    this.loadingSubAdmins = true;
    this.subAdmins = [];
    this.userService.getAllUsers({ createdBy: adminId, roleCode, page: 1, limit: 100, search: '' }).subscribe({
      next: (res: any) => {
        const users = this.extractArray(res);
  if (this.isSuperAdmin) {
  this.subAdmins = [{ id: 'all', name: 'All Users' }, ...users];
} else {
  this.subAdmins = users;
}
        this.loadingSubAdmins = false;
      },
      error: () => {
        this.subAdmins = [{ id: 'all', name: 'All Users' }];
        this.loadingSubAdmins = false;
      },
    });
  }
  onFilterAdminSelected(admin: any): void {
    this.selectedAdmin    = admin;
    this.selectedRole     = null;
    this.selectedSubAdmin = null;
    this.subAdmins        = [];
    this.roles            = [];
    this.sessions         = [];
    this.showSessionTable = false;
    this.fetchRolesAndUsersForAdmin(admin.id, false);
  }
onFilterRoleSelected(role: any): void {
  this.selectedRole = role;
  this.selectedSubAdmin = null;

  this.sessions = [];
  this.showSessionTable = false;

  if (!this.selectedAdmin) return;

  if (role.shortCode === 'all') {
    this.fetchAllUsers(this.selectedAdmin.id);
  } else {
    this.fetchUsersForRole(
      this.selectedAdmin.id,
      role.shortCode
    );
  }
}
  onFilterSubAdminSelected(subAdmin: any): void {
    this.selectedSubAdmin = subAdmin;
  }

  onFilterApplied(state: FilterState): void {
    if (!this.isSuperAdmin) {

  if (!state.selectedRole) {
    return;
  }

  if (!state.selectedSubAdmin) {
    return;
  }
}
    this.selectedAdmin       = state.selectedAdmin;
    this.selectedRole        = state.selectedRole;
    this.selectedSubAdmin    = state.selectedSubAdmin;
    this.selectedRange       = state.selectedRange;
    this.selectedRangeLabel  = state.selectedRangeLabel;
    this.customRangeStart    = state.customRangeStart;
    this.customRangeEnd      = state.customRangeEnd;
    this.onShowClick();
  }

  onFilterCleared(): void {
    this.resetSelections();
  }

 

  onShowClick(): void {
    if (!this.selectedAdmin) return;
if (!this.selectedAdmin) return;

if (!this.isSuperAdmin) {

  if (!this.selectedRole) {
    this.showSessionTable = false;
    return;
  }

  if (!this.selectedSubAdmin) {
    this.showSessionTable = false;
    return;
  }
}
    this.showSessionTable = true;
    this.loadingSessions  = true;
    this.sessionPage      = 1;
    this.sessions         = [];

    const adminId = this.selectedAdmin.id;
    const role    = this.selectedRole?.shortCode;
    const userId  = this.selectedSubAdmin?.id;

    if (role === 'all') {
      const userIds = this.subAdmins.filter((u: any) => u.id !== 'all').map((u: any) => u.id);
      this.userSessionService.getUserSessions().subscribe({
        next: (allRes: any) => {
          const all = this.extractArray(allRes);
          const filtered = userIds.length
            ? all.filter((s: any) => userIds.includes(s.user_id ?? s.userId ?? s.User?.id))
            : [];
          this.sessions = this._sortAndFilter(filtered);
          this.loadingSessions = false;
        },
        error: () => { this.sessions = []; this.loadingSessions = false; },
      });
      return;
    }

    if (userId === 'all') {
      this.userService.getAllUsers({ createdBy: adminId, roleCode: role, page: 1, limit: 500, search: '' }).subscribe({
        next: (res: any) => {
          const users = this.extractArray(res);
          const userIds = users.map((u: any) => u.id);
          this.userSessionService.getUserSessions().subscribe({
            next: (allRes: any) => {
              const all = this.extractArray(allRes);
              const filtered = all.filter((s: any) =>
                userIds.includes(s.user_id ?? s.userId ?? s.User?.id)
              );
              this.sessions = this._sortAndFilter(filtered);
              this.loadingSessions = false;
            },
            error: () => { this.sessions = []; this.loadingSessions = false; },
          });
        },
        error: () => { this.sessions = []; this.loadingSessions = false; },
      });
      return;
    }

    const targetId = userId || adminId;
    this.userSessionService.getUserSessionById(String(targetId)).subscribe({
      next: (res: any) => {
        this.sessions = this._sortAndFilter(this.extractArray(res));
        this.loadingSessions = false;
      },
      error: () => { this.sessions = []; this.loadingSessions = false; },
    });
  }

  
  private _sortAndFilter(sessions: any[]): any[] {
    return this._filterByRange(sessions).sort((a, b) =>
      new Date(b.session_created ?? b.createdAt ?? 0).getTime() -
      new Date(a.session_created ?? a.createdAt ?? 0).getTime()
    );
  }

  private _filterByRange(sessions: any[]): any[] {
    if (this.selectedRange === 'all') return sessions;
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = null;

    switch (this.selectedRange) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1); break;
      case 'yesterday':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        end   = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
      case 'last7Days':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
        end   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1); break;
      case 'last30Days':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
        end   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1); break;
      case 'custom':
        if (this.customRangeStart && this.customRangeEnd) {
          start = new Date(this.customRangeStart);
          end   = new Date(this.customRangeEnd);
          end.setDate(end.getDate() + 1);
        } break;
    }

    if (!start || !end) return sessions;
    return sessions.filter(s => {
      const d = new Date(s.session_created ?? s.createdAt);
      return d >= start! && d < end!;
    });
  }

  private extractArray(res: any): any[] {
    if (Array.isArray(res)) return res;
    return (
      res?.data?.details || res?.data?.rows || res?.data?.data || res?.data?.users ||
      res?.data?.roles || res?.data?.sessions || res?.data?.list ||
      (Array.isArray(res?.data) ? res.data : null) ||
      res?.result?.data || res?.result || res?.sessions || res?.users ||
      res?.roles || res?.list || []
    );
  }

 
  trackBySession(_: number, item: any): any { return item.id; }

  onPageChange(event: PageChangeEvent): void {
    this.sessionPage     = event.page;
    this.sessionPageSize = event.pageSize;
  }

  onSessionPageSizeChange(event: Event): void {
    this.sessionPageSize = Number((event.target as HTMLSelectElement).value);
    this.sessionPage     = 1;
  }

 
  openActionPopup(session: any, event: MouseEvent): void {
    event.stopPropagation();
    if (this.activePopupId === session.id) { this.closeActionPopup(); return; }
    this.activePopupId = session.id;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.popupPosition = { top: rect.bottom + 4, left: rect.left - 160 };
  }

  closeActionPopup(): void { this.activePopupId = null; }

  onPopupItemClick(item: PopupMenuItem): void {
    const id = this.activePopupId;
    this.closeActionPopup();
    const session = this.sessions.find(s => s.id === id);
    if (!session) return;
    if (item.id === 'login-details')    this.onViewLoginDetails(session);
    if (item.id === 'activity-details') this.onViewActivityDetails(session);
  }

  onViewLoginDetails(session: any): void {
    const id = session.id ?? session.session_id;
    if (id) this.router.navigate(['/login-details', id]);
  }

  onViewActivityDetails(session: any): void {
    const id = session.id ?? session.session_id;
    if (id) this.router.navigate(['/activity-details', id], { state: { session } });
  }

  
  resetSelections(): void {
    this.selectedRole     = null;
    this.selectedSubAdmin = null;
    this.subAdmins        = [];
    this.sessions         = [];
    this.showSessionTable = false;
    this.selectedRange      = 'all';
    this.selectedRangeLabel = 'All';
    this.customRangeStart   = '';
    this.customRangeEnd     = '';
    this.sessionPage        = 1;

    if (this.isSuperAdmin) {
      this.selectedAdmin = null;
      this.roles         = [];
      this.admins        = [];
      this.fetchAdmins();
    } else {
      this.selectedAdmin = {
        id: this.currentUser.id,
        name:
          `${this.currentUser.first_name || ''} ${this.currentUser.last_name || ''}`.trim()
          || this.currentUser.name
          || this.currentUser.email,
      };
      this.fetchRolesAndUsersForAdmin(this.currentUser.id, false);
    }
  }
}

