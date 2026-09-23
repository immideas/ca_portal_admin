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

import { NgxUiLoaderModule, NgxUiLoaderService } from "ngx-ui-loader";

import { DocumentRequestService } from "../../../services/document-request.service";

@Component({
  selector: "app-document-request-list",

  templateUrl: "./document-request-list.component.html",

  styleUrls: ["./document-request-list.component.css"],

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
  ],
})
export class DocumentRequestListComponent implements OnInit, OnDestroy {
  // =========================================================
  // VARIABLES
  // =========================================================

  token: string | null = localStorage.getItem("token");

  documentRequests: any[] = [];

  filteredDocumentRequests: any[] = [];

  loading = false;

  isLoggingOut = false;

  search = "";

  totalItems = 0;

  pageSize = 10;

  currentPage = 1;

  searchTimeout: any = null;

  activeMenuId: number | string | null = null;

  menuPopupPosition: { top: number; left: number } | null = null;

  selectedDocumentRequest: any = null;

  // =========================================================
  // CONSTRUCTOR
  // =========================================================

  constructor(
    private router: Router,

    private toastr: ToastrService,

    private dialog: MatDialog,

    private documentRequestService: DocumentRequestService,

    private ngxLoader: NgxUiLoaderService,
  ) {}

  // =========================================================
  // LIFECYCLE
  // =========================================================

  ngOnInit(): void {
    this.fetchDocumentRequests();
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
    // CANCEL REQUEST
    // ---------------------------------------------------------

    if (this.selectedDocumentRequest) {
      if (this.selectedDocumentRequest.status !== "CANCELLED") {
        items.push({
          id: "cancel",

          label: "Cancel Request",

          variant: "danger",
        });
      }
    }

    return items;
  }

  // =========================================================
  // FETCH DOCUMENT REQUESTS
  // =========================================================

  fetchDocumentRequests(): void {
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

    this.documentRequestService.list(payload).subscribe({
      // -----------------------------------------------------
      // SUCCESS
      // -----------------------------------------------------

      next: (response: any) => {
        console.log("Document Requests Response:", response);

        const rawData =
          response?.data && Array.isArray(response.data)
            ? response.data
            : Array.isArray(response)
              ? response
              : [];

        this.documentRequests = rawData;

        this.filteredDocumentRequests = rawData;

        this.totalItems =
          response?.totalItems ?? response?.total ?? rawData.length;

        this.loading = false;
      },

      // -----------------------------------------------------
      // ERROR
      // -----------------------------------------------------

      error: (error: any) => {
        this.loading = false;

        console.error("Error fetching document requests:", error);

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
          error?.error?.message || "Failed to fetch service requests",

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

      this.fetchDocumentRequests();
    }, 400);
  }

  // =========================================================
  // RESET SEARCH
  // =========================================================

  resetFilter(): void {
    this.search = "";

    this.currentPage = 1;

    this.fetchDocumentRequests();
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

    this.fetchDocumentRequests();
  }

  // =========================================================
  // PAGE SIZE
  // =========================================================

  onPageSizeChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;

    this.pageSize = Number(selectElement.value);

    this.currentPage = 1;

    this.fetchDocumentRequests();
  }

  // =========================================================
  // OPEN THREE-DOTS MENU
  // =========================================================

  openMenu(documentRequest: any, event: MouseEvent): void {
    // Prevent row click

    event.stopPropagation();

    // Close if same menu clicked again

    if (this.activeMenuId === documentRequest.id) {
      this.closeMenu();

      return;
    }

    // Store selected request

    this.selectedDocumentRequest = documentRequest;

    this.activeMenuId = documentRequest.id;

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

    this.selectedDocumentRequest = null;
  }

  // =========================================================
  // POPUP MENU ACTION
  // =========================================================

  onMenuItemClick(item: PopupMenuItem): void {
    if (!this.selectedDocumentRequest) {
      return;
    }

    const id = this.selectedDocumentRequest.id;

    // Close menu

    this.closeMenu();

    switch (item.id) {
      // -----------------------------------------------------
      // VIEW
      // -----------------------------------------------------

      case "view":
        this.viewDocumentRequest(id);

        break;

      // -----------------------------------------------------
      // EDIT
      // -----------------------------------------------------

      case "edit":
        this.editDocumentRequest(id);

        break;

      // -----------------------------------------------------
      // CANCEL
      // -----------------------------------------------------

      case "cancel":
        this.cancelDocumentRequest(id);

        break;
    }
  }

  // =========================================================
  // ADD DOCUMENT REQUEST
  // =========================================================

  addDocumentRequest(): void {
    this.router.navigate(["/add-service-request"]);
  }

  // =========================================================
  // EDIT DOCUMENT REQUEST
  // =========================================================

  editDocumentRequest(id: string | number): void {
    this.router.navigate(["/edit-service-request", id]);
  }

  // =========================================================
  // VIEW DOCUMENT REQUEST
  // =========================================================

  viewDocumentRequest(id: string | number): void {
    this.router.navigate(["/view-service-request", id], {
      queryParams: {
        viewMode: "true",
      },
    });
  }

  // =========================================================
  // CANCEL DOCUMENT REQUEST
  // =========================================================

  cancelDocumentRequest(id: string | number): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: "450px",

      disableClose: true,

      data: {
       message: "Are you sure you want to cancel this service request?",
      },
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) {
        return;
      }

      /*
       * IMPORTANT:
       *
       * Your current DocumentRequestService
       * only has:
       *
       * create()
       * list()
       * getById()
       *
       * There is currently no cancel API.
       *
       * So do not call an API here yet.
       */

      this.toastr.info("Cancel API is not connected yet.", "Information");
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
}
