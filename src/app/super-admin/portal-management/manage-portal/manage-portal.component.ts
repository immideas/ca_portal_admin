import { Component, OnInit, OnDestroy, HostListener } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, RouterModule } from "@angular/router";
import { HttpClientModule } from "@angular/common/http";
import { ToastrModule, ToastrService } from "ngx-toastr";

import { PortalService } from "../../../services/portal.service";

import { StatusToggleComponent } from "../../../shared/status-toggle/status-toggle.component";
import { ThreeDotsButtonComponent } from "../../../shared/three-dots-button/three-dots-button.component";
import { PopupMenuComponent } from "../../../shared/popup-menu/popup-menu.component";
import { PopupMenuItem } from "../../../shared/popup-menu/popup-menu.model";

import {
  PaginationFooterComponent,
  PageChangeEvent,
} from "../../../shared/pagination-footer/pagination-footer.component";

@Component({
  selector: "app-manage-portal",
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

  templateUrl: "./manage-portal.component.html",
  styleUrl: "./manage-portal.component.css",
})
export class ManagePortalComponent implements OnInit, OnDestroy {
  token: string | null = localStorage.getItem("token");

  portals: any[] = [];

  loading = false;

  isLoggingOut = false;

  search = "";

  totalItems = 0;

  pageSize = 10;

  currentPage = 1;

  searchTimeout: any;

  activeMenuId: any = null;

  menuPopupPosition: { top: number; left: number } | null = null;

  selectedPortal: any = null;

  canEnableDisable = true;

  constructor(
    private portalService: PortalService,
    private router: Router,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.fetchPortals();
  }

  ngOnDestroy(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }

  /**
   * Close popup when Escape is pressed.
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

    if (this.canEnableDisable && this.selectedPortal) {
      if (Number(this.selectedPortal.status) === 0) {
        items.push({
          id: "enable",
          label: "Enable Portal",
        });
      } else {
        items.push({
          id: "disable",
          label: "Disable Portal",
          variant: "danger",
        });
      }
    }

    return items;
  }

  /**
   * Fetch Portals
   */
  fetchPortals(): void {
    if (!this.token || this.isLoggingOut) {
      this.toastr.warning(
        "Session expired or not logged in. Redirecting to login...",
        "Warning",
      );

      this.router.navigate(["/login"]).then(() => {
        window.location.reload();
      });

      return;
    }

    this.loading = true;

    this.portalService
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

          this.portals = rawData;

          this.totalItems =
            response?.totalItems ??
            response?.pagination?.totalItems ??
            this.portals.length;

          this.loading = false;
        },

        error: (err: any) => {
          console.error("Failed to fetch portals:", err);

          this.toastr.error(
            err?.error?.message || "Failed to fetch portals",
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
      this.fetchPortals();
    }, 400);
  }

  /**
   * Reset Search
   */
  resetFilter(): void {
    this.search = "";
    this.currentPage = 1;
    this.fetchPortals();
  }

  /**
   * Pagination
   */
  onPageChange(event: PageChangeEvent): void {
    this.currentPage = event.page;
    this.pageSize = event.pageSize;
    this.fetchPortals();
  }

  /**
   * Page Size
   */
  onPageSizeChange(event: Event): void {
    this.pageSize = Number((event.target as HTMLSelectElement).value);

    this.currentPage = 1;
    this.fetchPortals();
  }

  /**
   * Add Portal
   */
  addPortal(): void {
    this.router.navigate(["/add-portal"]);
  }

  /**
   * View Portal
   */
  viewPortal(id: number | string): void {
    this.router.navigate(["/view-portal", id], {
      queryParams: {
        viewMode: "true",
      },
    });
  }

  /**
   * Open Action Menu
   */
  openMenu(portal: any, event: MouseEvent): void {
    event.stopPropagation();

    if (this.activeMenuId === portal.id) {
      this.closeMenu();
      return;
    }

    this.selectedPortal = portal;
    this.activeMenuId = portal.id;

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();

    const menuWidth = 220;
    const menuHeight = 130;

    const spaceBelow = window.innerHeight - rect.bottom;
    const showAbove = spaceBelow < menuHeight;

    this.menuPopupPosition = {
      top: showAbove
        ? rect.top + window.scrollY - menuHeight
        : rect.bottom + window.scrollY,

      left: rect.right + window.scrollX - menuWidth,
    };
  }

  /**
   * Close Action Menu
   */
  closeMenu(): void {
    this.menuPopupPosition = null;
    this.activeMenuId = null;
    this.selectedPortal = null;
  }

  /**
   * Action Menu Click
   */
  onMenuItemClick(item: PopupMenuItem): void {
    if (!this.selectedPortal) {
      return;
    }

    const id = this.selectedPortal.id;

    this.closeMenu();

    switch (item.id) {
      case "view":
        this.viewPortal(id);
        break;

      case "edit":
        this.router.navigate(["/edit-portal", id]);
        break;

      case "disable":
        this.disablePortal(id).subscribe({
          next: (res: any) => {
            if (res?.success === false) {
              this.toastr.error(
                res?.message || "Failed to disable portal",
                "Error",
              );
              return;
            }

            this.toastr.success("Portal disabled successfully");
            this.fetchPortals();
          },

          error: (err: any) => {
            this.toastr.error(
              err?.error?.message || "Failed to disable portal",
              "Error",
            );
          },
        });
        break;

      case "enable":
        this.enablePortal(id).subscribe({
          next: (res: any) => {
            if (res?.success === false) {
              this.toastr.error(
                res?.message || "Failed to enable portal",
                "Error",
              );
              return;
            }

            this.toastr.success("Portal enabled successfully");
            this.fetchPortals();
          },

          error: (err: any) => {
            this.toastr.error(
              err?.error?.message || "Failed to enable portal",
              "Error",
            );
          },
        });
        break;
    }
  }

  /**
   * Disable Portal
   */
  disablePortal(id: number | string) {
    return this.portalService.delete(id);
  }

  /**
   * Enable Portal
   */
  enablePortal(id: number | string) {
    return this.portalService.enable(id);
  }

  /**
   * Status Toggle
   */
  onStatusToggle(portal: any, checked: boolean): void {
    const previousStatus = Number(portal.status);

    portal.status = checked ? 1 : 0;

    const apiCall = checked
      ? this.enablePortal(portal.id)
      : this.disablePortal(portal.id);

    apiCall.subscribe({
      next: (res: any) => {
        if (res?.success === false) {
          portal.status = previousStatus;

          this.toastr.error(
            res?.message || "Failed to update portal status",
            "Error",
          );

          return;
        }

        this.toastr.success(
          checked
            ? "Portal enabled successfully"
            : "Portal disabled successfully",
        );
      },

      error: (err: any) => {
        portal.status = previousStatus;

        this.toastr.error(
          err?.error?.message || "Failed to update portal status",
          "Error",
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
