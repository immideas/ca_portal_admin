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

import { ClientGroupService } from "../../../services/client-group.service";

@Component({
  selector: "app-client-group-list",

  templateUrl: "./client-group-list.component.html",

  styleUrls: ["./client-group-list.component.css"],

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
export class ClientGroupListComponent implements OnInit, OnDestroy {
  // =========================================================
  // VARIABLES
  // =========================================================

  token: string | null = localStorage.getItem("token");

  clientGroups: any[] = [];

  filteredGroups: any[] = [];

  loading = false;

  isLoggingOut = false;

  search = "";

  totalItems = 0;

  pageSize = 10;

  currentPage = 1;

  searchTimeout: any = null;

  activeMenuId: number | string | null = null;

  menuPopupPosition: { top: number; left: number } | null = null;

  selectedClientGroup: any = null;

  // =========================================================
  // CONSTRUCTOR
  // =========================================================

  constructor(
    private router: Router,

    private toastr: ToastrService,

    private dialog: MatDialog,

    private clientGroupService: ClientGroupService,

    private ngxLoader: NgxUiLoaderService,
  ) {}

  // =========================================================
  // LIFECYCLE
  // =========================================================

  ngOnInit(): void {
    this.fetchClientGroups();
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

    // View
    items.push({
      id: "view",
      label: "View",
    });

    // Edit
    items.push({
      id: "edit",
      label: "Edit",
    });

    // Enable / Disable
    if (this.selectedClientGroup) {
      if (this.selectedClientGroup.status === 0) {
        items.push({
          id: "enable",
          label: "Enable Group",
        });
      } else {
        items.push({
          id: "disable",
          label: "Disable Group",
          variant: "danger",
        });
      }
    }

    return items;
  }

  // =========================================================
  // FETCH CLIENT GROUPS
  // =========================================================

  fetchClientGroups(): void {
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

    this.clientGroupService.listAllClientGroups(payload).subscribe({
      // ---------------------------------------------------
      // SUCCESS
      // ---------------------------------------------------

      next: (response: any) => {
        console.log("Client Groups Response:", response);

        const rawData =
          response?.data && Array.isArray(response.data)
            ? response.data
            : Array.isArray(response)
              ? response
              : [];

        this.clientGroups = rawData;

        this.filteredGroups = rawData;

        this.totalItems =
          response?.totalItems ?? response?.total ?? rawData.length;

        this.loading = false;
      },

      // ---------------------------------------------------
      // ERROR
      // ---------------------------------------------------

      error: (error: any) => {
        this.loading = false;

        console.error("Error fetching client groups:", error);

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
          error?.error?.message || "Failed to fetch client groups",
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

      this.fetchClientGroups();
    }, 400);
  }

  // =========================================================
  // RESET SEARCH
  // =========================================================

  resetFilter(): void {
    this.search = "";

    this.currentPage = 1;

    this.fetchClientGroups();
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

    this.fetchClientGroups();
  }

  // =========================================================
  // PAGE SIZE
  // =========================================================

  onPageSizeChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;

    this.pageSize = Number(selectElement.value);

    this.currentPage = 1;

    this.fetchClientGroups();
  }

  // =========================================================
  // OPEN THREE-DOTS MENU
  // =========================================================

  openMenu(clientGroup: any, event: MouseEvent): void {
    // Prevent row click
    event.stopPropagation();

    // Close if same menu clicked again
    if (this.activeMenuId === clientGroup.id) {
      this.closeMenu();

      return;
    }

    // Store selected group
    this.selectedClientGroup = clientGroup;

    this.activeMenuId = clientGroup.id;

    // -------------------------------------------------------
    // IMPORTANT:
    // currentTarget is explicitly converted to HTMLElement.
    // This prevents the TS2339 EventTarget error.
    // -------------------------------------------------------

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

    this.selectedClientGroup = null;
  }

  // =========================================================
  // POPUP MENU ACTION
  // =========================================================

  onMenuItemClick(item: PopupMenuItem): void {
    if (!this.selectedClientGroup) {
      return;
    }

    const id = this.selectedClientGroup.id;

    // Close menu before navigation/action
    this.closeMenu();

    switch (item.id) {
      // -----------------------------------------------------
      // VIEW
      // -----------------------------------------------------

      case "view":
        this.viewClientGroup(id);

        break;

      // -----------------------------------------------------
      // EDIT
      // -----------------------------------------------------

      case "edit":
        this.editClientGroup(id);

        break;

      // -----------------------------------------------------
      // DISABLE
      // -----------------------------------------------------

      case "disable":
        this.disableClientGroup(id);

        break;

      // -----------------------------------------------------
      // ENABLE
      // -----------------------------------------------------

      case "enable":
        this.enableClientGroup(id);

        break;
    }
  }

  // =========================================================
  // ADD CLIENT GROUP
  // =========================================================

  addClientGroup(): void {
    this.router.navigate(["/add-client-group"]);
  }

  // =========================================================
  // EDIT CLIENT GROUP
  // =========================================================

  editClientGroup(id: string | number): void {
    this.router.navigate(["/edit-client-group", id]);
  }

  // =========================================================
  // VIEW CLIENT GROUP
  // =========================================================

  viewClientGroup(id: string | number): void {
    this.router.navigate(["/view-client-group", id], {
      queryParams: {
        viewMode: "true",
      },
    });
  }

  // =========================================================
  // DISABLE CLIENT GROUP
  // =========================================================

  disableClientGroup(id: string | number): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: "450px",

      disableClose: true,

      data: {
        message: "Are you sure you want to disable this client group?",
      },
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) {
        return;
      }

      this.clientGroupService.deleteClientGroup(id).subscribe({
        // ------------------------------------------------
        // SUCCESS
        // ------------------------------------------------

        next: () => {
          this.toastr.success("Client group disabled successfully", "Success");

          this.fetchClientGroups();
        },

        // ------------------------------------------------
        // ERROR
        // ------------------------------------------------

        error: (err: any) => {
          console.error("Disable client group failed:", err);

          this.toastr.error(
            err?.error?.message || "Failed to disable client group",
            "Error",
          );
        },
      });
    });
  }

  // =========================================================
  // ENABLE CLIENT GROUP
  // =========================================================

  enableClientGroup(id: string | number): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: "450px",

      disableClose: true,

      data: {
        message: "Are you sure you want to enable this client group?",
      },
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) {
        return;
      }

      this.clientGroupService.enableClientGroup(id).subscribe({
        // ------------------------------------------------
        // SUCCESS
        // ------------------------------------------------

        next: () => {
          this.toastr.success("Client group enabled successfully", "Success");

          this.fetchClientGroups();
        },

        // ------------------------------------------------
        // ERROR
        // ------------------------------------------------

        error: (err: any) => {
          console.error("Enable client group failed:", err);

          this.toastr.error(
            err?.error?.message || "Failed to enable client group",
            "Error",
          );
        },
      });
    });
  }

  // =========================================================
  // STATUS TOGGLE
  // =========================================================

  onStatusToggle(clientGroup: any, checked: boolean): void {
    const oldStatus = clientGroup.status;

    // Optimistic UI update
    clientGroup.status = checked ? 1 : 0;

    const apiCall = checked
      ? this.clientGroupService.enableClientGroup(clientGroup.id)
      : this.clientGroupService.deleteClientGroup(clientGroup.id);

    apiCall.subscribe({
      // -------------------------------------------------------
      // SUCCESS
      // -------------------------------------------------------

      next: () => {
        this.toastr.success(
          checked
            ? "Client group enabled successfully"
            : "Client group disabled successfully",
        );
      },

      // -------------------------------------------------------
      // ERROR
      // -------------------------------------------------------

      error: (err: any) => {
        // Restore old status
        clientGroup.status = oldStatus;

        console.error("Status update failed:", err);

        this.toastr.error(err?.error?.message || "Update failed", "Error");
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
  // CHECK DISABLED GROUPS
  // =========================================================

  hasDisabledGroups(): boolean {
    return this.clientGroups.some((group: any) => group.status === 0);
  }
}
