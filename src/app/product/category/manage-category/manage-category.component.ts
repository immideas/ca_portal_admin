import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CategoryService } from '../../../services/category.service';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../../environments/environment';
import { ProjectService } from '../../../services/project.service';
import { ConfirmDialogComponent } from '../../../confirm-dialog/confirm-dialog.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PopupMenuComponent } from '../../../shared/popup-menu/popup-menu.component';
import { ThreeDotsButtonComponent } from '../../../shared/three-dots-button/three-dots-button.component';
import { PopupMenuItem, PopupMenuConfig } from '../../../shared/popup-menu/popup-menu.model';

@Component({
  selector: 'manage-category.component',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, PopupMenuComponent, ThreeDotsButtonComponent],
  templateUrl: './manage-category.component.html',
  styleUrls: ['./manage-category.component.css']
})
export class ManageCategoryComponent implements OnInit {
  Math = Math;
  projects: any[] = [];
  categories: any[] = [];
  environment = environment;
  searchTimeout: any;
appliedFilter = {
  projectIds: [] as number[]
};

filterApplied = false;
  searchCategory: string = '';
  showFilterPanel = false;
  filter = { projectIds: [] as number[] };

  openDropdown: string | null = null;

  currentPage: number = 1;
  pageSize: number = 10;
  totalItems: number = 0;

  canManage = false;
  canAdd = false;
  canView = false;
  canDelete = false;
  canEdit = false;

  activePopup: { index: number; catRef: any; config: PopupMenuConfig } | null = null;

  constructor(
    private service: CategoryService,
    private projectService: ProjectService,
    private router: Router,
    private toastr: ToastrService,
    private dialog: MatDialog
  ) {
    const perms = (localStorage.getItem('permissions') || '').split(',');
    this.canManage = perms.includes('manage_categories');
    this.canAdd = perms.includes('add_category');
    this.canView = perms.includes('view_category');
    this.canDelete = perms.includes('delete_category');
    this.canEdit = perms.includes('edit_category');
  }

  @HostListener('document:click')
  onDocumentClick() {
    this.activePopup = null;
    this.openDropdown = null;
  }

  ngOnInit(): void {
    if (this.canManage || this.canView) {
      this.loadProjects();
      this.fetchCategories();
    } else {
      this.toastr.error('You do not have permission to view categories.');
    }
  }

  openActionMenu(index: number, cat: any, event: MouseEvent) {
    event.stopPropagation();
    if (this.activePopup?.index === index) { this.activePopup = null; return; }

    const btn = event.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();
    const width = 180;
    const popupHeight = 120;
    const top = (window.innerHeight - rect.bottom < popupHeight && rect.top > window.innerHeight - rect.bottom)
      ? rect.top - popupHeight - 4
      : rect.bottom + 4;

    const items: PopupMenuItem[] = [];
    if (this.canView || this.canEdit) items.push({ id: 'view', label: 'View / Edit', icon: 'edit' });
    if (this.canDelete) items.push({ id: 'delete', label: 'Delete', icon: 'delete', variant: 'danger' });

    this.activePopup = {
      index, catRef: cat,
      config: { title: 'Actions', items, width, position: { top, left: rect.right - width } }
    };
  }

  onMenuItemClick(item: PopupMenuItem) {
    const cat = this.activePopup?.catRef;
    this.activePopup = null;
    if (!cat) return;
    if (item.id === 'view')   this.view(cat.id);
    if (item.id === 'delete') this.remove(cat.id);
  }

  closePopup() { this.activePopup = null; }

  toggleDropdown(key: string, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.openDropdown = this.openDropdown === key ? null : key;
  }

  getSelectedNamesFor(key: string, sourceList: any[]): string {
    const ids: number[] = (this.filter as any)[key] || [];
    if (ids.length === 0) return '';
    const names = sourceList.filter((s: any) => ids.includes(s.id)).map((s: any) => s.name);
    if (names.length > 2) return `${names[0]}, +${names.length - 1} more`;
    return names.join(', ');
  }

  loadProjects() {
    this.projectService.list().subscribe({
      next: (res: any) => { this.projects = res.data || []; },
      error: () => { this.projects = []; this.toastr.error('Failed to load projects'); }
    });
  }

  fetchCategories(page: number = 1) {
    this.currentPage = page;
    const payload = {
      search: this.searchCategory || '',
      projectId: this.filter.projectIds,
      page: this.currentPage,
      limit: this.pageSize
    };
    this.service.listCategories(payload).subscribe({
      next: (res: any) => {
        this.categories = res.data || [];
        this.totalItems = res.totalItems || 0;
      },
      error: () => this.toastr.error('Failed to load categories')
    });
  }

  applyFilter(page: number = 1) {
    this.appliedFilter = {
    projectIds: [...this.filter.projectIds]
  };

  this.filterApplied = true;
    this.fetchCategories(page); }

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
    this.filter = { projectIds: [] };
      this.appliedFilter = {
    projectIds: []
  };

  this.filterApplied = false;
    this.searchCategory = '';
    this.openDropdown = null;
    this.applyFilter(1);
  }

  toggleSelection(key: string, id: number) {
    const arr = (this.filter as any)[key];
    const idx = arr.indexOf(id);
    idx > -1 ? arr.splice(idx, 1) : arr.push(id);
  }
hasAppliedFilters(): boolean {
  return this.appliedFilter.projectIds.length > 0;
}

getAppliedProjectNames(): string {

  return this.projects
    .filter(p => this.appliedFilter.projectIds.includes(p.id))
    .map(p => p.name)
    .join(', ');
}
  add() { this.router.navigate(['/add-category']); }

  view(id: string) {
    this.router.navigate(['/category-detail', id], { queryParams: { viewMode: true } });
  }

  remove(id: string) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Confirm Delete', message: 'Are you sure you want to delete this category?', yesLabel: 'Delete', noLabel: 'Cancel' }
    });
    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result) {
        this.service.deleteCategory(id).subscribe({
          next: (res: any) => { this.toastr.success(res.message || 'Category deleted successfully'); this.fetchCategories(); },
          error: (err) => { this.toastr.error(err.error?.message || 'Failed to delete category'); }
        });
      }
    });
  }
}