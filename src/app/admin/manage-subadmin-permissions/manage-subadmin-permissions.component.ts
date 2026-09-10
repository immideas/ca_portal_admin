import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { PermissionService } from '../../services/permission.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ToastrService } from 'ngx-toastr';
import { PermissionsTableComponent } from '../../permissions/permissions-table/permissions-table.component';
import { PageTopBarComponent } from '../../includes/page-top-bar/page-top-bar.component';
import { Router } from '@angular/router';
import { TableRow, TableSection } from '../../permissions/grant-permissions/grant-permissions.component';
import { buildTableSections, GroupedPermission } from '../../permissions/permission-table.utils';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-manage-subadmin-permissions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    PermissionsTableComponent,
    PageTopBarComponent,
  ],
  templateUrl: './manage-subadmin-permissions.component.html',
  styleUrls: ['./manage-subadmin-permissions.component.css']
})
export class ManageSubadminPermissionsComponent implements OnInit {
  subAdmins: any[] = [];
  selectedSubAdmin: any = null;
  permissions: any[] = [];
  groupedPermissions: any[] = [];
  adminPermissions: string[] = [];
  tableSections: TableSection[] = [];
  loading = false;

  private preselectSubAdminId: string | null = null;

  constructor(
    private userService: UserService,
    private permissionService: PermissionService,
    private toastr: ToastrService,
    private route: ActivatedRoute,
    private router: Router
  ) {}



ngOnInit(): void {
  this.route.queryParamMap.subscribe(params => {
    this.preselectSubAdminId = params.get('subAdminId');
    if (!this.preselectSubAdminId) {
      this.toastr.error('No sub-admin selected', 'Error');
      return;
    }

    this.loading = true;
    forkJoin({
      myPerms: this.userService.getMyPermissions(),
      subAdmin: this.userService.getUserById(this.preselectSubAdminId)
    }).subscribe({
      next: ({ myPerms, subAdmin }) => {
        
        this.loading = false;
        this.adminPermissions = myPerms.permissions || [];
        const admin = subAdmin?.data ?? subAdmin;
        if (admin?.id) this.onSelectSubAdmin(admin);
        else this.toastr.error('Sub-admin not found', 'Error');
      },
      error: (err) => {
        this.loading = false;
        console.error(err);
        this.toastr.error('Failed to load data', 'Error');
      }
    });
  });
}

  private fetchAdminPermissions(): void {
    this.userService.getMyPermissions().subscribe({
      next: (response) => {
        this.adminPermissions = response.permissions || [];
      },
      error: (err) => console.error('Error fetching admin permissions:', err)
    });
  }
 private fetchSubAdminById(id: string): void {
    this.loading = true;
    this.userService.getUserById(id).subscribe({
      next: (response: any) => {
        this.loading = false;
        const subAdmin = response?.data ?? response;
        if (subAdmin?.id) {
          this.onSelectSubAdmin(subAdmin);
        } else {
          this.toastr.error('Sub-admin not found', 'Error');
        }
      },
      error: (err) => {
        this.loading = false;
        console.error('Error fetching sub-admin:', err);
        this.toastr.error('Failed to fetch sub-admin details', 'Error');
      }
    });
  }

onSelectSubAdmin(subAdmin: any): void {
    if (!subAdmin) return;
    this.selectedSubAdmin = subAdmin;
    this.fetchPermissions();
  }


  private fetchPermissions(): void {
    if (!this.selectedSubAdmin?.id) {
      console.error('Error: Selected sub-admin or sub-admin ID is missing.');
      return;
    }
   
    this.permissionService.listAllPermissions(this.selectedSubAdmin.id).subscribe({
      next: (response) => {
        
        const savedPermissions = this.selectedSubAdmin.permissions || [];
        // const allPermissions: any[] = response || [];
        // const allPermissions: any[] = response?.permissions || [];
        const allPermissions: any[] = Array.isArray(response) ? response : response?.permissions || [];
        const filtered = allPermissions.filter((permission: any) =>
          this.adminPermissions.includes(permission.permission)
        );
        
        this.permissions = filtered.map((permission: any) => ({
          ...permission,
          isChecked: savedPermissions.includes(permission.permission)
        }));
        this.groupPermissionsByGroupName();
      },
      error: (err) => console.error('Error fetching permissions:', err)
    });
  }

  private groupPermissionsByGroupName(): void {
    const grouped = this.permissions.reduce((acc: any[], permission: any) => {
      const group = acc.find((g: { groupName: string }) => g.groupName === permission.groupName);
      if (group) {
        group.permissions.push(permission);
      } else {
        acc.push({ groupName: permission.groupName, permissions: [permission], isChecked: false });
      }
      return acc;
    }, []);
    grouped.forEach((group: any) => {
      group.isChecked = group.permissions.every((perm: any) => perm.isChecked);
    });
    this.groupedPermissions = grouped;
    this.buildTableSections();
  }

  savePermissions(): void {
    if (!this.selectedSubAdmin?.id) {
      console.error('Error: Selected sub-admin or sub-admin ID is missing.');
      return;
    }
    // const selectedPermissions = this.groupedPermissions.flatMap(group =>
    //   group.permissions
    //     .filter((p: any) => p.isChecked)
    //     .map((p: any) => p.permission)
    // );
    // Better:
const selectedPermissions = this.groupedPermissions.flatMap(group =>
  group.permissions
    .filter((p: any) => p.isChecked && !p.disabled)
    .map((p: any) => p.permission)
);
    
    this.userService.addSubAdminPermissions(this.selectedSubAdmin.id, selectedPermissions).subscribe({
      next: () => this.toastr.success('Permissions have been successfully updated!', 'Success'),
      error: (err) => {
        console.error('Error saving permissions:', err);
        this.toastr.error('Failed to update permissions. Please try again.', 'Error');
      }
    });
  }

  syncGroupedPermissions(): void {
    this.groupedPermissions.forEach(g => {
      g.isChecked = g.permissions.every((p: any) => p.isChecked);
    });
  }

  // NAYA: ab shared util call karta hai — apni khud ki getColumnKey()
  // duplicate nahi rakhi.
  private buildTableSections(): void {
    this.tableSections = buildTableSections(this.groupedPermissions as GroupedPermission[]);
  }

  goBack(): void {
    this.router.navigate(['/manage-users']);
  }

  onTopBarButton(action: string): void {
    action === 'save' ? this.savePermissions() : this.goBack();
  }
}