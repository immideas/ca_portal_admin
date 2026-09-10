import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { WhatsappTemplatesService } from '../../../services/whatsapp-templates.service';
import { ConfirmDialogComponent } from '../../../confirm-dialog/confirm-dialog.component';
import { PopupMenuComponent } from '../../../shared/popup-menu/popup-menu.component';
import { ThreeDotsButtonComponent } from '../../../shared/three-dots-button/three-dots-button.component';
import { PopupMenuItem, PopupMenuConfig } from '../../../shared/popup-menu/popup-menu.model';

@Component({
  selector: 'app-manage-whatsapp-template',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, PopupMenuComponent, ThreeDotsButtonComponent],
  templateUrl: './manage-whatsapp-template.component.html',
  styleUrl: './manage-whatsapp-template.component.css'
})
export class ManageWhatsappTemplateComponent implements OnInit {
  Math = Math;
  templates: any[] = [];
  searchTimeout: any;

  searchQuery: string = '';

  currentPage: number = 1;
  pageSize: number = 10;
  totalItems: number = 0;

  canManage = false; canAdd = false; canView = false; canDelete = false; canEdit = false;

  activePopup: { index: number; tRef: any; config: PopupMenuConfig } | null = null;

  constructor(
    private service: WhatsappTemplatesService,
    private router: Router,
    private toastr: ToastrService,
    private dialog: MatDialog
  ) {
      const roleCode = localStorage.getItem('roleCode');
    const isSuperAdmin = roleCode === 'super_admin';
    const perms = (localStorage.getItem('permissions') || '').split(',');
    this.canManage =  isSuperAdmin || perms.includes('manage_whatsapp_template');
    this.canAdd = isSuperAdmin || perms.includes('add_whatsapp_template');
    this.canView = isSuperAdmin ||perms.includes('view_whatsapp_template');
    this.canDelete = isSuperAdmin ||perms.includes('delete_whatsapp_template');
    this.canEdit =isSuperAdmin || perms.includes('edit_whatsapp_template');
  }

  @HostListener('document:click')
  onDocumentClick() {
    this.activePopup = null;
  }

  ngOnInit(): void {
    if (this.canManage || this.canView) {
      this.load();
    } else {
      this.toastr.error('You do not have permission to view WhatsApp templates.');
    }
  }

  openActionMenu(index: number, t: any, event: MouseEvent) {
    event.stopPropagation();

    if (this.activePopup?.index === index) {
      this.activePopup = null;
      return;
    }

    const btn = event.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();
    const width = 180;
    const popupHeight = 120;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const top = (spaceBelow < popupHeight && spaceAbove > spaceBelow)
      ? rect.top - popupHeight - 4
      : rect.bottom + 4;

    const items: PopupMenuItem[] = [];
    if (this.canView || this.canEdit) {
      items.push({ id: 'view', label: 'View / Edit', icon: 'edit' });
    }
    if (this.canDelete) {
      items.push({ id: 'delete', label: 'Delete', icon: 'delete', variant: 'danger' });
    }

    this.activePopup = {
      index,
      tRef: t,
      config: { title: 'Actions', items, width, position: { top, left: rect.right - width } }
    };
  }

  onMenuItemClick(item: PopupMenuItem) {
    const t = this.activePopup?.tRef;
    this.activePopup = null;
    if (!t) return;
    if (item.id === 'view')   this.view(t.id);
    if (item.id === 'delete') this.remove(t.id);
  }

  closePopup() { this.activePopup = null; }

  load(page: number = 1) {
    this.currentPage = page;

    
    const payload = {
      start: (this.currentPage - 1) * this.pageSize,
      length: this.pageSize,
      search: { value: this.searchQuery || '' }
    };

    this.service.getAllWhatsappTemplates(payload).subscribe({
      next: (res: any) => {
        this.templates = res?.data?.details ?? res?.data ?? [];
        this.totalItems = res?.data?.total ?? 0;
      },
      error: () => this.toastr.error('Templates loading error')
    });
  }

  applyFilter(page: number = 1) {
    this.load(page);
  }

  onSearchChange() {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => this.applyFilter(1), 400);
  }

  onPageChange(newPage: number) {
    const maxPage = Math.ceil(this.totalItems / this.pageSize);
    if (newPage < 1 || newPage > maxPage || newPage === this.currentPage) return;
    this.applyFilter(newPage);
  }

  resetFilter() {
    this.searchQuery = '';
    this.applyFilter(1);
  }

  add() {
    this.router.navigate(['/add-whatsapp-template']);
  }

  view(id: string) {
    this.router.navigate(['/whatsapp-template-detail', id], { queryParams: { viewMode: true } });
  }

  remove(id: any) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Confirm Delete',
        message: 'Are you sure you want to delete this template?',
        yesLabel: 'Delete',
        noLabel: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.service.deleteWhatsappTemplate(id).subscribe({
          next: (res: any) => {
            this.toastr.success(res.message || 'Template deleted successfully');
            this.load();
          },
          error: () => this.toastr.error('Delete failed')
        });
      }
    });
  }
}