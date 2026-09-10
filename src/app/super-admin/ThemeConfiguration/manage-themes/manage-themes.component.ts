import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import {
  ThemeConfigurationService,
  ThemeConfig
} from '../../../services/theme-configuration.service';
import { AuthService } from '../../../auth.service';

import { ConfirmDialogComponent } from '../../../confirm-dialog/confirm-dialog.component';
import { PopupMenuComponent } from '../../../shared/popup-menu/popup-menu.component';
import { ThreeDotsButtonComponent } from '../../../shared/three-dots-button/three-dots-button.component';
import { StatusToggleComponent } from '../../../shared/status-toggle/status-toggle.component';

import {
  PopupMenuItem,
  PopupMenuConfig
} from '../../../shared/popup-menu/popup-menu.model';

@Component({
  selector: 'app-manage-themes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    PopupMenuComponent,
    ThreeDotsButtonComponent,
    StatusToggleComponent   
  ],
  templateUrl: './manage-themes.component.html',
  styleUrls: ['./manage-themes.component.scss']
})
export class ManageThemesComponent implements OnInit {

  themes: ThemeConfig[] = [];

  search = '';
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;

  Math = Math;

  isSuperAdmin =
    (localStorage.getItem('roleCode') || '') === 'super_admin';

  canManage = false;
  canView = false;
  canAdd = false;
  canEdit = false;
  canDelete = false;

  myTheme: ThemeConfig | null = null;

  activePopup: {
    index: number;
    theme: ThemeConfig;
    config: PopupMenuConfig;
  } | null = null;

  constructor(
    private themeService: ThemeConfigurationService,
    private router: Router,
    private toastr: ToastrService,
    private dialog: MatDialog,
    private authService: AuthService // 👈 NEW
  ) {
    const perms = (localStorage.getItem('permissions') || '')
      .split(',')
      .map(permission => permission.trim());

    this.canManage = this.isSuperAdmin || perms.includes('manage_themes');
    this.canView   = this.isSuperAdmin || perms.includes('view_theme');
    this.canAdd    = this.isSuperAdmin || perms.includes('add_theme');
    this.canEdit   = this.isSuperAdmin || perms.includes('edit_theme');
    this.canDelete = this.isSuperAdmin || perms.includes('delete_theme');
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.activePopup = null;
  }

  ngOnInit(): void {
    if (!this.canManage && !this.canView) {
      this.toastr.error('You do not have permission to view themes.');
      return;
    }

    this.loadThemes();

    if (!this.isSuperAdmin) {
      this.fetchMyTheme();
    }
  }

  fetchMyTheme(): void {
    this.themeService.getMyTheme().subscribe({
      next: (res: any) => { this.myTheme = res?.data || null; },
      error: (err: any) => { console.error('Error fetching user theme:', err); }
    });
  }

  loadThemes(): void {
    const payload = {
      page: this.currentPage,
      limit: this.pageSize,
      search: this.search.trim(),
    };

    this.themeService.listAllThemes(payload).subscribe({
      next: (res: any) => {
        this.themes = res?.data || [];
        this.totalItems = res?.totalItems || 0;
      },
      error: (err: any) => {
        this.toastr.error(err?.error?.message || 'Failed to fetch theme configurations.');
      }
    });
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.loadThemes();
  }

  resetFilter(): void {
    this.search = '';
    this.currentPage = 1;
    this.loadThemes();
  }

  navigateToAddTheme(): void {
    if (!this.canAdd) {
      this.toastr.error('You do not have permission to add themes.');
      return;
    }

    if (!this.isSuperAdmin && this.myTheme) {
      this.toastr.info('You have already created a theme. Redirecting to edit mode.');
      this.router.navigate(['/add-theme', this.myTheme.id]);
      return;
    }

    this.router.navigate(['/add-theme']);
  }

