import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SessionActivityService } from '../../services/session.activity.service';
import { ActivatedRoute } from '@angular/router';
import { UserService } from '../../services/user.service';
import { RoleService } from '../../services/role.service';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../confirm-dialog/confirm-dialog.component';
import { AuthService } from '../../auth.service';
import {
  PaginationFooterComponent,
  PageChangeEvent,
} from '../../shared/pagination-footer/pagination-footer.component';
import { ThreeDotsButtonComponent } from '../../shared/three-dots-button/three-dots-button.component';
import { PopupMenuComponent } from '../../shared/popup-menu/popup-menu.component';
import { PopupMenuItem } from '../../shared/popup-menu/popup-menu.model';

import { FilterPanelComponent, FilterState } from '../../shared/filter-panel/filter-panel.component';

@Component({
  selector: 'app-activity-details',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PaginationFooterComponent,
    ThreeDotsButtonComponent,
    PopupMenuComponent,
    FilterPanelComponent,
  ],
  providers: [DatePipe],
  templateUrl: './activity-details.component.html',
  styleUrls: ['./activity-details.component.css'],
})
export class ActivityDetailsComponent implements OnInit, OnDestroy {

  activities: any[] = [];
  filteredActivities: any[] = [];
  sessionId: string = '';
  selectedSession: any = null;
  loading = false;
  error: string | null = null;

  admins: any[] = [];
  selectedAdmin: any = null;
  roles: any[] = [];
  selectedRole: any = null;
  subAdmins: any[] = [];
  selectedSubAdmin: any = null;
  loadingSubAdmins = false;

  selectedRange: string = 'all';
  selectedRangeLabel: string = 'All';
  customRangeStart: string = '';
  customRangeEnd: string = '';

  uniqueModels: string[] = [];
  uniqueActivityTypes: string[] = [];
  selectedModel: string = '';
  selectedActivityType: string = '';

  currentUser: any = {};
  isSuperAdmin = false;
  isAdminUser: boolean = false;
  adminDropdownDisabled: boolean = false;

  filterPanelOpen = false;
showActivityTable = false;
  private refreshSubscription?: Subscription;

  activePopupId: any = null;
  popupPosition: { top: number; left: number } = { top: 0, left: 0 };
  actionMenuItems: PopupMenuItem[] = [
    { id: 'view-details', label: 'View Activity Details', icon: 'view' },
    { id: 'open-tab',     label: 'Open in New Tab',       icon: 'view' },
  ];

  activityPage: number = 1;
  activityPageSize: number = 10;

  get activityTotalPages(): number {
    return Math.ceil(this.filteredActivities.length / this.activityPageSize) || 1;
  }

