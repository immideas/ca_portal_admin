import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { PermissionService } from '../../services/permission.service';
import { PageTopBarComponent } from '../../includes/page-top-bar/page-top-bar.component';
import { PermissionsTableComponent } from '../../permissions/permissions-table/permissions-table.component';
import { TableRow, TableSection } from '../../permissions/grant-permissions/grant-permissions.component';
import { buildTableSections, GroupedPermission } from '../../permissions/permission-table.utils';

@Component({
  selector: 'app-manage-permissions',
  templateUrl: './manage-permissions.component.html',
  styleUrls: ['./manage-permissions.component.css'],
  standalone: true,
  imports: [CommonModule, PageTopBarComponent, PermissionsTableComponent],

})
export class ManagePermissionsComponent implements OnInit {
  tableSections: TableSection[] = [];
  dataLoaded = false;
  errorMessage: string | null = null;

  constructor(
    private permissionService: PermissionService,
    private router: Router,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.fetchPermissions();
  }

  fetchPermissions(): void {
    this.dataLoaded = false;
    
    this.permissionService.listAllPermissions().subscribe(
      (response: any) => {
        
        const permList: any[] = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response?.permissions)
          ? response.permissions
          : [];
       
        this.tableSections = this.buildSections(permList);
        this.dataLoaded = true;
      },
      (error: any) => {
        
        this.errorMessage = error.message || 'Failed to fetch permissions';
        this.dataLoaded = true;
      }
    );
  }

  // NAYA: ab shared buildTableSections() util call karta hai. Yahan permissions
  // pehle group_name se GroupedPermission[] shape mein group hoti hain,
  // phir shared util ko de di jaati hain (getColumnKey duplicate nahi rakhi).
  private buildSections(permissions: any[]): TableSection[] {
    const groupMap: Record<string, any[]> = {};
    permissions.forEach((p: any) => {
      const key: string = p.groupName || p.group_name || 'General';
      if (!groupMap[key]) groupMap[key] = [];
      groupMap[key].push(p);
    });

    const groupedPermissions: GroupedPermission[] = Object.entries(groupMap).map(
      ([groupName, perms]) => ({
        groupName,
        permissions: perms,
        isChecked: false,
      })
    );

    return buildTableSections(groupedPermissions);
  }

  onTopBarButton(action: string): void {
    if (action === 'add') this.router.navigate(['/add-permission']);
  }

  onViewPermClick(perm: any): void {
    this.router.navigate(['/add-permission', perm.id], { queryParams: { viewMode: true } });
  }
  cancel(): void {
    this.router.navigate(['/super-admin']);
  }
  goBack(): void {
    this.router.navigate(['/super-admin']);
  }
}