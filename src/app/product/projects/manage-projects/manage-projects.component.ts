import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProjectService } from '../../../services/project.service';
import { ToastrService } from 'ngx-toastr';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../../confirm-dialog/confirm-dialog.component';
import { FormsModule } from '@angular/forms';
import { PopupMenuComponent } from '../../../shared/popup-menu/popup-menu.component';
import { ThreeDotsButtonComponent } from '../../../shared/three-dots-button/three-dots-button.component';
import { PopupMenuItem, PopupMenuConfig } from '../../../shared/popup-menu/popup-menu.model';
import { PlanAccessService } from '../../../services/plan-access.service';

@Component({
  selector: 'app-manage-projects',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, PopupMenuComponent, ThreeDotsButtonComponent],
  templateUrl: './manage-projects.component.html',
  styleUrls: ['./manage-projects.component.css']
})
export class ManageProjectsComponent implements OnInit {
  Math = Math;

  projects: any[] = [];
  selectedProject: any = null;
  showQrModal = false;
  readonly baseUrl = 'http://localhost:5000';
  searchTimeout: any;

  searchQuery: string = '';
  showFilterPanel = false;

  currentPage = 1;
  pageSize = 10;
  totalItems = 0;

  canManage = false;
  canAdd = false;
  canView = false;
  canDelete = false;
  canEdit = false;

  activePopup: { index: number; projectRef: any; config: PopupMenuConfig } | null = null;

  projectLimit: number | null = null;

  get limitReached(): boolean {
    return !this.planAccess.canCreateMore('projects', this.totalItems);
  }

  get limitLabel(): string {
    return this.projectLimit === null ? 'Unlimited' : `${this.totalItems} / ${this.projectLimit}`;
  }

  constructor(
    private service: ProjectService,
    private router: Router,
    private toastr: ToastrService,
    private dialog: MatDialog,
    private planAccess: PlanAccessService
  ) {
    const perms = (localStorage.getItem('permissions') || '').split(',');
    this.canManage = perms.includes('manage_project');
    this.canAdd = perms.includes('add_project');
    this.canView = perms.includes('view_project');
    this.canDelete = perms.includes('delete_project');
    this.canEdit = perms.includes('edit_project');
    this.projectLimit = this.planAccess.maxProjects;
  }

  @HostListener('document:click')
  onDocumentClick() {
    this.activePopup = null;
  }

  ngOnInit(): void {
    if (this.canManage || this.canView) {
      this.load();
    } else {
      this.toastr.error('You do not have permission to view projects.');
    }
  }

  openActionMenu(index: number, project: any, event: MouseEvent) {
    event.stopPropagation();

    if (this.activePopup?.index === index) {
      this.activePopup = null;
      return;
    }

    const btn = event.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();
    const width = 200;
    const popupHeight = 180;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const top = (spaceBelow < popupHeight && spaceAbove > spaceBelow)
      ? rect.top - popupHeight - 4
      : rect.bottom + 4;

    const items: PopupMenuItem[] = [];

   
if (
  project.accessType !== 'closed' &&
  project.openTicketsEnabled &&
  project.openTicketUrl
) {
  items.push({
    id: 'share',
    label: 'Share Link',
    icon: 'copy'
  });

  items.push({
    id: 'qr',
    label: 'View QR',
    icon: 'view'
  });
}
    if (this.canView || this.canEdit) {
      items.push({ id: 'view', label: 'View / Edit', icon: 'edit' });
    }

    if (project.accessType === 'closed') {
      items.push({ id: 'manageCustomer', label: 'Manage Customer', icon: 'view' });
      items.push({ id: 'addCustomer', label: 'Add Customer', icon: 'edit' });
    }

    this.activePopup = {
      index,
      projectRef: project,
      config: {
        title: 'Actions',
        items,
        width,
        position: { top, left: rect.right - width }
      }
    };
  }

  onMenuItemClick(item: PopupMenuItem) {
    const project = this.activePopup?.projectRef;
    this.activePopup = null;
    if (!project) return;

    if (item.id === 'share')          this.shareLink(project);
    if (item.id === 'qr')             this.openQrPopup(project);
    if (item.id === 'view')           this.view(project.id);
    if (item.id === 'manageCustomer') this.manageCustomer(project.id);
    if (item.id === 'addCustomer')    this.addCustomer(project.id);
  }

  closePopup() { this.activePopup = null; }

  load(page: number = 1) {
    this.currentPage = page;
    const payload = {
      search: this.searchQuery || '',
      page: this.currentPage,
      limit: this.pageSize
    };
    this.service.list(payload).subscribe({
      next: (res: any) => {
        this.projects = res.data || [];
        this.totalItems = res.totalItems || 0;
      },
      error: (err) => {
        this.toastr.error('Failed to load projects');
        console.error(err);
      }
    });
  }

  onSearchChange() {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.searchQuery = this.searchQuery.trim();
      this.load(1);
    }, 400);
  }

  applyFilter(page: number = 1) { this.load(page); }

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
    if (this.limitReached) {
      this.toastr.warning(`Your plan allows only ${this.projectLimit} projects. Upgrade your plan to add more.`, 'Limit Reached');
      return;
    }
    this.router.navigate(['/add-project']);
  }

  openQrPopup(project: any) {
     if (!project.openTicketsEnabled) {
    this.toastr.warning(
      'Your current plan does not include Open Tickets.'
    );
    return;
  }
    if (!project.openTicketUrl) {
      this.toastr.error('Open Ticket link not available');
      return;
    }
    this.selectedProject = project;
    this.showQrModal = true;
  }

  closeQrModal() { this.showQrModal = false; }

  copyLink() {
    if (!this.selectedProject?.openTicketUrl) return;
    navigator.clipboard.writeText(this.selectedProject.openTicketUrl).then(() => {
      this.toastr.success('Link copied to clipboard');
    });
  }

  shareLink(project: any) {
     if (!project.openTicketsEnabled) {
   this.toastr.warning(
     'Upgrade your plan to enable Open Tickets'
   );
   return;
 }
    const url = project?.openTicketUrl;
    if (!url) { this.toastr.error('Open ticket link not available'); return; }
    if (navigator.share) {
      navigator.share({ title: project.name, url }).catch(() => { });
    } else {
      window.open(url, '_blank');
    }
  }

  view(id: string) {
    this.router.navigate(['/project-detail', id], { queryParams: { viewMode: true } });
  }

  manageCustomer(projectId: string) {
    this.router.navigate(['/manage-customer'], { queryParams: { projectId } });
  }

  addCustomer(projectId: string) {
    this.router.navigate(['/add-customer'], { queryParams: { projectId } });
  }

  toggleStatus(project: any, event: MouseEvent) {
    event.stopPropagation();
    const actionText = project.status === 1 ? 'Deactivate' : 'Activate';
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: `Confirm ${actionText}`,
        message: `Are you sure you want to ${actionText.toLowerCase()} this project?`,
        yesLabel: actionText,
        noLabel: 'Cancel'
      }
    });
    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result) {
        this.service.toggleStatus(project.id).subscribe({
          next: (res: any) => {
            this.toastr.success(res.message || `Project ${actionText.toLowerCase()}d successfully`);
            this.load(this.currentPage);
          },
          error: (err) => {
            this.toastr.error(err.error?.message || `Failed to ${actionText.toLowerCase()} project`);
          }
        });
      }
    });
  }
}