  get pagedActivities(): any[] {
    if (!this.filteredActivities) return [];
    const start = (this.activityPage - 1) * this.activityPageSize;
    return this.filteredActivities.slice(start, start + this.activityPageSize);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.activePopupId !== null) this.closeActionPopup();
  }

  constructor(
    private sessionActivityService: SessionActivityService,
    private route: ActivatedRoute,
    private userService: UserService,
    private roleService: RoleService,
    private router: Router,
    private dialog: MatDialog,
    private authService: AuthService,
  ) {}

  
  ngOnInit() {
    const nav = this.router.getCurrentNavigation();
    this.selectedSession = nav?.extras?.state?.['session'] || history.state?.session || null;

    this.currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    const lsRoleCode = (localStorage.getItem('roleCode') || '').trim().toLowerCase();
    const lsAdminId  = localStorage.getItem('adminId');
    const lsName     = localStorage.getItem('name');

    const roleCode = (
      lsRoleCode ||
      this.currentUser?.roleCode ||
      this.currentUser?.role_code ||
      this.currentUser?.Role?.shortCode ||
      this.currentUser?.role?.shortCode ||
      ''
    ).toString().trim().toLowerCase();

    this.isSuperAdmin = roleCode === 'super_admin';
    this.isAdminUser  = roleCode === 'admin';

    if (!this.currentUser?.id && lsAdminId) {
      this.currentUser = {
        ...this.currentUser,
        id: lsAdminId,
        name: lsName || this.currentUser?.name || '',
      };
    }

    const savedSelections = localStorage.getItem('activityDetailsSelections');
    let restored = false;

    if (savedSelections) {
      try {
        const selections = JSON.parse(savedSelections);
        const savedAdminId = selections.selectedAdminId || this.currentUser?.id || lsAdminId;

        if (savedAdminId) {
          restored = true;
          this.adminDropdownDisabled = this.isSuperAdmin
            ? (selections.adminDropdownDisabled ?? false) : true;

          this.userService.getUserById(String(savedAdminId)).subscribe({
            next: (admin: any) => {
              this.selectedAdmin = {
                ...admin,
                name: admin?.name ||
                  `${admin?.first_name || ''} ${admin?.last_name || ''}`.trim() ||
                  admin?.email || lsName || 'Admin',
              };
              this.admins = [this.selectedAdmin];
              this.fetchRolesForAdmin(String(savedAdminId));

              setTimeout(() => {
                if (selections.selectedRoleShortCode) {
                  const roleObj = this.roles.find(r => r.shortCode === selections.selectedRoleShortCode);
                  if (roleObj) {
                    this.selectedRole = roleObj;
                    this.onSelectRole(roleObj);
                    setTimeout(() => {
                      if (selections.selectedSubAdminId) {
                        this.selectedSubAdmin = this.subAdmins.find(
                          u => String(u.id) === String(selections.selectedSubAdminId)
                        ) || null;
                      }
                      this.selectedRange      = selections.selectedRange || 'all';
                      this.selectedRangeLabel = selections.selectedRangeLabel || 'All';
                      this.customRangeStart   = selections.customRangeStart || '';
                      this.customRangeEnd     = selections.customRangeEnd || '';
                      if (selections.showSessionTable) this.onShowClick();
                    }, 200);
                  }
                }
              }, 400);
            },
            error: () => { this.initializeDefaultFlow(); },
          });
        }
      } catch (e) {
        console.warn('[ActivityDetails] savedSelections parse error', e);
      }
    }

    if (!restored) this.initializeDefaultFlow();

    this.sessionId = this.route.snapshot.paramMap.get('sessionId') || '';
    if (this.sessionId) {
      this.fetchActivitiesBySession();
      if (this.isSessionActive()) {
        this.startAutoRefresh();
      }
    }
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  private initializeDefaultFlow() {
    if (this.isSuperAdmin) {
      this.adminDropdownDisabled = false;
      this.selectedAdmin = null;
      this.fetchAdmins();
      return;
    }

    this.adminDropdownDisabled = true;
    const adminId = this.currentUser?.id || localStorage.getItem('adminId');
    const name =
      this.currentUser?.name ||
      localStorage.getItem('name') ||
      `${this.currentUser?.first_name || ''} ${this.currentUser?.last_name || ''}`.trim() ||
      this.currentUser?.email || 'Admin';

    if (!adminId) return;

    this.selectedAdmin = { id: adminId, name };
    this.fetchRolesAndUsersForAdmin(String(adminId), false);
  }
  fetchAdmins(): void {
    this.userService.getAllUsers({ page: 1, limit: 500, search: '' }).subscribe({
      next: (res: any) => {
        const raw = this.extractArray(res);
        const adminOnly = raw.filter((u: any) => {
          const rc = (u.roleCode || u.role_code || u.Role?.shortCode || u.role?.shortCode || '')
            .toString().toLowerCase();
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

  fetchRolesForAdmin(adminId: string): void {
    this.roles = [];
    
  this.roleService.listAllRoles({
  createdBy: adminId,
  page: 1,
  limit: 100
}).subscribe({
  next: (rolesRes: any) => {

    const roleList = this.extractArray(rolesRes);

    if (this.isSuperAdmin) {
      this.roles = [
        { roleName: 'All Roles', shortCode: 'all' },
        ...roleList
      ];
    } else {
      this.roles = roleList;
    }
  this.restoreSelections();

  
  },
  error: () => {
    this.roles = [];
    this.subAdmins = [];
    this.loadingSubAdmins = false;
  },
});
  }
fetchAllUsers(adminId: string): void {
  this.loadingSubAdmins = true;

  this.userService.getAllUsers({
    createdBy: adminId,
    page: 1,
    limit: 500,
    search: ''
  }).subscribe({
    next: (res: any) => {

      const users = this.extractArray(res);

      this.subAdmins = this.isSuperAdmin
        ? [{ id: 'all', name: 'All Users' }, ...users]
        : users;
      this.selectedSubAdmin = this.subAdmins[0]; 

      this.loadingSubAdmins = false;

    },
    error: () => {
      this.subAdmins = [{ id: 'all', name: 'All Users' }];
      this.loadingSubAdmins = false;
    },
  });
}
  fetchRolesAndUsersForAdmin(adminId: string, autoShow = false): void {
    this.roles = [];
    this.subAdmins = [];
    this.selectedRole = null;
    this.selectedSubAdmin = null;
    this.loadingSubAdmins = true;

    this.roleService.listAllRoles({ createdBy: adminId, page: 1, limit: 100 }).subscribe({
      next: (rolesRes: any) => {
const roleList = this.extractArray(rolesRes);

if (this.isSuperAdmin) {
  this.roles = [
    { roleName: 'All Roles', shortCode: 'all' },
    ...roleList
  ];

  this.selectedRole = this.roles[0];

  this.subAdmins = [
    { id: 'all', name: 'All Users' }
  ];

  this.selectedSubAdmin = this.subAdmins[0];

  this.fetchAllUsers(adminId);
}
else {
  this.roles = roleList;
  this.subAdmins = [];
}
        this.loadingSubAdmins = false;
        if (autoShow) this.onShowClick();
      },
      error: () => {
        this.roles = [];
        this.subAdmins = [];
        this.loadingSubAdmins = false;
        if (autoShow) this.onShowClick();
      },
    });
  }
  onFilterAdminSelected(admin: any): void {
    this.showActivityTable = false;
    this.selectedAdmin      = admin;
    this.selectedRole       = null;
    this.selectedSubAdmin   = null;
    this.subAdmins          = [];
    this.roles              = [];
    this.activities         = [];
    this.filteredActivities = [];
    if (admin?.id) this.fetchRolesAndUsersForAdmin(admin.id, false);
  }

 
 
onFilterRoleSelected(role: any): void {

  this.showActivityTable = false;
  this.selectedRole = role;
  this.selectedSubAdmin = null;

  if (!this.selectedAdmin || !role) return;

  if (role.shortCode === 'all') {

    this.fetchAllUsers(this.selectedAdmin.id);

    return;
  }

  this.loadingSubAdmins = true;

  this.userService.getAllUsers({
    createdBy: this.selectedAdmin.id,
    roleCode: role.shortCode,
    page: 1,
    limit: 500,
    search: ''
  }).subscribe({
    next: (res: any) => {

      let users = this.extractArray(res);

      if (this.isSuperAdmin) {
        this.subAdmins = [
          { id: 'all', name: 'All Users' },
          ...users
        ];
      } else {
        users = users.filter(
          (u: any) => u.id !== this.currentUser.id
        );

        this.subAdmins = users;
      }

      this.loadingSubAdmins = false;
    },
    error: () => {
      this.subAdmins = this.isSuperAdmin
        ? [{ id: 'all', name: 'All Users' }]
        : [];

      this.loadingSubAdmins = false;
    },
  });
}
  onFilterSubAdminSelected(subAdmin: any): void {
    this.selectedSubAdmin = subAdmin;
  }

  onFilterApplied(state: FilterState): void {

    this.selectedAdmin        = state.selectedAdmin;
    this.selectedRole         = state.selectedRole;
    this.selectedSubAdmin     = state.selectedSubAdmin;
    this.selectedRange        = state.selectedRange;
    this.selectedRangeLabel   = state.selectedRangeLabel;
    this.customRangeStart     = state.customRangeStart;
    this.customRangeEnd       = state.customRangeEnd;
    this.selectedModel        = state.selectedModel || '';
    this.selectedActivityType = state.selectedActivityType || '';
    if (this.sessionId) {
      this.applyFiltersSession();
      if (this.isSessionActive()) {
        this.startAutoRefresh();
      }
    } else {
      this.onShowClick();
    }
    this.filterPanelOpen = false;
  }

  onFilterCleared(): void {
    this.resetSelections();
  }
  onSelectAdmin(admin: any): void {
    this.selectedAdmin      = admin;
    this.selectedRole       = null;
    this.selectedSubAdmin   = null;
    this.subAdmins          = [];
    this.roles              = [];
    this.activities         = [];
    this.filteredActivities = [];
    if (admin?.id) this.fetchRolesAndUsersForAdmin(admin.id, false);
  }

  onSelectRole(role: any): void {
    this.selectedRole = role;
    if (!this.selectedAdmin || !role) return;
    this.loadingSubAdmins = true;

    this.userService.getAllUsers({
      createdBy: this.selectedAdmin.id,
      roleCode: role.shortCode,
      page: 1,
      limit: 500,
      search: ''
    }).subscribe({
      next: (res: any) => {
        let users = this.extractArray(res);
        if (!this.isSuperAdmin) {
          users = users.filter((u: any) => u.id !== this.currentUser.id);
        }
        this.subAdmins = users;
        this.loadingSubAdmins = false;
      },
      error: () => {
        this.subAdmins = [];
        this.loadingSubAdmins = false;
      },
    });
  }
  isSessionActive(): boolean {
    return !(
      this.selectedSession?.status === 'ended' ||
      this.selectedSession?.status === 'expired' ||
      this.selectedSession?.session_ended
    );
  }

  startAutoRefresh(): void {
    this.stopAutoRefresh();
    this.refreshSubscription = interval(10000).subscribe(() => {
      if (!this.isSessionActive()) {
        this.stopAutoRefresh();
        return;
      }
      this.fetchActivitiesBySession();
    });
  }

  stopAutoRefresh(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
      this.refreshSubscription = undefined;
    }
  }

  fetchActivitiesBySession() {
    this.loading = true;
    this.sessionActivityService.getSessionActivitiesBySessionId(this.sessionId).subscribe({
      next: (res) => {
        this.activities = res?.activities || res || [];
        this.extractDropdownValues();
        this.applyFiltersSession();
        this.activityPage = 1;
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load activities.';
        this.loading = false;
      },
    });
  }

  extractDropdownValues() {
    this.uniqueModels = Array.from(new Set(
      this.activities.map(a => a.model_name || a.model || a.record_created).filter(Boolean)
    ));
    this.uniqueActivityTypes = Array.from(new Set(
      this.activities.map(a => a.activity_type).filter(x => x)
    ));
  }

  applyFiltersSession() {
    let filtered = [...this.activities];

    if (this.selectedModel) {
      filtered = filtered.filter(a =>
        (a.model_name || a.model || a.record_created) === this.selectedModel
      );
    }

    if (this.selectedActivityType) {
      filtered = filtered.filter(a =>
        a.activity_type === this.selectedActivityType
      );
    }

    this.filteredActivities = filtered.sort((a, b) =>
      new Date(b.entry_created || b.createdAt || 0).getTime() -
      new Date(a.entry_created || a.createdAt || 0).getTime()
    );
    this.activityPage = 1;
  }
  onShowClick(): void {
    this.showActivityTable = true;
 
if (!this.selectedAdmin || !this.selectedRole) {
  return;
}
    this.loading = true;
    this.activities = [];
    this.filteredActivities = [];
    this.activityPage = 1;
const role   = this.selectedRole?.shortCode;
const userId = this.selectedSubAdmin?.id;
  
if (role === 'all') {

  const userIds = this.subAdmins
    .filter((u: any) => u.id !== 'all')
    .map((u: any) => u.id)
    .join(',');

  this.sessionActivityService
    .getAllSessionActivitiesBySelectedUserId(userIds)
    .subscribe({
      next: (actRes: any) => {

        this.activities = this.extractArray(actRes);

        this.extractDropdownValues();
        this.applyFiltersHistory();

        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });

  return;
}
if (userId === 'all') {

  this.userService.getAllUsers({
    createdBy: this.selectedAdmin.id,
    roleCode: role,
    page: 1,
    limit: 500,
    search: ''
  }).subscribe({
    next: (res: any) => {

      const userIds = this.extractArray(res)
        .map((u: any) => u.id)
        .join(',');

      this.sessionActivityService
        .getAllSessionActivitiesBySelectedUserId(userIds)
        .subscribe({
          next: (actRes: any) => {

            this.activities = this.extractArray(actRes);

            this.extractDropdownValues();
            this.applyFiltersHistory();

            this.loading = false;
          },
          error: () => {
            this.loading = false;
          }
        });
    }
  });

  return;
}

    this.sessionActivityService
      .getAllSessionActivitiesBySelectedUserId(String(userId))
      .subscribe({
        next: (actRes: any) => {

          this.activities = this.extractArray(actRes);

          this.extractDropdownValues();
          this.applyFiltersHistory();

          this.loading = false;
        },
        error: () => {
          this.activities = [];
          this.filteredActivities = [];
          this.loading = false;
          this.error = 'Failed to load activities.';
        },
      });
  }

  applyFiltersHistory() {
    let filtered = [...this.activities];
    let start: Date | null = null;
    let end: Date | null = null;
    const now = new Date();

    switch (this.selectedRange) {
      case 'today':
        start = new Date(now.setHours(0, 0, 0, 0)); end = new Date(); break;
      case 'yesterday':
        start = new Date(); start.setDate(start.getDate() - 1); start.setHours(0, 0, 0, 0);
        end = new Date(start); end.setDate(end.getDate() + 1); break;
      case 'last7Days':
        start = new Date(); start.setDate(start.getDate() - 6); end = new Date(); break;
      case 'last30Days':
        start = new Date(); start.setDate(start.getDate() - 29); end = new Date(); break;
      case 'custom':
        if (this.customRangeStart && this.customRangeEnd) {
          start = new Date(this.customRangeStart);
          end   = new Date(this.customRangeEnd);
          end.setDate(end.getDate() + 1);
        } break;
    }

    if (start && end) {
      filtered = filtered.filter(a => {
        const d = new Date(a.entry_created || a.createdAt);
        return d >= start! && d <= end!;
      });
    }

    if (this.selectedModel) {
      filtered = filtered.filter(a =>
        (a.model_name || a.model || a.record_created) === this.selectedModel
      );
    }

    if (this.selectedActivityType) {
      filtered = filtered.filter(a =>
        a.activity_type === this.selectedActivityType
      );
    }

    this.filteredActivities = filtered.sort((a, b) =>
      new Date(b.entry_created || b.createdAt || 0).getTime() -
      new Date(a.entry_created || a.createdAt || 0).getTime()
    );
    this.activityPage = 1;
  }
  onPageSizeChange(event: Event): void {
    this.activityPageSize = Number((event.target as HTMLSelectElement).value);
    this.activityPage = 1;
  }

  onCustomPageChange(event: PageChangeEvent): void {
    this.activityPage     = event.page;
    this.activityPageSize = event.pageSize;
  }
resetSelections(): void {
    this.showActivityTable = false;
    this.selectedModel        = '';
    this.selectedActivityType = '';
    this.selectedRole         = null;
    this.selectedSubAdmin     = null;
    this.subAdmins            = [];
    this.activities           = [];
    this.filteredActivities   = [];
    this.selectedRange        = 'all';
    this.selectedRangeLabel   = 'All';
    this.customRangeStart     = '';
    this.customRangeEnd       = '';
    this.activityPage         = 1;
    this.closeActionPopup();
    localStorage.removeItem('activityDetailsSelections');

    if (this.isSuperAdmin) {
      this.selectedAdmin = null;
      this.roles         = [];
      this.admins        = [];
      this.fetchAdmins();
    } else {
      const adminId = this.currentUser?.id || localStorage.getItem('adminId');
      if (adminId) this.fetchRolesAndUsersForAdmin(String(adminId), false);
    }
  }
hasActiveFilters(): boolean {
  return !!(
    (this.isSuperAdmin && this.selectedAdmin) ||
    this.selectedRole ||
    this.selectedSubAdmin ||
    this.selectedModel ||
    this.selectedActivityType ||
    this.showActivityTable
  );
}
  restoreSelections(): void {
    const saved = localStorage.getItem('activityDetailsSelections');
    if (!saved) return;
    try {
      const selections = JSON.parse(saved);
      this.selectedRole = this.roles.find(r => r.shortCode === selections.selectedRoleShortCode) || null;
      if (!this.selectedRole) return;

      this.loadingSubAdmins = true;
      this.userService.getAllUsers({
        createdBy: this.selectedAdmin?.id,
        roleCode: this.selectedRole.shortCode,
        page: 1,
        limit: 500,
        search: ''
      }).subscribe({
        next: (res: any) => {
          let users = this.extractArray(res);
          if (!this.isSuperAdmin) {
            users = users.filter((u: any) => u.id !== this.currentUser.id);
          }
          this.subAdmins = users;
          this.selectedSubAdmin = this.subAdmins.find(
            u => String(u.id) === String(selections.selectedSubAdminId)
          ) || null;
          this.selectedRange      = selections.selectedRange || 'all';
          this.selectedRangeLabel = selections.selectedRangeLabel || 'All Dates';
          this.customRangeStart   = selections.customRangeStart || '';
          this.customRangeEnd     = selections.customRangeEnd || '';
          this.loadingSubAdmins   = false;
          if (selections.showSessionTable) this.onShowClick();
        },
        error: () => { this.loadingSubAdmins = false; },
      });
    } catch (e) {
      console.error('restoreSelections error', e);
    }
  }

  private extractArray(res: any): any[] {
    if (Array.isArray(res)) return res;
    return (
      res?.data?.details || res?.data?.rows || res?.data?.data || res?.data?.users ||
      res?.data?.roles || res?.data?.sessions || res?.data?.list ||
      (Array.isArray(res?.data) ? res.data : null) ||
      res?.result?.data || res?.result || res?.sessions || res?.users ||
      res?.roles || res?.activities || res?.list || []
    );
  }

  cleanPageVisited(path: string): string {
    if (!path) return '';
    if (path.startsWith('/admin/')) return path.substring(7);
    if (path.startsWith('/api/'))   return path.substring(5);
    if (path.startsWith('/'))       return path.substring(1);
    if (path.startsWith('admin/'))  return path.substring(6);
    if (path.startsWith('api/'))    return path.substring(4);
    return path.replace(/^\/+/, '');
  }

  formatActivityType(type: string): string {
    return type ? type.replace(/_/g, ' ') : '';
  }

  closeSessionMode() {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: { message: 'Are you sure you want to exit session view and return to normal activity history?' },
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.stopAutoRefresh();
        this.router.navigate(['/activity-details']);
      }
    });
  }

  viewActivityLine(activity: any) {
    localStorage.setItem('activityDetailsSelections', JSON.stringify({
      selectedAdminId:        this.selectedAdmin?.id,
      selectedRoleShortCode:  this.selectedRole?.shortCode,
      selectedSubAdminId:     this.selectedSubAdmin?.id,
      selectedRange:          this.selectedRange,
      selectedRangeLabel:     this.selectedRangeLabel,
      customRangeStart:       this.customRangeStart,
      customRangeEnd:         this.customRangeEnd,
      showSessionTable:       true,
      adminDropdownDisabled:  this.adminDropdownDisabled,
    }));
    if (activity && activity.id) this.router.navigate(['/activity-line', activity.id]);
  }

  openActivityUrl(activity: any) {
    if (activity && activity.id) {
      this.sessionActivityService.getUrlByActivityId(activity.id).subscribe({
        next: (res) => { if (res && res.url) window.open(res.url, '_blank'); },
        error: () => {},
      });
    }
  }

  openActionPopup(activity: any, event: MouseEvent): void {
    event.stopPropagation();
    if (this.activePopupId === activity.id) { this.closeActionPopup(); return; }
    this.activePopupId = activity.id;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.popupPosition = { top: rect.bottom + 4, left: rect.left - 170 };
  }

  closeActionPopup(): void { this.activePopupId = null; }

  onPopupItemClick(item: PopupMenuItem): void {
    const activity = this.activities.find(a => a.id === this.activePopupId);
    this.closeActionPopup();
    if (!activity) return;
    switch (item.id) {
      case 'view-details': this.viewActivityLine(activity);  break;
      case 'open-tab':     this.openActivityUrl(activity);   break;
    }
  }
}