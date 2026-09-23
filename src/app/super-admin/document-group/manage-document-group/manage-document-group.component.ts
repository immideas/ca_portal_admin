import { Component, OnInit, OnDestroy, HostListener } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, RouterModule } from "@angular/router";
import { HttpClientModule } from "@angular/common/http";
import { ToastrModule, ToastrService } from "ngx-toastr";

import { DocumentGroupService } from "../../../services/document-group.service";

import { StatusToggleComponent } from "../../../shared/status-toggle/status-toggle.component";
import { ThreeDotsButtonComponent } from "../../../shared/three-dots-button/three-dots-button.component";
import { PopupMenuComponent } from "../../../shared/popup-menu/popup-menu.component";
import { PopupMenuItem } from "../../../shared/popup-menu/popup-menu.model";

import {
  PaginationFooterComponent,
  PageChangeEvent,
} from "../../../shared/pagination-footer/pagination-footer.component";

@Component({
  selector: "app-manage-document-group",
  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    HttpClientModule,
    ToastrModule,
    StatusToggleComponent,
    ThreeDotsButtonComponent,
    PopupMenuComponent,
    PaginationFooterComponent,
  ],

  templateUrl: "./manage-document-group.component.html",
  styleUrl: "./manage-document-group.component.css",
})
export class ManageDocumentGroupComponent implements OnInit, OnDestroy {
  token: string | null = localStorage.getItem("token");

  documentGroups: any[] = [];

  loading = false;

  isLoggingOut = false;

  search = "";

  totalItems = 0;

  pageSize = 10;

  currentPage = 1;

  searchTimeout: any;

  activeMenuId: any = null;

  menuPopupPosition: { top: number; left: number } | null = null;

  selectedDocumentGroup: any = null;

  canEnableDisable = true;

  constructor(
    private documentGroupService: DocumentGroupService,
    private router: Router,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.fetchDocumentGroups();
  }

  ngOnDestroy(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }

  /**
   * Close popup when Escape is pressed
   */
  @HostListener("document:keydown.escape")
  onEscape(): void {
    this.closeMenu();
  }

  /**
   * Action Menu
   */
  get actionItems(): PopupMenuItem[] {
    const items: PopupMenuItem[] = [
      {
        id: "view",
        label: "View",
      },

      {
        id: "edit",
        label: "Edit",
      },
    ];

    if (this.canEnableDisable && this.selectedDocumentGroup) {
      if (this.selectedDocumentGroup.status === 0) {
        items.push({
          id: "enable",
          label: "Enable Document Group",
        });
      } else {
        items.push({
          id: "disable",
          label: "Disable Document Group",
          variant: "danger",
        });
      }
    }

    return items;
  }

  /**
   * Fetch Document Groups
   */
  fetchDocumentGroups(): void {
    if (!this.token || this.isLoggingOut) {
      this.toastr.warning(
        "Session expired or not logged in. Redirecting to login...",
        "Warning",
      );

      this.router.navigate(["/login"]).then(() => window.location.reload());

      return;
    }

    this.loading = true;

    this.documentGroupService
      .list({
        search: this.search,
        page: this.currentPage,
        limit: this.pageSize,
      })
      .subscribe({
        next: (response: any) => {
          const rawData =
            response?.data && Array.isArray(response.data)
              ? response.data
              : Array.isArray(response)
                ? response
                : [];

          this.documentGroups = rawData;

          this.totalItems =
            response?.totalItems || this.documentGroups.length || 0;

          this.loading = false;
        },

        error: (err: any) => {
          console.error("Failed to fetch document groups:", err);

          this.toastr.error(
            err?.error?.message || "Failed to fetch document groups",
            "Error",
          );

          this.loading = false;
        },
      });
  }

  /**
   * Search
   */
  onSearchChange(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    this.searchTimeout = setTimeout(() => {
      this.currentPage = 1;

      this.fetchDocumentGroups();
    }, 400);
  }

