import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { ThreeDotsButtonComponent } from '../../../shared/three-dots-button/three-dots-button.component';
import { PopupMenuComponent } from '../../../shared/popup-menu/popup-menu.component';
import { SmtpConfigService, SmtpConfig } from '../../../services/smtp-config.service';

@Component({
  selector: 'app-manage-smtp-config',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    HttpClientModule, 
    ThreeDotsButtonComponent, 
    PopupMenuComponent
  ],
  templateUrl: './manage-smtp-config.component.html',
  styleUrls: ['./manage-smtp-config.component.css']
})
export class ManageSmtpConfigComponent implements OnInit {
  smtpList: SmtpConfig[] = [];
  allSmtpList: SmtpConfig[] = [];
  search: string = '';
  isLoading: boolean = false;

  currentPage: number = 1;
  pageSize: number = 10;
  totalItems: number = 0;
  Math = Math;

  activePopup: { index: number; item: SmtpConfig; config: any } | null = null;

  constructor(
    private smtpConfigService: SmtpConfigService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.fetchSmtpConfigs();
  }

 fetchSmtpConfigs(): void {
  this.isLoading = true;
  const isSuperAdmin = localStorage.getItem('roleCode') === 'super_admin';

  if (isSuperAdmin) {
    this.smtpConfigService.getGlobalSmtpConfig().subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.allSmtpList = res.data ? [res.data] : [];
        this.applyFilterAndPagination();
      },
      error: (err: any) => {
        this.isLoading = false;
        this.allSmtpList = [];
        this.applyFilterAndPagination();
      }
    });
    return;
  }
}

  onSearchChange(): void {
    this.currentPage = 1;
    this.applyFilterAndPagination();
  }

  resetFilter(): void {
    this.search = '';
    this.currentPage = 1;
    this.applyFilterAndPagination();
  }

  applyFilterAndPagination(): void {
    const term = this.search.toLowerCase().trim();
    const filtered = this.allSmtpList.filter(item =>
      item.host?.toLowerCase().includes(term) ||
      item.authUser?.toLowerCase().includes(term) ||
      (item.project?.name && item.project.name.toLowerCase().includes(term))
    );

    this.totalItems = filtered.length;
    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.smtpList = filtered.slice(startIndex, startIndex + this.pageSize);
  }

  onPageChange(page: number): void {
    if (page < 1 || page > Math.ceil(this.totalItems / this.pageSize)) return;
    this.currentPage = page;
    this.applyFilterAndPagination();
  }

add(): void {
  const isSuperAdmin = localStorage.getItem('role') === 'SUPER_ADMIN';
  if (isSuperAdmin && this.allSmtpList.length > 0) {
    this.edit(this.allSmtpList[0]);
    return;
  }
  this.router.navigate(['/add-smtp-config']);
}
  view(item: SmtpConfig): void {
    this.router.navigate(['/add-smtp-config', item.id], { queryParams: { mode: 'view' } });
  }

  edit(item: SmtpConfig): void {
    this.router.navigate(['/add-smtp-config', item.id], { queryParams: { mode: 'edit' } });
  }

  delete(item: SmtpConfig): void {
    if (confirm('Are you sure you want to delete this SMTP configuration?')) {
      this.smtpConfigService.delete(item.id!).subscribe({
        next: () => this.fetchSmtpConfigs(),
        error: (err: any) => alert(err.error?.message || 'Failed to delete SMTP config')
      });
    }
  }

  openActionMenu(index: number, item: SmtpConfig, event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();

    this.activePopup = {
      index,
      item,
      config: {
        title: 'Actions',
        width: 160,
        position: {
          top: `${rect.bottom + window.scrollY}px`,
          left: `${rect.left + window.scrollX - 100}px`
        },
        items: [
          { label: 'View', action: 'view', icon: 'bi-eye' },
          { label: 'Edit', action: 'edit', icon: 'bi-pencil' },
          { label: 'Delete', action: 'delete', icon: 'bi-trash', danger: true }
        ]
      }
    };
  }

  closePopup(): void {
    this.activePopup = null;
  }

  onMenuItemClick(event: { action: string }): void {
    if (!this.activePopup) return;
    const item = this.activePopup.item;
    this.closePopup();

    if (event.action === 'view') {
      this.view(item);
    } else if (event.action === 'edit') {
      this.edit(item);
    } else if (event.action === 'delete') {
      this.delete(item);
    }
  }
}