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

@Component({
  selector: 'app-manage-admin-permissions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    PermissionsTableComponent,
    PageTopBarComponent,
  ],
  templateUrl: './manage-admin-permissions.component.html',
  styleUrls: ['./manage-admin-permissions.component.css']
})
export class ManageAdminPermissionsComponent implements OnInit {
  admins: any[] = [];
  selectedAdmin: any = null;
  permissions: any[] = [];
  groupedPermissions: any[] = [];
  tableSections: TableSection[] = [];   

  private preselectAdminId: string | null = null;
  loading = false;

  constructor(
    private userService: UserService,
    private permissionService: PermissionService,
    private toastr: ToastrService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

 
 ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      this.preselectAdminId = params.get('adminId');
      if (this.preselectAdminId) {
        this.fetchAdminById(this.preselectAdminId);
      } else {
        this.toastr.error('No admin selected', 'Error');
      }
    });
  }

private fetchAdminById(id: string): void {
    this.loading = true;
    this.userService.getUserById(id).subscribe({
      next: (response: any) => {
        this.loading = false;
        
        const admin = response?.data ?? response;
        if (admin?.id) {
          this.onSelectAdmin(admin);
        } else {
          this.toastr.error('Admin not found', 'Error');
        }
      },
      error: (err) => {
        this.loading = false;
        console.error('Error fetching admin:', err);
        this.toastr.error('Failed to fetch admin details', 'Error');
      }
    });
  }
 
onSelectAdmin(admin: any): void {
    if (!admin) return;
    
    this.selectedAdmin = admin;
    this.fetchPermissions();
  }
  
 
private fetchPermissions(): void {

  if (!this.selectedAdmin?.id) {
    console.error('Error: Selected admin or admin ID is missing.');
    return;
  }

  
  this.permissionService.listAllPermissions(this.selectedAdmin.id).subscribe({

    next: (response: any) => {
      
      const savedPermissions = this.selectedAdmin.permissions || [];

      // const permissionList = Array.isArray(response)
      //   ? response
      //   : response?.data || [];
const permissionList = Array.isArray(response)
  ? response
  : response?.permissions || [];
      

      this.permissions = permissionList.map((permission: any) => ({
        ...permission,
        isChecked: savedPermissions.includes(permission.permission)
      }));

      this.groupPermissionsByGroupName();
    },

    error: (err) => {
      console.error('Error fetching permissions:', err);
    }

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
    if (!this.selectedAdmin?.id) {
      console.error('Error: Selected admin or admin ID is missing.');
      return;
    }
    const selectedPermissions = this.groupedPermissions.flatMap(group =>
      group.permissions
        // .filter((p: any) => p.isChecked)
            .filter((p: any) => p.isChecked && !p.disabled)

        .map((p: any) => p.permission)
    );
    const payload = {
      id: this.selectedAdmin.id,
      permissions: selectedPermissions
    };
    
    this.userService.addAdminPermissions(this.selectedAdmin.id, selectedPermissions).subscribe({
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
    this.router.navigate(['/manage-admins']);
  }

  onTopBarButton(action: string): void {
    action === 'save' ? this.savePermissions() : this.goBack();
  }
}