  /**
   * Reset Search
   */
  resetFilter(): void {
    this.search = "";

    this.currentPage = 1;

    this.fetchDocumentGroups();
  }

  /**
   * Pagination
   */
  onPageChange(event: PageChangeEvent): void {
    this.currentPage = event.page;

    this.pageSize = event.pageSize;

    this.fetchDocumentGroups();
  }

  /**
   * Page Size
   */
  onPageSizeChange(event: Event): void {
    this.pageSize = Number((event.target as HTMLSelectElement).value);

    this.currentPage = 1;

    this.fetchDocumentGroups();
  }

  /**
   * Add Document Group
   */
  addDocumentGroup(): void {
    this.router.navigate(["/add-document-group"]);
  }

  /**
   * View Document Group
   */
  viewDocumentGroup(id: number | string): void {
    this.router.navigate(["/view-document-group", id], {
      queryParams: {
        viewMode: "true",
      },
    });
  }

  /**
   * Open Action Menu
   */
  openMenu(documentGroup: any, event: MouseEvent): void {
    event.stopPropagation();

    if (this.activeMenuId === documentGroup.id) {
      this.closeMenu();

      return;
    }

    this.selectedDocumentGroup = documentGroup;

    this.activeMenuId = documentGroup.id;

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();

    const menuWidth = 220;

    const menuHeight = 130;

    const spaceBelow = window.innerHeight - rect.bottom;

    const showAbove = spaceBelow < menuHeight;

    this.menuPopupPosition = {
      top: showAbove
        ? rect.top + window.scrollY - menuHeight
        : rect.bottom + window.scrollY,

      left: rect.right - menuWidth,
    };
  }

  /**
   * Close Action Menu
   */
  closeMenu(): void {
    this.menuPopupPosition = null;

    this.activeMenuId = null;

    this.selectedDocumentGroup = null;
  }

  /**
   * Action Menu Click
   */
  onMenuItemClick(item: PopupMenuItem): void {
    if (!this.selectedDocumentGroup) {
      return;
    }

    const id = this.selectedDocumentGroup.id;

    this.closeMenu();

    switch (item.id) {
      case "view":
        this.viewDocumentGroup(id);

        break;

      case "edit":
        this.router.navigate(["/edit-document-group", id]);

        break;

      case "disable":
        this.disableDocumentGroup(id).subscribe({
          next: () => {
            this.toastr.success("Document group disabled successfully");

            this.fetchDocumentGroups();
          },

          error: (err: any) => {
            this.toastr.error(
              err?.error?.message || "Failed to disable document group",
            );
          },
        });

        break;

      case "enable":
        this.enableDocumentGroup(id).subscribe({
          next: () => {
            this.toastr.success("Document group enabled successfully");

            this.fetchDocumentGroups();
          },

          error: (err: any) => {
            this.toastr.error(
              err?.error?.message || "Failed to enable document group",
            );
          },
        });

        break;
    }
  }

  /**
   * Disable Document Group
   */
  disableDocumentGroup(id: number | string) {
    return this.documentGroupService.delete(id);
  }

  /**
   * Enable Document Group
   */
  enableDocumentGroup(id: number | string) {
    return this.documentGroupService.enable(id);
  }

  /**
   * Status Toggle
   */
  onStatusToggle(documentGroup: any, checked: boolean): void {
    const previousStatus = documentGroup.status;

    documentGroup.status = checked ? 1 : 0;

    const apiCall = checked
      ? this.enableDocumentGroup(documentGroup.id)
      : this.disableDocumentGroup(documentGroup.id);

    apiCall.subscribe({
      next: () => {
        this.toastr.success(
          checked
            ? "Document group enabled successfully"
            : "Document group disabled successfully",
        );
      },

      error: (err: any) => {
        documentGroup.status = previousStatus;

        this.toastr.error(
          err?.error?.message || "Failed to update document group status",
        );
      },
    });
  }

  /**
   * Logout
   */
  logout(): void {
    this.isLoggingOut = true;

    localStorage.removeItem("token");

    this.router.navigate(["/login"]);
  }
}
