import { Component, OnInit, OnDestroy, HostListener } from "@angular/core";

import { FormsModule } from "@angular/forms";
import { HttpClientModule } from "@angular/common/http";
import { Router, RouterModule } from "@angular/router";
import { CommonModule } from "@angular/common";

import { ToastrService, ToastrModule } from "ngx-toastr";
import { MatDialog, MatDialogModule } from "@angular/material/dialog";

import { ConfirmDialogComponent } from "../../../confirm-dialog/confirm-dialog.component";

import { ThreeDotsButtonComponent } from "../../../shared/three-dots-button/three-dots-button.component";
import { PopupMenuComponent } from "../../../shared/popup-menu/popup-menu.component";
import { PopupMenuItem } from "../../../shared/popup-menu/popup-menu.model";

import {
  PaginationFooterComponent,
  PageChangeEvent,
} from "../../../shared/pagination-footer/pagination-footer.component";

import { StatusToggleComponent } from "../../../shared/status-toggle/status-toggle.component";

import { NgxUiLoaderModule, NgxUiLoaderService } from "ngx-ui-loader";

import { DocumentService } from "../../../services/document.service";

@Component({
  selector: "app-document-list",

  templateUrl: "./document-list.component.html",

  styleUrls: ["./document-list.component.css"],

  standalone: true,

  imports: [
    CommonModule,
    HttpClientModule,
    RouterModule,
    FormsModule,
    ToastrModule,
    MatDialogModule,
    NgxUiLoaderModule,
    ThreeDotsButtonComponent,
    PopupMenuComponent,
    PaginationFooterComponent,
    StatusToggleComponent,
  ],
})
export class DocumentListComponent implements OnInit, OnDestroy {
  // =========================================================
  // VARIABLES
  // =========================================================

  token: string | null = localStorage.getItem("token");

  documents: any[] = [];

  filteredDocuments: any[] = [];

  loading = false;

  isLoggingOut = false;

  search = "";

  totalItems = 0;

  pageSize = 10;

  currentPage = 1;

  searchTimeout: any = null;

  activeMenuId: number | string | null = null;

  menuPopupPosition: { top: number; left: number } | null = null;

  selectedDocument: any = null;

  // =========================================================
  // CONSTRUCTOR
  // =========================================================

  constructor(
    private router: Router,

    private toastr: ToastrService,

    private dialog: MatDialog,

    private documentService: DocumentService,

    private ngxLoader: NgxUiLoaderService,
  ) {}

  // =========================================================
  // LIFECYCLE
  // =========================================================

  ngOnInit(): void {
    this.fetchDocuments();
  }

  ngOnDestroy(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);