  navigateToViewTheme(id?: number): void {
    if (!id) return;

    if (!this.canView) {
      this.toastr.error('You do not have permission to view themes.');
      return;
    }

    this.router.navigate(['/add-theme', id], { queryParams: { mode: 'view' } });
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadThemes();
  }

  // 👇 NEW — table ke andar direct toggle click
  onStatusToggle(theme: ThemeConfig): void {
    this.toggleStatus(theme.id);
  }

  // 👇 NEW — Apply button click
  applyTheme(theme: ThemeConfig): void {
    if (!theme.id) return;

    if (theme.status !== 1) {
      this.toastr.error('Only active themes can be applied.');
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Apply Theme',
        message: `Apply "${theme.theme_name}" as your theme?`,
        yesLabel: 'Apply',
        noLabel: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (!result) return;

      this.themeService.applyTheme(theme.id!).subscribe({
        next: (res: any) => {
          // this.toastr.success(res?.message || 'Theme applied successfully.');

          this.authService.setTheme(theme);
        },
        error: (err: any) => {
          this.toastr.error(err?.error?.message || 'Failed to apply theme.');
        }
      });
    });
  }

  openActionMenu(index: number, theme: ThemeConfig, event: MouseEvent): void {
    event.stopPropagation();

    if (this.activePopup?.index === index) {
      this.activePopup = null;
      return;
    }

    const btn = event.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();

    const width = 200;
    const popupHeight = 160;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    const top =
      spaceBelow < popupHeight && spaceAbove > spaceBelow
        ? rect.top - popupHeight - 4
        : rect.bottom + 4;

    const items: PopupMenuItem[] = [];

    if (this.canView) {
      items.push({ id: 'view', label: 'View', icon: 'view' });
    }

    if (this.canEdit) {
      items.push({ id: 'edit', label: 'Edit', icon: 'edit' });
    }

    // Apply — sirf active theme ke liye, three-dots menu ke andar
    if (theme.status === 1) {
      items.push({ id: 'apply', label: 'Apply', icon: 'check2-circle' });
    }

    // Toggle removed from menu — status ab table mein directly toggle ho raha hai

    if (this.canDelete && this.isSuperAdmin) {
      items.push({ id: 'delete', label: 'Delete', icon: 'delete', variant: 'danger' });
    }

    this.activePopup = {
      index,
      theme,
      config: {
        title: 'Actions',
        items,
        width,
        position: { top, left: rect.right - width }
      }
    };
  }

  onMenuItemClick(item: PopupMenuItem): void {
    const theme = this.activePopup?.theme;
    this.closePopup();

    if (!theme) return;

    switch (item.id) {
      case 'view':
        this.navigateToViewTheme(theme.id);
        break;

      case 'edit':
        if (theme.id) {
          this.router.navigate(['/add-theme', theme.id]);
        }
        break;

      case 'apply':
        this.applyTheme(theme);
        break;

      case 'delete':
        this.deleteTheme(theme.id);
        break;
    }
  }

  closePopup(): void {
    this.activePopup = null;
  }

  toggleStatus(id?: number): void {
    if (!id) return;

    this.themeService.toggleThemeStatus(id).subscribe({
      next: (res: any) => {
        this.toastr.success(res?.message || 'Theme status updated successfully.');
        this.loadThemes();
      },
      error: (err: any) => {
        this.toastr.error(err?.error?.message || 'Error updating status.');
      }
    });
  }

  deleteTheme(id?: number): void {
    if (!id) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Confirm Delete',
        message: 'Are you sure you want to delete this theme?',
        yesLabel: 'Delete',
        noLabel: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (!result) return;

      this.themeService.deleteTheme(id).subscribe({
        next: (res: any) => {
          this.toastr.success(res?.message || 'Theme deleted successfully.');
          this.loadThemes();

          if (!this.isSuperAdmin) {
            this.myTheme = null;
          }
        },
        error: (err: any) => {
          this.toastr.error(err?.error?.message || 'Error deleting theme.');
        }
      });
    });
  }
}
