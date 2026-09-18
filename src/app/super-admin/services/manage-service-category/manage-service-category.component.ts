import { Component, OnInit, OnDestroy, HostListener } from "@angular/core";

import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, RouterModule } from "@angular/router";
import { HttpClientModule } from "@angular/common/http";
import { ToastrModule, ToastrService } from "ngx-toastr";

import { ServiceCategoryService } from "../../../services/service-category.service";

import { StatusToggleComponent } from "../../../shared/status-toggle/status-toggle.component";

import { ThreeDotsButtonComponent } from "../../../shared/three-dots-button/three-dots-button.component";

import { PopupMenuComponent } from "../../../shared/popup-menu/popup-menu.component";

import { PopupMenuItem } from "../../../shared/popup-menu/popup-menu.model";

import {
  PaginationFooterComponent,
  PageChangeEvent,
} from "../../../shared/pagination-footer/pagination-footer.component";

@Component({
  selector: "app-manage-service-category",

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

  templateUrl: "./manage-service-category.component.html",

  styleUrl: "./manage-service-category.component.css",
})
export class ManageServiceCategoryComponent implements OnInit, OnDestroy {
  token: string | null = localStorage.getItem("token");

  serviceCategories: any[] = [];

  loading = false;

  isLoggingOut = false;

  search = "";

  totalItems = 0;

  pageSize = 10;

  currentPage = 1;

  searchTimeout: any;

  activeMenuId: any = null;

  menuPopupPosition: { top: number; left: number } | null = null;

  selectedServiceCategory: any = null;

  canEnableDisable = true;

  constructor(
    private serviceCategoryService: ServiceCategoryService,

    private router: Router,

    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.fetchServiceCategories();
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

    if (this.canEnableDisable && this.selectedServiceCategory) {
      if (this.selectedServiceCategory.status === 0) {
        items.push({
          id: "enable",

          label: "Enable Service Category",
        });
      } else {
        items.push({
          id: "disable",

          label: "Disable Service Category",

          variant: "danger",
        });
      }
    }

    return items;
  }

  /**
   * Fetch Service Categories
   */
  fetchServiceCategories(): void {
    if (!this.token || this.isLoggingOut) {
      this.toastr.warning(
        "Session expired or not logged in. Redirecting to login...",
        "Warning",
      );

      this.router.navigate(["/login"]).then(() => window.location.reload());

      return;
    }

    this.loading = true;

    this.serviceCategoryService
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

          this.serviceCategories = rawData;

          this.totalItems =
            response?.totalItems || this.serviceCategories.length || 0;

          this.loading = false;
        },

        error: (err: any) => {
          console.error("Failed to fetch service categories:", err);

          this.toastr.error(
            err?.error?.message || "Failed to fetch service categories",

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

      this.fetchServiceCategories();
    }, 400);
  }

  /**
   * Reset Search
   */
  resetFilter(): void {
    this.search = "";

    this.currentPage = 1;

    this.fetchServiceCategories();
  }

  /**
   * Pagination
   */
  onPageChange(event: PageChangeEvent): void {
    this.currentPage = event.page;

    this.pageSize = event.pageSize;

    this.fetchServiceCategories();
  }

  /**
   * Page Size
   */
  onPageSizeChange(event: Event): void {
    this.pageSize = Number((event.target as HTMLSelectElement).value);

    this.currentPage = 1;

    this.fetchServiceCategories();
  }

  /**
   * Add Service Category
   */
  addServiceCategory(): void {
    this.router.navigate(["/add-service-category"]);
  }

  /**
   * View Service Category
   */
  viewServiceCategory(id: number | string): void {
    this.router.navigate(["/view-service-category", id], {
      queryParams: {
        viewMode: "true",
      },
    });
  }

  /**
   * Open Action Menu
   */
  openMenu(serviceCategory: any, event: MouseEvent): void {
    event.stopPropagation();

    if (this.activeMenuId === serviceCategory.id) {
      this.closeMenu();

      return;
    }

    this.selectedServiceCategory = serviceCategory;

    this.activeMenuId = serviceCategory.id;

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

    this.selectedServiceCategory = null;
  }

  /**
   * Action Menu Click
   */
  onMenuItemClick(item: PopupMenuItem): void {
    if (!this.selectedServiceCategory) {
      return;
    }

    const id = this.selectedServiceCategory.id;

    this.closeMenu();

    switch (item.id) {
      case "view":
        this.viewServiceCategory(id);

        break;

      case "edit":
        this.router.navigate(["/edit-service-category", id]);

        break;

      case "disable":
        this.disableServiceCategory(id).subscribe({
          next: () => {
            this.toastr.success("Service category disabled successfully");

            this.fetchServiceCategories();
          },

          error: (err: any) => {
            this.toastr.error(
              err?.error?.message || "Failed to disable service category",
            );
          },
        });

        break;

      case "enable":
        this.enableServiceCategory(id).subscribe({
          next: () => {
            this.toastr.success("Service category enabled successfully");

            this.fetchServiceCategories();
          },

          error: (err: any) => {
            this.toastr.error(
              err?.error?.message || "Failed to enable service category",
            );
          },
        });

        break;
    }
  }

  /**
   * Disable Service Category
   */
  disableServiceCategory(id: number | string) {
    return this.serviceCategoryService.delete(id);
  }

  /**
   * Enable Service Category
   */
  enableServiceCategory(id: number | string) {
    return this.serviceCategoryService.enable(id);
  }

  /**
   * Status Toggle
   */
  onStatusToggle(serviceCategory: any, checked: boolean): void {
    const previousStatus = serviceCategory.status;

    serviceCategory.status = checked ? 1 : 0;

    const apiCall = checked
      ? this.enableServiceCategory(serviceCategory.id)
      : this.disableServiceCategory(serviceCategory.id);

    apiCall.subscribe({
      next: () => {
        this.toastr.success(
          checked
            ? "Service category enabled successfully"
            : "Service category disabled successfully",
        );
      },

      error: (err: any) => {
        serviceCategory.status = previousStatus;

        this.toastr.error(
          err?.error?.message || "Failed to update service category status",
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
