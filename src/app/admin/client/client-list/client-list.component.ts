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

import { ClientService } from "../../../services/client.service";

@Component({
  selector: "app-client-list",

  templateUrl: "./client-list.component.html",

  styleUrls: ["./client-list.component.css"],

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
export class ClientListComponent implements OnInit, OnDestroy {
  // =========================================================
  // VARIABLES
  // =========================================================

  token: string | null = localStorage.getItem("token");

  clients: any[] = [];

  filteredClients: any[] = [];

  loading = false;

  isLoggingOut = false;

  search = "";

  totalItems = 0;

  pageSize = 10;

  currentPage = 1;

  searchTimeout: any = null;

  activeMenuId: number | string | null = null;

  menuPopupPosition: { top: number; left: number } | null = null;

  selectedClient: any = null;

  // =========================================================
  // CONSTRUCTOR
  // =========================================================

  constructor(
    private router: Router,

    private toastr: ToastrService,

    private dialog: MatDialog,

    private clientService: ClientService,

    private ngxLoader: NgxUiLoaderService,
  ) {}

  // =========================================================
  // LIFECYCLE
  // =========================================================

  ngOnInit(): void {
    this.fetchClients();
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

    if (this.selectedClient) {
      if (this.selectedClient.status === 0) {
        items.push({
          id: "enable",

          label: "Enable Client",
        });
      } else {
        items.push({
          id: "disable",

          label: "Disable Client",

          variant: "danger",
        });
      }
    }

    return items;
  }

  // =========================================================
  // FETCH CLIENTS
  // =========================================================

  fetchClients(): void {
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

    this.clientService.listAllClients(payload).subscribe({
      // -----------------------------------------------------
      // SUCCESS
      // -----------------------------------------------------

      next: (response: any) => {
        console.log("Clients Response:", response);

        const rawData =
          response?.data && Array.isArray(response.data)
            ? response.data
            : Array.isArray(response)
              ? response
              : [];

        this.clients = rawData;

        this.filteredClients = rawData;

        this.totalItems =
          response?.totalItems ?? response?.total ?? rawData.length;

        this.loading = false;
      },

      // -----------------------------------------------------
      // ERROR
      // -----------------------------------------------------

      error: (error: any) => {
        this.loading = false;

        console.error("Error fetching clients:", error);

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
          error?.error?.message || "Failed to fetch clients",

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

      this.fetchClients();
    }, 400);
  }

  // =========================================================
  // RESET SEARCH
  // =========================================================

  resetFilter(): void {
    this.search = "";

    this.currentPage = 1;

    this.fetchClients();
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

    this.fetchClients();
  }

  // =========================================================
  // PAGE SIZE
  // =========================================================

  onPageSizeChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;

    this.pageSize = Number(selectElement.value);

    this.currentPage = 1;

    this.fetchClients();
  }

  // =========================================================
  // OPEN THREE-DOTS MENU
  // =========================================================

  openMenu(client: any, event: MouseEvent): void {
    // Prevent row click

    event.stopPropagation();

    // Close if same menu clicked again

    if (this.activeMenuId === client.id) {
      this.closeMenu();

      return;
    }

    // Store selected client

    this.selectedClient = client;

    this.activeMenuId = client.id;

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

    this.selectedClient = null;
  }

  // =========================================================
  // POPUP MENU ACTION
  // =========================================================

  onMenuItemClick(item: PopupMenuItem): void {
    if (!this.selectedClient) {
      return;
    }

    const id = this.selectedClient.id;

    // Close menu

    this.closeMenu();

    switch (item.id) {
      // -----------------------------------------------------
      // VIEW
      // -----------------------------------------------------

      case "view":
        this.viewClient(id);

        break;

      // -----------------------------------------------------
      // EDIT
      // -----------------------------------------------------

      case "edit":
        this.editClient(id);

        break;

      // -----------------------------------------------------
      // DISABLE
      // -----------------------------------------------------

      case "disable":
        this.disableClient(id);

        break;

      // -----------------------------------------------------
      // ENABLE
      // -----------------------------------------------------

      case "enable":
        this.enableClient(id);

        break;
    }
  }

  // =========================================================
  // ADD CLIENT
  // =========================================================

  addClient(): void {
    this.router.navigate(["/add-client"]);
  }

  // =========================================================
  // EDIT CLIENT
  // =========================================================

  editClient(id: string | number): void {
    this.router.navigate(["/edit-client", id]);
  }

  // =========================================================
  // VIEW CLIENT
  // =========================================================

  viewClient(id: string | number): void {
    this.router.navigate(["/view-client", id], {
      queryParams: {
        viewMode: "true",
      },
    });
  }

  // =========================================================
  // DISABLE CLIENT
  // =========================================================

  disableClient(id: string | number): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: "450px",

      disableClose: true,

      data: {
        message: "Are you sure you want to disable this client?",
      },
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) {
        return;
      }

      this.clientService.deleteClient(id).subscribe({
        // ------------------------------------------------
        // SUCCESS
        // ------------------------------------------------

        next: () => {
          this.toastr.success("Client disabled successfully", "Success");

          this.fetchClients();
        },

        // ------------------------------------------------
        // ERROR
        // ------------------------------------------------

        error: (err: any) => {
          console.error("Disable client failed:", err);

          this.toastr.error(
            err?.error?.message || "Failed to disable client",

            "Error",
          );
        },
      });
    });
  }

  // =========================================================
  // ENABLE CLIENT
  // =========================================================

  enableClient(id: string | number): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: "450px",

      disableClose: true,

      data: {
        message: "Are you sure you want to enable this client?",
      },
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) {
        return;
      }

      this.clientService.enableClient(id).subscribe({
        // ------------------------------------------------
        // SUCCESS
        // ------------------------------------------------

        next: () => {
          this.toastr.success("Client enabled successfully", "Success");

          this.fetchClients();
        },

        // ------------------------------------------------
        // ERROR
        // ------------------------------------------------

        error: (err: any) => {
          console.error("Enable client failed:", err);

          this.toastr.error(
            err?.error?.message || "Failed to enable client",

            "Error",
          );
        },
      });
    });
  }

  // =========================================================
  // STATUS TOGGLE
  // =========================================================

  onStatusToggle(client: any, checked: boolean): void {
    const oldStatus = client.status;

    // Optimistic UI update

    client.status = checked ? 1 : 0;

    const apiCall = checked
      ? this.clientService.enableClient(client.id)
      : this.clientService.deleteClient(client.id);

    apiCall.subscribe({
      // -------------------------------------------------------
      // SUCCESS
      // -------------------------------------------------------

      next: () => {
        this.toastr.success(
          checked
            ? "Client enabled successfully"
            : "Client disabled successfully",
        );
      },

      // -------------------------------------------------------
      // ERROR
      // -------------------------------------------------------

      error: (err: any) => {
        // Restore old status

        client.status = oldStatus;

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
  // CHECK DISABLED CLIENTS
  // =========================================================

  hasDisabledClients(): boolean {
    return this.clients.some((client: any) => client.status === 0);
  }
}
