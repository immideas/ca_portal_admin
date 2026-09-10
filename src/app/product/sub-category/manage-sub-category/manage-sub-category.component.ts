
import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SubCategoryService } from '../../../services/subCategory.service';
import { CategoryService } from '../../../services/category.service';
import { ToastrService } from 'ngx-toastr';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../../confirm-dialog/confirm-dialog.component';
import { PopupMenuComponent } from '../../../shared/popup-menu/popup-menu.component';
import { ThreeDotsButtonComponent } from '../../../shared/three-dots-button/three-dots-button.component';
import { PopupMenuItem, PopupMenuConfig } from '../../../shared/popup-menu/popup-menu.model';

@Component({
  selector: 'app-manage-sub-category',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, PopupMenuComponent, ThreeDotsButtonComponent],
  templateUrl: './manage-sub-category.component.html',
  styleUrls: ['./manage-sub-category.component.css']
})
export class ManageSubCategoryComponent implements OnInit {
  Math = Math;
  subCategories: any[] = [];
  categories: any[] = [];
  searchSubCategory: string = '';
  showFilterPanel = false;
  filter = { categoryIds: [] as number[] };
appliedFilter = { categoryIds: [] as number[] };
filterApplied = false;
  openDropdown: string | null = null;

  activeKebab: number | null = null;
  currentPage: number = 1;
  pageSize: number = 10;
  totalItems: number = 0;
  searchTimeout: any;
  canManage = false;
  canAdd = false;
  canView = false;
  canDelete = false;
  canEdit = false;

  activePopup: { index: number; scRef: any; config: PopupMenuConfig } | null = null;

  constructor(
    private service: SubCategoryService,
    private categoryService: CategoryService,
    private router: Router,
    private toastr: ToastrService,
    private dialog: MatDialog,
  ) {
    const perms = (localStorage.getItem('permissions') || '').split(',');
    this.canManage = perms.includes('manage_subcategory');
    this.canAdd = perms.includes('add_subcategory');
    this.canView = perms.includes('view_subcategory');
    this.canDelete = perms.includes('delete_subcategory');
    this.canEdit = perms.includes('edit_subcategory');
  }

  @HostListener('document:click')
  onDocumentClick() {
    this.activePopup = null;
    this.openDropdown = null;
  }

  ngOnInit(): void {
    if (this.canManage || this.canView) {
      this.loadDropdowns();
      this.fetchSubCategories();
    } else {
      this.toastr.error('You do not have permission to view sub-categories.');
    }
  }

  openActionMenu(index: number, sc: any, event: MouseEvent) {
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
      index, scRef: sc,
      config: { title: 'Actions', items, showAddBtn: false, width, position: { top, left: rect.right - width } }
    };
  }

  onMenuItemClick(item: PopupMenuItem) {
    const sc = this.activePopup?.scRef;
    this.activePopup = null;
    if (!sc) return;
    if (item.id === 'view')   this.view(sc.id);
    if (item.id === 'delete') this.remove(sc.id);
  }

  closePopup() { this.activePopup = null; }

  toggleDropdown(key: string, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.openDropdown = this.openDropdown === key ? null : key;
  }

  getSelectedNameFor(key: string, sourceList: any[]): string {
    const ids: number[] = (this.filter as any)[key] || [];
    if (ids.length === 0) return '';
    const found = sourceList.find((s: any) => ids.includes(s.id));
    return found ? found.name : '';
  }

  getSelectedNamesFor(key: string, sourceList: any[]): string {
    const ids: number[] = (this.filter as any)[key] || [];
    if (ids.length === 0) return '';
    const names = sourceList.filter((s: any) => ids.includes(s.id)).map((s: any) => s.name);
    if (names.length > 2) return `${names[0]}, +${names.length - 1} more`;
    return names.join(', ');
  }

  selectedNamesFor(key: string, sourceList: any[]): any[] {
    const ids: number[] = (this.filter as any)[key] || [];
    return sourceList.filter((s: any) => ids.includes(s.id));
  }

  loadDropdowns() {
    this.categoryService.listCategories().subscribe({
      next: (res: any) => { this.categories = res?.data || []; }
    });
  }

  fetchSubCategories(page: number = 1) {
    this.currentPage = page;
    const payload = {
      search: this.searchSubCategory || '',
      categoryId: this.filter.categoryIds,
      page: this.currentPage,
      limit: this.pageSize
    };
    this.service.listSubCategories(payload).subscribe({
      next: (res: any) => {
        this.subCategories = res.data || [];
        this.totalItems = res.totalItems || 0;
      },
      error: () => this.toastr.error('Error loading sub-categories')
    });
  }

  onSearchChange() {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => this.applyFilter(1), 400);
  }

  applyFilter(page: number = 1) {
      this.appliedFilter = {
    categoryIds: [...this.filter.categoryIds]
  };

  this.filterApplied = true;
     this.fetchSubCategories(page); }

  onPageChange(newPage: number) {
    const maxPage = Math.ceil(this.totalItems / this.pageSize);
    if (newPage < 1 || newPage > maxPage || newPage === this.currentPage) return;
    this.applyFilter(newPage);
  }

 resetFilter() {

  this.filter = {
    categoryIds: []
  };

  this.appliedFilter = {
    categoryIds: []
  };

  this.filterApplied = false;
  this.searchSubCategory = '';
  this.openDropdown = null;

  this.applyFilter(1);
}

  toggleSelection(key: string, id: number) {
    const arr = (this.filter as any)[key];
    const idx = arr.indexOf(id);
    idx > -1 ? arr.splice(idx, 1) : arr.push(id);
  }
hasAppliedFilters(): boolean {
  return this.appliedFilter.categoryIds.length > 0;
}

getAppliedCategoryNames(): string {
  return this.categories
    .filter(c => this.appliedFilter.categoryIds.includes(c.id))
    .map(c => c.name)
    .join(', ');
}
  add() { this.router.navigate(['/add-sub-category']); }

  view(id: string) {
    this.router.navigate(['/sub-category-detail', id], { queryParams: { viewMode: true } });
  }

  remove(id: string) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Confirm Delete', message: 'Are you sure you want to delete this sub-category?', yesLabel: 'Delete', noLabel: 'Cancel' }
    });
    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result) {
        this.service.deleteSubCategory(id).subscribe({
          next: (res: any) => { this.toastr.success(res.message || 'Deleted successfully'); this.fetchSubCategories(); },
          error: (err) => this.toastr.error(err.error?.message || 'Failed to delete sub-category')
        });
      }
    });
  }
}
