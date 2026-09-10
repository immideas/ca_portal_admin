import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PermissionService } from '../../services/permission.service';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

import { PageTopBarComponent } from '../../includes/page-top-bar/page-top-bar.component';
import { PermissionsTableComponent } from '../permissions-table/permissions-table.component';
import { buildTableSections, GroupedPermission, TableRow, TableSection } from '../permission-table.utils';

export type { TableRow, TableSection } from '../permission-table.utils';

@Component({
  selector: 'app-grant-permissions',
  templateUrl: './grant-permissions.component.html',
  styleUrls: ['./grant-permissions.component.css'],
  standalone: true,
  imports: [CommonModule, PageTopBarComponent, PermissionsTableComponent],
})
export class GrantPermissionsComponent implements OnInit {

  users: any[] | null = null;
  selectedUser: any = null;
  permissions: any[] = [];
  groupedPermissions: { groupName: string; permissions: any[]; isChecked: boolean; }[] = [];
  tableSections: TableSection[] = [];
  userDetailsPanelOpen = false;

  role_code: string = '';
  isSuperAdminGrantPermissionPage = false;

  superAdmin = environment.superAdmin;
  subAdmin = environment.subAdmin;
  admin = environment.admin;

  constructor(
    private permissionService: PermissionService,
    private toastr: ToastrService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.fetchUsersWithPreselect();
    this.role_code = localStorage.getItem('role_code') || '';
    this.isSuperAdminGrantPermissionPage = this.role_code === this.superAdmin;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.others-popup-container')) {
      this.closeAllPopups();
    }
  }

  closeAllPopups(): void {
    this.tableSections.forEach((section) =>
      section.rows.forEach((row) => (row.showOthersPopup = false))
    );
  }

  private fetchUsersWithPreselect(): void {
    this.permissionService.listPermissionUsers().subscribe({
      next: (res: any) => {
        
        this.users = res?.users || [];
        const nav = window.history.state || {};
        const preselectId = nav.userId;
        if (preselectId && this.users) {
          const foundUser = this.users.find(
            (u: any) => String(u.id) === String(preselectId)
          );
          if (foundUser) {
            this.selectedUser = foundUser;
            this.onUserSelect(foundUser.id);
          }
        }
      },
      error: (err: any) => {
        console.error('Error fetching users:', err);
      }
    });
  }

  onUserSelect(userId: number): void {
    this.selectedUser = this.users?.find((u: any) => u.id === userId);
    
    if (!this.selectedUser) return;
    this.loadPermissionsForUser();
  }

  private loadPermissionsForUser(): void {
    

    this.permissionService.listAllPermissions(this.selectedUser.id).subscribe({
      next: (res: any) => {
        
        const savedPerms: string[] = this.selectedUser.permission_code || [];
        const savedGroups: string[] = this.selectedUser.groupCode || [];

        const allPerms: any[] = Array.isArray(res) ? res : res?.permissions || [];
       

        this.permissions = allPerms.map((p: any) => {
          const isAssigned =
            savedPerms.includes(p.permission) || savedPerms.includes(p.name);
          return {
            ...p,
            isChecked: isAssigned && !p.disabled
          };
        });
        this.groupPermissionsByGroupName();

        this.groupedPermissions.forEach((g) => {
          if (savedGroups.includes(g.permissions[0]?.groupCode)) {
            g.permissions.forEach((p: any) => {
              if (!p.disabled) {
                p.isChecked = true;
              }
            });
          }
        });

       
        this.buildTableSections();
      },
      error: (err: any) => {
        console.error('Error loading permissions:', err);
      }
    });
  }

  private groupPermissionsByGroupName(): void {
    const map: Record<string, any> = {};
    this.permissions.forEach((p: any) => {
      const groupName = p.groupName || 'General';
      if (!map[groupName]) {
        map[groupName] = { groupName, permissions: [], isChecked: false };
      }
      map[groupName].permissions.push(p);
    });
    this.groupedPermissions = Object.values(map).map((g: any) => {
      const enabledPermissions = g.permissions.filter((p: any) => !p.disabled);
      g.isChecked = enabledPermissions.length > 0 && enabledPermissions.every((p: any) => p.isChecked);
      return g;
    });
  }


  private buildTableSections(): void {
    this.tableSections = buildTableSections(this.groupedPermissions as GroupedPermission[]);
  }

  isRowFullyChecked(row: TableRow): boolean {
    const std = [row.view, row.create, row.edit, row.delete, row.sidePanel].filter(Boolean);
    return std.length > 0 && std.every((p: any) => p.isChecked);
  }

  onFullChange(row: TableRow): void {
    const checked = row.full?.isChecked ?? false;
    if (row.view)      row.view.isChecked = checked;
    if (row.create)    row.create.isChecked = checked;
    if (row.edit)      row.edit.isChecked = checked;
    if (row.delete)    row.delete.isChecked = checked;
    if (row.sidePanel) row.sidePanel.isChecked = checked;
    row.others.forEach((p: any) => (p.isChecked = checked));
    this.syncGroupedPermissions();
  }

  onVirtualFullChange(row: TableRow, event: any): void {
    const checked = event.checked;
    if (row.view)      row.view.isChecked = checked;
    if (row.create)    row.create.isChecked = checked;
    if (row.edit)      row.edit.isChecked = checked;
    if (row.delete)    row.delete.isChecked = checked;
    if (row.sidePanel) row.sidePanel.isChecked = checked;
    row.others.forEach((p: any) => (p.isChecked = checked));
    this.syncGroupedPermissions();
  }

  onColumnChange(row: TableRow): void {
    if (!row.full) { this.syncGroupedPermissions(); return; }
    const std = [row.view, row.create, row.edit, row.delete, row.sidePanel].filter(Boolean);
    row.full.isChecked = std.length > 0 && std.every((p: any) => p.isChecked);
    this.syncGroupedPermissions();
  }

  syncGroupedPermissions(): void {
    this.groupedPermissions.forEach((g) => {
      g.isChecked = g.permissions.every((p: any) => p.isChecked);
    });
  }

  toggleOthersPopup(row: TableRow, event: MouseEvent): void {
    event.stopPropagation();
    const wasOpen = row.showOthersPopup;
    this.closeAllPopups();
    row.showOthersPopup = !wasOpen;
  }

  onGroupPermissionChange(group: any): void {
    group.permissions.forEach((p: any) => (p.isChecked = group.isChecked));
  }

  onPermissionChange(group: any, _perm: any): void {
    group.isChecked = group.permissions.every((p: any) => p.isChecked);
  }

  onTopBarButton(action: string): void {
    if (action === 'save') {
      this.savePermissions();
    } else {
      this.goBack();
    }
  }

  goBack(): void {
    this.router.navigate(['/admins']);
  }

  savePermissions(): void {
    if (!this.selectedUser?.id) {
      this.toastr.error('No user selected', 'Error');
      return;
    }
    const permissionsToSave = this.groupedPermissions
      .flatMap((g: any) =>
        g.permissions
          .filter((p: any) => p.isChecked && !p.disabled)
          .map((p: any) => p.permission || p.name)
      );
    const groupCodesToSave = this.groupedPermissions
      .filter((g: any) => {
        const enabledPermissions = g.permissions.filter((p: any) => !p.disabled);
        return enabledPermissions.length > 0 && enabledPermissions.every((p: any) => p.isChecked);
      })
      .map((g: any) =>
        g.permissions.find((p: any) => p.groupCode)?.groupCode || ''
      )
      .filter((code: string) => !!code);

  

    this.permissionService
      .giveUsersPermissions(this.selectedUser.id, permissionsToSave, groupCodesToSave)
      .subscribe({
        next: () => this.toastr.success('Permissions saved successfully', 'Success'),
        error: (err: any) => {
          console.error('Save error:', err);
          this.toastr.error('Failed to save permissions', 'Error');
        }
      });
  }
}