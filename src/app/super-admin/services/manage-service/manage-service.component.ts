import { Component, OnInit, OnDestroy, HostListener } from "@angular/core";

import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, RouterModule } from "@angular/router";
import { HttpClientModule } from "@angular/common/http";
import { ToastrModule, ToastrService } from "ngx-toastr";

import { ServiceService } from "../../../services/service.service";

import { StatusToggleComponent } from "../../../shared/status-toggle/status-toggle.component";

import { ThreeDotsButtonComponent } from "../../../shared/three-dots-button/three-dots-button.component";

import { PopupMenuComponent } from "../../../shared/popup-menu/popup-menu.component";

import { PopupMenuItem } from "../../../shared/popup-menu/popup-menu.model";

import {
  PaginationFooterComponent,
  PageChangeEvent,
} from "../../../shared/pagination-footer/pagination-footer.component";

@Component({
  selector: "app-manage-service",

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

  templateUrl: "./manage-service.component.html",

  styleUrl: "./manage-service.component.css",
})
export class ManageServiceComponent implements OnInit, OnDestroy {
  token: string | null = localStorage.getItem("token");

  services: any[] = [];

  loading = false;

  isLoggingOut = false;

  search = "";

  totalItems = 0;

  pageSize = 10;

  currentPage = 1;

  searchTimeout: any;

  activeMenuId: any = null;

  menuPopupPosition: { top: number; left: number } | null = null;

  selectedService: any = null;

  canEnableDisable = true;

  constructor(
    private serviceService: ServiceService,

    private router: Router,

    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.fetchServices();
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

    if (this.canEnableDisable && this.selectedService) {
      if (this.selectedService.status === 0) {
        items.push({
          id: "enable",

          label: "Enable Service",
        });
      } else {
        items.push({
          id: "disable",

          label: "Disable Service",

          variant: "danger",
        });
      }
    }

    return items;
  }

  /**
   * Fetch Services
   */
  fetchServices(): void {
    if (!this.token || this.isLoggingOut) {
      this.toastr.warning(
        "Session expired or not logged in. Redirecting to login...",
        "Warning",
      );

      this.router.navigate(["/login"]).then(() => window.location.reload());

      return;
    }

    this.loading = true;

    this.serviceService
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

          this.services = rawData;

          this.totalItems = response?.totalItems || this.services.length || 0;

          this.loading = false;
        },

        error: (err: any) => {
          console.error("Failed to fetch services:", err);

          this.toastr.error(
            err?.error?.message || "Failed to fetch services",

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

      this.fetchServices();
    }, 400);
  }

  /**
   * Reset Search
   */
  resetFilter(): void {
    this.search = "";

    this.currentPage = 1;

    this.fetchServices();
  }

  /**
   * Pagination
   */
  onPageChange(event: PageChangeEvent): void {
    this.currentPage = event.page;

    this.pageSize = event.pageSize;

    this.fetchServices();
  }

  /**
   * Page Size
   */
  onPageSizeChange(event: Event): void {
    this.pageSize = Number((event.target as HTMLSelectElement).value);

    this.currentPage = 1;

    this.fetchServices();
  }

  /**
   * Add Service
   */
  addService(): void {
    this.router.navigate(["/add-service"]);
  }

  /**
   * View Service
   */
  viewService(id: number | string): void {
    this.router.navigate(["/view-service", id], {
      queryParams: {
        viewMode: "true",
      },
    });
  }

  /**
   * Open Action Menu
   */
  openMenu(service: any, event: MouseEvent): void {
    event.stopPropagation();

    if (this.activeMenuId === service.id) {
      this.closeMenu();

      return;
    }

    this.selectedService = service;

    this.activeMenuId = service.id;

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

    this.selectedService = null;
  }

  /**
   * Action Menu Click
   */
  onMenuItemClick(item: PopupMenuItem): void {
    if (!this.selectedService) {
      return;
    }

    const id = this.selectedService.id;

    this.closeMenu();

    switch (item.id) {
      case "view":
        this.viewService(id);

        break;

      case "edit":
        this.router.navigate(["/edit-service", id]);

        break;

      case "disable":
        this.disableService(id).subscribe({
          next: () => {
            this.toastr.success("Service disabled successfully");

            this.fetchServices();
          },

          error: (err: any) => {
            this.toastr.error(
              err?.error?.message || "Failed to disable service",
            );
          },
        });

        break;

      case "enable":
        this.enableService(id).subscribe({
          next: () => {
            this.toastr.success("Service enabled successfully");

            this.fetchServices();
          },

          error: (err: any) => {
            this.toastr.error(
              err?.error?.message || "Failed to enable service",
            );
          },
        });

        break;
    }
  }

  /**
   * Disable Service
   */
  disableService(id: number | string) {
    return this.serviceService.delete(id);
  }

  /**
   * Enable Service
   */
  enableService(id: number | string) {
    return this.serviceService.enable(id);
  }

  /**
   * Status Toggle
   */
  onStatusToggle(service: any, checked: boolean): void {
    const previousStatus = service.status;

    service.status = checked ? 1 : 0;

    const apiCall = checked
      ? this.enableService(service.id)
      : this.disableService(service.id);

    apiCall.subscribe({
      next: () => {
        this.toastr.success(
          checked
            ? "Service enabled successfully"
            : "Service disabled successfully",
        );
      },

      error: (err: any) => {
        service.status = previousStatus;

        this.toastr.error(
          err?.error?.message || "Failed to update service status",
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
