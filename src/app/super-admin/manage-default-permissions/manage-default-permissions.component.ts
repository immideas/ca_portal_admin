import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PermissionService } from '../../services/permission.service';
import { RoleService } from '../../services/role.service';
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from 'ngx-toastr';
import { PageTopBarComponent } from '../../includes/page-top-bar/page-top-bar.component';
import { PermissionsTableComponent } from '../../permissions/permissions-table/permissions-table.component';
import { TableRow, TableSection } from '../../permissions/grant-permissions/grant-permissions.component';
import { buildTableSections, GroupedPermission } from '../../permissions/permission-table.utils';

@Component({
  selector: 'app-manage-default-permissions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    PageTopBarComponent,
    PermissionsTableComponent,
  ],
  templateUrl: './manage-default-permissions.component.html',
  styleUrl: './manage-default-permissions.component.css',
})
export class ManageDefaultPermissionsComponent implements OnInit {

  roles: any[] = [];
  selectedRole: any = null;
  selectedUserForTable: any = null;
  groupedPermissions: any[] = [];
  tableSections: TableSection[] = [];

  constructor(
    private permissionService: PermissionService,
    private roleService: RoleService,
    private toastr: ToastrService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const roleId = this.route.snapshot.queryParamMap.get('roleId');

    if (roleId) {
      this.preselectByRoleId(roleId);
    } else {
      this.fetchRoles();
    }
  }

  private normalize(val: string): string {
    return (val || '').trim().toLowerCase();
  }

  private preselectByRoleId(roleId: string): void {
    this.roleService.listRoleById(roleId).subscribe({
      next: (res: any) => {
        const role = res?.data ?? res;

        if (role?.id) {
          this.roles = [role];
          this.onSelectRole(role);
        } else {
          this.fetchRoles();
        }
      },
      error: () => this.fetchRoles()
    });
  }

  fetchRoles(): void {
    this.roleService.listAllRoles().subscribe({
      next: (res: any) => {
        this.roles = res?.data || [];
      },
      error: (err) => console.error(err),
    });
  }

  onSelectRole(role: any): void {
    this.selectedRole = role;
    this.selectedUserForTable = {
      name:  role.roleName        || role.name        || 'Role',
      email: role.roleDescription || role.description || '',
      phone: '',
    };
    this.fetchPermissionsForRole(role);
  }

  private fetchPermissionsForRole(role: any): void {
    if (!role) return;

    const assignedPermissions: string[] =
      Array.isArray(role.permission)
        ? role.permission.map((p: string) => this.normalize(p))
        : [];

    this.permissionService.listAllPermissions().subscribe({
      next: (res: any) => {

        let rawList: any[] = [];

        if (Array.isArray(res)) rawList = res;
        else if (Array.isArray(res?.data)) rawList = res.data;
        else if (Array.isArray(res?.permissions)) rawList = res.permissions;

        const permObjects = rawList.map((p: any) =>
          this.mapPermission(p, assignedPermissions)
        );

        this.buildGroupsAndSections(permObjects);
      }
    });
  }

  private mapPermission(p: any, assigned: string[]): any {
    return {
      permission: p.permission,
      name: p.name || '',              
      groupName: p.groupName || 'General',
      section_name: p.section_name || p.section || p.category || '',
      group_code: p.group_code || '',
      description: p.description || '',
      isChecked: assigned.includes(this.normalize(p.permission))
    };
  }

  private buildGroupsAndSections(permObjects: any[]): void {

    const map: any = {};

    permObjects.forEach(p => {
      if (!map[p.groupName]) {
        map[p.groupName] = {
          groupName: p.groupName,
          permissions: [],
          isChecked: false
        };
      }

      map[p.groupName].permissions.push(p);
    });

    this.groupedPermissions = Object.values(map).map((g: any) => {
      g.isChecked = g.permissions.every((p: any) => p.isChecked);
      return g;
    });

    this.buildTableSections();
  }

  // NAYA: ab shared util call karta hai — apni khud ki getColumnKey()
  // duplicate nahi rakhi. (Pehle yahan 'import'/'export'/'enable'
  // keywords bhi the — woh ab shared util mein consistent hain.)
  private buildTableSections(): void {
    this.tableSections = buildTableSections(this.groupedPermissions as GroupedPermission[]);
  }

  syncGroupedPermissions(): void {
    this.groupedPermissions.forEach(g => {
      g.isChecked = g.permissions.every((p: any) => p.isChecked);
    });
  }

  onTopBarButton(action: string): void {
    action === 'save' ? this.savePermissions() : this.goBack();
  }

  goBack(): void {
    this.router.navigate(['/manage-roles']);
  }

  savePermissions(): void {

    if (!this.selectedRole) {
      this.toastr.error('Select role first');
      return;
    }

    const selectedPermissions = this.groupedPermissions.flatMap(group =>
      group.permissions
        .filter((p: any) => p.isChecked)
        .map((p: any) => p.permission)
    );

    this.roleService.assignPermissionAndGroupCode({
      id: this.selectedRole.id,
      permission: selectedPermissions,
    }).subscribe({
      next: () =>
        this.toastr.success('Permissions updated successfully'),
      error: () =>
        this.toastr.error('Failed to update permissions'),
    });
  }
}