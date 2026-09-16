import { Component, OnInit, OnDestroy, HostListener } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, RouterModule } from "@angular/router";
import { HttpClientModule } from "@angular/common/http";
import { ToastrModule, ToastrService } from "ngx-toastr";

import { DocumentTypeService } from "../../../services/document-type.service";

import { StatusToggleComponent } from "../../../shared/status-toggle/status-toggle.component";
import { ThreeDotsButtonComponent } from "../../../shared/three-dots-button/three-dots-button.component";
import { PopupMenuComponent } from "../../../shared/popup-menu/popup-menu.component";
import { PopupMenuItem } from "../../../shared/popup-menu/popup-menu.model";

import {
  PaginationFooterComponent,
  PageChangeEvent,
} from "../../../shared/pagination-footer/pagination-footer.component";

@Component({
  selector: "app-document-type-list",
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

  templateUrl: "./document-type-list.component.html",
  styleUrl: "./document-type-list.component.css",
})
export class DocumentTypeListComponent implements OnInit, OnDestroy {
  token: string | null = localStorage.getItem("token");

  documentTypes: any[] = [];

  loading = false;

  isLoggingOut = false;

  search = "";

  totalItems = 0;

  pageSize = 10;

  currentPage = 1;

  searchTimeout: any;

  activeMenuId: any = null;

  menuPopupPosition: { top: number; left: number } | null = null;

  selectedDocumentType: any = null;

  canEnableDisable = true;

  constructor(
    private documentTypeService: DocumentTypeService,
    private router: Router,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.fetchDocumentTypes();
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

    if (this.canEnableDisable && this.selectedDocumentType) {
      if (this.selectedDocumentType.status === 0) {
        items.push({
          id: "enable",
          label: "Enable Document Type",
        });
      } else {
        items.push({
          id: "disable",
          label: "Disable Document Type",
          variant: "danger",
        });
      }
    }

    return items;
  }

  /**
   * Fetch Document Types
   */
  fetchDocumentTypes(): void {
    if (!this.token || this.isLoggingOut) {
      this.toastr.warning(
        "Session expired or not logged in. Redirecting to login...",
        "Warning",
      );

      this.router.navigate(["/login"]).then(() => window.location.reload());

      return;
    }

    this.loading = true;

    this.documentTypeService
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

          this.documentTypes = rawData;

          this.totalItems =
            response?.totalItems || this.documentTypes.length || 0;

          this.loading = false;
        },

        error: (err: any) => {
          console.error("Failed to fetch document types:", err);

          this.toastr.error(
            err?.error?.message || "Failed to fetch document types",
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

      this.fetchDocumentTypes();
    }, 400);
  }

  /**
   * Reset Search
   */
  resetFilter(): void {
    this.search = "";

    this.currentPage = 1;

    this.fetchDocumentTypes();
  }

  /**
   * Pagination
   */
  onPageChange(event: PageChangeEvent): void {
    this.currentPage = event.page;

    this.pageSize = event.pageSize;

    this.fetchDocumentTypes();
  }

  /**
   * Page Size
   */
  onPageSizeChange(event: Event): void {
    this.pageSize = Number((event.target as HTMLSelectElement).value);

    this.currentPage = 1;

    this.fetchDocumentTypes();
  }

  /**
   * Add Document Type
   */
  addDocumentType(): void {
    this.router.navigate(["/add-document-type"]);
  }

  /**
   * View Document Type
   */
  viewDocumentType(id: number | string): void {
    this.router.navigate(["/view-document-type", id], {
      queryParams: {
        viewMode: "true",
      },
    });
  }

  /**
   * Open Action Menu
   */
  openMenu(documentType: any, event: MouseEvent): void {
    event.stopPropagation();

    if (this.activeMenuId === documentType.id) {
      this.closeMenu();

      return;
    }

    this.selectedDocumentType = documentType;

    this.activeMenuId = documentType.id;

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

    this.selectedDocumentType = null;
  }

  /**
   * Action Menu Click
   */
  onMenuItemClick(item: PopupMenuItem): void {
    if (!this.selectedDocumentType) {
      return;
    }

    const id = this.selectedDocumentType.id;

    this.closeMenu();

    switch (item.id) {
      case "view":
        this.viewDocumentType(id);

        break;

      case "edit":
        this.router.navigate(["/edit-document-type", id]);

        break;

      case "disable":
        this.disableDocumentType(id).subscribe({
          next: () => {
            this.toastr.success("Document type disabled successfully");

            this.fetchDocumentTypes();
          },

          error: (err: any) => {
            this.toastr.error(
              err?.error?.message || "Failed to disable document type",
            );
          },
        });

        break;

      case "enable":
        this.enableDocumentType(id).subscribe({
          next: () => {
            this.toastr.success("Document type enabled successfully");

            this.fetchDocumentTypes();
          },

          error: (err: any) => {
            this.toastr.error(
              err?.error?.message || "Failed to enable document type",
            );
          },
        });

        break;
    }
  }

  /**
   * Disable Document Type
   */
  disableDocumentType(id: number | string) {
    return this.documentTypeService.delete(id);
  }

  /**
   * Enable Document Type
   */
  enableDocumentType(id: number | string) {
    return this.documentTypeService.enable(id);
  }

  /**
   * Status Toggle
   */
  onStatusToggle(documentType: any, checked: boolean): void {
    const previousStatus = documentType.status;

    documentType.status = checked ? 1 : 0;

    const apiCall = checked
      ? this.enableDocumentType(documentType.id)
      : this.disableDocumentType(documentType.id);

    apiCall.subscribe({
      next: () => {
        this.toastr.success(
          checked
            ? "Document type enabled successfully"
            : "Document type disabled successfully",
        );
      },

      error: (err: any) => {
        documentType.status = previousStatus;

        this.toastr.error(
          err?.error?.message || "Failed to update document type status",
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
