import { Component, OnInit, HostListener } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../confirm-dialog/confirm-dialog.component';
import { CommonModule } from '@angular/common';
import { RoleService } from '../../services/role.service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { FormsModule } from '@angular/forms';
import { PopupMenuComponent } from '../../shared/popup-menu/popup-menu.component';
import { ThreeDotsButtonComponent } from '../../shared/three-dots-button/three-dots-button.component';
import { PopupMenuItem, PopupMenuConfig } from '../../shared/popup-menu/popup-menu.model';

@Component({
  selector: 'app-manage-roles',
  templateUrl: './manage-roles.component.html',
  styleUrls: ['./manage-roles.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, PopupMenuComponent, ThreeDotsButtonComponent]
})
export class ManageRolesComponent implements OnInit {
  Math = Math;
  roles: any[] = [];
  token: string | null = localStorage.getItem('token');
  isLoggingOut = false;
  searchTimeout: any;

  search: string = '';
  totalItems: number = 0;
  pageSize: number = 10;
  currentPage: number = 1;

  activePopup: { index: number; roleRef: any; config: PopupMenuConfig } | null = null;

canManage = false;   
canAdd = false;      
canView = false;
canEdit = false;
canDelete = false;
  constructor(
    private roleService: RoleService,
    private router: Router,
    private toastr: ToastrService,
    private dialog: MatDialog
  ) {
const perms = (localStorage.getItem('permissions') || '').split(',');
this.canManage = perms.includes('manage_role');
this.canAdd = perms.includes('add_role');
this.canView = perms.includes('manage_role') || perms.includes('view_role');
this.canEdit = perms.includes('manage_role') || perms.includes('edit_role');
this.canDelete = perms.includes('manage_role') || perms.includes('delete_role');   // 👈 NAYA
  }

 
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (
      target.closest('app-popup-menu') ||
      target.closest('app-three-dots-button')
    ) return;
    this.activePopup = null;
  }

  ngOnInit(): void {
    this.fetchRoles();
  }

  fetchRoles(page: number = 1): void {
    if (!this.token || this.isLoggingOut) {
      this.router.navigate(['/login']).then(() => window.location.reload());
      return;
    }
    this.currentPage = page;
    const payload = { search: this.search || '', page: this.currentPage, limit: this.pageSize };
    this.roleService.listAllRoles(payload).subscribe({
      next: (res: any) => {
        this.roles = res?.data || [];
        this.totalItems = res?.totalItems || 0;
      },
      error: () => this.toastr.error('Failed to fetch roles')
    });
  }

  applyFilter(page: number = 1) { this.fetchRoles(page); }

  onSearchChange() {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => this.applyFilter(1), 400);
  }

  resetFilter() {
    this.search = '';
    this.applyFilter(1);
  }

  onPageChange(page: number) {
    const max = Math.ceil(this.totalItems / this.pageSize);
    if (page < 1 || page > max || page === this.currentPage) return;
    this.applyFilter(page);
  }

  openActionMenu(index: number, role: any, event: MouseEvent) {
    event.stopPropagation();

    if (this.activePopup?.index === index) {
      this.activePopup = null;
      return;
    }

    const btn = event.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();
    const width = 200;
    const popupHeight = 115;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const top = (spaceBelow < popupHeight && spaceAbove > spaceBelow)
      ? rect.top - popupHeight - 4
      : rect.bottom + 4;

    // const items: PopupMenuItem[] = [
    //   { id: 'edit',        label: 'Edit' },
    //   { id: 'permissions', label: 'Permissions' },
    //   { id: 'delete',      label: 'Delete Role', variant: 'danger' },
    // ];
const items: PopupMenuItem[] = [];
  if (this.canEdit) items.push({ id: 'edit', label: 'Edit' });
  if (this.canEdit) items.push({ id: 'permissions', label: 'Permissions' });   // 👈 gated

  if (this.canDelete) items.push({ id: 'delete', label: 'Delete Role', variant: 'danger' });
 
    this.activePopup = {
      index,
      roleRef: role,
      config: {
        title: 'Actions',
        items,
        width,
        position: { top, left: rect.right - width }
      }
    };
  }

  onMenuItemClick(item: PopupMenuItem) {
    const role = this.activePopup?.roleRef;
    this.activePopup = null;
    if (!role) return;

    if (item.id === 'edit')        this.navigateToViewRole(role.id);
    if (item.id === 'permissions') this.navigateToManagePermissions(role.id);
    if (item.id === 'delete')      this.confirmDeleteRole(role.id);
  }

  closePopup() { this.activePopup = null; }

  navigateToAddRole() { this.router.navigate(['/add-roles']); }

  navigateToViewRole(roleId: string) {
    this.router.navigate(['/add-roles', roleId], { queryParams: { viewMode: true } });
  }

  navigateToManagePermissions(roleId: string) {
    this.router.navigate(['/manage-default-permissions'], { queryParams: { roleId } });
  }

  confirmDeleteRole(id: string): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Confirm Delete',
        message: 'Are you sure you want to delete this role?',
        yesLabel: 'Yes',
        noLabel: 'No'
      }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.deleteRole(id);
    });
  }

  deleteRole(id: string): void {
    this.roleService.deleteRole(id).subscribe({
      next: () => {
        this.toastr.success('Role deleted successfully');
        this.fetchRoles(this.currentPage);
      },
      error: () => this.toastr.error('Failed to delete role')
    });
  }
}