      this.searchTimeout = null;
    }
  }

  // =========================================================
  // ESCAPE KEY
  // =========================================================

  @HostListener("document:keydown.escape")
  onEscape(): void {
    this.closeMenu();
  }

  // =========================================================
  // POPUP MENU ITEMS
  // =========================================================

  get actionItems(): PopupMenuItem[] {
    const items: PopupMenuItem[] = [];

    // ---------------------------------------------------------
    // VIEW
    // ---------------------------------------------------------

    items.push({
      id: "view",
      label: "View",
    });

    // ---------------------------------------------------------
    // EDIT
    // ---------------------------------------------------------

    items.push({
      id: "edit",
      label: "Edit",
    });

    // ---------------------------------------------------------
    // ENABLE / DISABLE
    // ---------------------------------------------------------

    if (this.selectedDocument) {
      if (this.selectedDocument.status === 0) {
        items.push({
          id: "enable",
          label: "Enable Document",
        });
      } else {
        items.push({
          id: "disable",
          label: "Disable Document",
          variant: "danger",
        });
      }
    }

    return items;
  }

  // =========================================================
  // FETCH DOCUMENTS
  // =========================================================

  fetchDocuments(): void {
    if (!this.token || this.isLoggingOut) {
      this.toastr.warning(
        "Session expired or not logged in. Redirecting to login...",
        "Warning",
      );

      this.router.navigate(["/login"]);

      return;
    }

    this.loading = true;

    const payload = {
      search: this.search,

      page: this.currentPage,

      limit: this.pageSize,
    };

    this.documentService.listAllDocuments(payload).subscribe({
      // -----------------------------------------------------
      // SUCCESS
      // -----------------------------------------------------

      next: (response: any) => {
        console.log("Documents Response:", response);

        const rawData =
          response?.data && Array.isArray(response.data)
            ? response.data
            : Array.isArray(response)
              ? response
              : [];

        this.documents = rawData;

        this.filteredDocuments = rawData;

        this.totalItems =
          response?.totalItems ?? response?.total ?? rawData.length;

        this.loading = false;
      },

      // -----------------------------------------------------
      // ERROR
      // -----------------------------------------------------

      error: (error: any) => {
        this.loading = false;

        console.error("Error fetching documents:", error);

        // JWT expired

        if (error.status === 400 && error.error?.error === "jwt expired") {
          this.toastr.error("Session expired. Please log in again.");

          localStorage.removeItem("token");

          this.router.navigate(["/login"]);

          return;
        }

        // Unauthorized

        if (error.status === 401) {
          this.toastr.error("Unauthorized access. Please log in again.");

          localStorage.removeItem("token");

          this.router.navigate(["/login"]).then(() => {
            window.location.reload();
          });

          return;
        }

        // Other errors

        this.toastr.error(
          error?.error?.message || "Failed to fetch documents",

          "Error",
        );
      },
    });
  }

  // =========================================================
  // SEARCH
  // =========================================================

  onSearchChange(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    this.searchTimeout = setTimeout(() => {
      this.currentPage = 1;

      this.fetchDocuments();
    }, 400);
  }

  // =========================================================
  // RESET SEARCH
  // =========================================================

  resetFilter(): void {
    this.search = "";

    this.currentPage = 1;

    this.fetchDocuments();
  }

  // =========================================================
  // PAGINATION
  // =========================================================

  onPageChange(event: PageChangeEvent | any): void {
    if (event && typeof event === "object" && "page" in event) {
      this.currentPage = event.page;

      this.pageSize = event.pageSize;
    } else {
      this.currentPage = event;
    }

    this.fetchDocuments();
  }

  // =========================================================
  // PAGE SIZE
  // =========================================================

  onPageSizeChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;

    this.pageSize = Number(selectElement.value);

    this.currentPage = 1;

    this.fetchDocuments();
  }

  // =========================================================
  // OPEN THREE-DOTS MENU
  // =========================================================

  openMenu(document: any, event: MouseEvent): void {
    // Prevent row click

    event.stopPropagation();

    // Close if same menu clicked again

    if (this.activeMenuId === document.id) {
      this.closeMenu();

      return;
    }

    // Store selected document

    this.selectedDocument = document;

    this.activeMenuId = document.id;

    // Convert EventTarget to HTMLElement

    const targetElement = event.currentTarget as HTMLElement;

    if (!targetElement) {
      return;
    }

    const rect: DOMRect = targetElement.getBoundingClientRect();

    const menuWidth = 220;

    const menuHeight = 120;

    const spaceBelow = window.innerHeight - rect.bottom;

    const showAbove = spaceBelow < menuHeight;

    this.menuPopupPosition = {
      top: showAbove
        ? rect.top + window.scrollY - menuHeight
        : rect.bottom + window.scrollY,

      left: rect.right - menuWidth,
    };
  }

  // =========================================================
  // CLOSE POPUP MENU
  // =========================================================

  closeMenu(): void {
    this.menuPopupPosition = null;

    this.activeMenuId = null;

    this.selectedDocument = null;
  }

  // =========================================================
  // POPUP MENU ACTION
  // =========================================================

  onMenuItemClick(item: PopupMenuItem): void {
    if (!this.selectedDocument) {
      return;
    }

    const id = this.selectedDocument.id;

    // Close menu

    this.closeMenu();

    switch (item.id) {
      // -----------------------------------------------------
      // VIEW
      // -----------------------------------------------------

      case "view":
        this.viewDocument(id);

        break;

      // -----------------------------------------------------
      // EDIT
      // -----------------------------------------------------

      case "edit":
        this.editDocument(id);

        break;

      // -----------------------------------------------------
      // DISABLE
      // -----------------------------------------------------

      case "disable":
        this.disableDocument(id);

        break;

      // -----------------------------------------------------
      // ENABLE
      // -----------------------------------------------------

      case "enable":
        this.enableDocument(id);

        break;
    }
  }

  // =========================================================
  // ADD DOCUMENT
  // =========================================================

  addDocument(): void {
    this.router.navigate(["/add-document"]);
  }

  // =========================================================
  // EDIT DOCUMENT
  // =========================================================

  editDocument(id: string | number): void {
    this.router.navigate(["/edit-document", id]);
  }

  // =========================================================
  // VIEW DOCUMENT
  // =========================================================

  viewDocument(id: string | number): void {
    this.router.navigate(["/view-document", id], {
      queryParams: {
        viewMode: "true",
      },
    });
  }

  // =========================================================
  // DISABLE DOCUMENT
  // =========================================================

  disableDocument(id: string | number): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: "450px",

      disableClose: true,

      data: {
        message: "Are you sure you want to disable this document?",
      },
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) {
        return;
      }

      this.documentService.deleteDocument(id).subscribe({
        // ------------------------------------------------
        // SUCCESS
        // ------------------------------------------------

        next: () => {
          this.toastr.success("Document disabled successfully", "Success");

          this.fetchDocuments();
        },

        // ------------------------------------------------
        // ERROR
        // ------------------------------------------------

        error: (err: any) => {
          console.error("Disable document failed:", err);

          this.toastr.error(
            err?.error?.message || "Failed to disable document",

            "Error",
          );
        },
      });
    });
  }

  // =========================================================
  // ENABLE DOCUMENT
  // =========================================================

  enableDocument(id: string | number): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: "450px",

      disableClose: true,

      data: {
        message: "Are you sure you want to enable this document?",
      },
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) {
        return;
      }

      this.documentService.enableDocument(id).subscribe({
        // ------------------------------------------------
        // SUCCESS
        // ------------------------------------------------

        next: () => {
          this.toastr.success("Document enabled successfully", "Success");

          this.fetchDocuments();
        },

        // ------------------------------------------------
        // ERROR
        // ------------------------------------------------

        error: (err: any) => {
          console.error("Enable document failed:", err);

          this.toastr.error(
            err?.error?.message || "Failed to enable document",

            "Error",
          );
        },
      });
    });
  }

  // =========================================================
  // STATUS TOGGLE
  // =========================================================

  onStatusToggle(document: any, checked: boolean): void {
    const oldStatus = document.status;

    // Optimistic UI update

    document.status = checked ? 1 : 0;

    const apiCall = checked
      ? this.documentService.enableDocument(document.id)
      : this.documentService.deleteDocument(document.id);

    apiCall.subscribe({
      // -------------------------------------------------------
      // SUCCESS
      // -------------------------------------------------------

      next: () => {
        this.toastr.success(
          checked
            ? "Document enabled successfully"
            : "Document disabled successfully",
        );
      },

      // -------------------------------------------------------
      // ERROR
      // -------------------------------------------------------

      error: (err: any) => {
        // Restore old status

        document.status = oldStatus;

        console.error("Status update failed:", err);

        this.toastr.error(
          err?.error?.message || "Update failed",

          "Error",
        );
      },
    });
  }

  // =========================================================
  // LOGOUT
  // =========================================================

  logout(): void {
    this.isLoggingOut = true;

    localStorage.removeItem("token");

    this.router.navigate(["/login"]);

    this.toastr.info("Logged out successfully.");
  }

  // =========================================================
  // CHECK DISABLED DOCUMENTS
  // =========================================================

  hasDisabledDocuments(): boolean {
    return this.documents.some((document: any) => document.status === 0);
  }
}
