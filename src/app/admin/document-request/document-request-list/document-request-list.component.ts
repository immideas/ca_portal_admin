
import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  Input,
} from "@angular/core";

import { FormsModule } from "@angular/forms";
import { HttpClientModule } from "@angular/common/http";
import { Router, RouterModule } from "@angular/router";
import { CommonModule } from "@angular/common";
import { ToastrService, ToastrModule } from "ngx-toastr";
import { MatDialog, MatDialogModule } from "@angular/material/dialog";
import { forkJoin, of } from "rxjs";
import { map, switchMap } from "rxjs/operators";

import { ConfirmDialogComponent } from "../../../confirm-dialog/confirm-dialog.component";
import { ThreeDotsButtonComponent } from "../../../shared/three-dots-button/three-dots-button.component";
import { PopupMenuComponent } from "../../../shared/popup-menu/popup-menu.component";
import { PopupMenuItem } from "../../../shared/popup-menu/popup-menu.model";
import {
  PaginationFooterComponent,
  PageChangeEvent,
} from "../../../shared/pagination-footer/pagination-footer.component";
import { DragDropModule } from "@angular/cdk/drag-drop";
import { CdkDragDrop } from "@angular/cdk/drag-drop";
import { NgxUiLoaderModule } from "ngx-ui-loader";
import { DocumentRequestService } from "../../../services/document-request.service";

interface KanbanColumn {
  title: string;
  statuses: string[];
  color: string;
}

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
      DragDropModule,
  ],
})
export class DocumentRequestListComponent implements OnInit, OnDestroy {
  @Input() serviceId!: number;

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
testColumnByRequestId: Record<string, string> = {};
  // Default view
  viewMode: "board" | "list" = "board";

  // Parent request statuses only
readonly kanbanColumns: KanbanColumn[] = [
  {
    title: "To Collect",
    statuses: ["REQUESTED", "PARTIALLY_UPLOADED"],
    color: "new",
  },
  {
    title: "In Progress",
    statuses: ["UPLOADED"],
    color: "pending",
  },

  {
    title: "Client Action Required",
    statuses: ["RESUBMISSION_REQUIRED"],
    color: "action",
  },
  {
    title: "Payment Pending",
    statuses: ["PAYMENT_DUE"],
    color: "payment",
  },
  {
    title: "Completed",
    statuses: ["COMPLETED"],
    color: "completed",
  },
];

  constructor(
    private router: Router,
    private toastr: ToastrService,
    private dialog: MatDialog,
    private documentRequestService: DocumentRequestService,
  ) {}

  ngOnInit(): void {
    this.fetchDocumentRequests();
  }

  ngOnDestroy(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = null;
    }
  }

  @HostListener("document:keydown.escape")
  onEscape(): void {
    this.closeMenu();
  }

  // ================= VIEW TOGGLE =================

  setViewMode(mode: "board" | "list"): void {
    if (this.viewMode === mode) return;

    this.viewMode = mode;
    this.currentPage = 1;
    this.fetchDocumentRequests();
  }

  // ================= ACTION MENU =================

  get actionItems(): PopupMenuItem[] {
    const request = this.selectedDocumentRequest;

    if (!request) return [];

    const items: PopupMenuItem[] = [
      { id: "view", label: "View" },
      {
        id: "submitted-documents",
        label: "Submitted Documents",
      },
    ];

    if (
      request.status !== "COMPLETED" &&
      request.status !== "PAYMENT_DUE" &&
      request.status !== "CANCELLED"
    ) {
      items.push({
        id: "edit",
        label: "Edit",
      });
    }

    if (
      request.status !== "CANCELLED" &&
      request.status !== "COMPLETED"
    ) {
      items.push({
        id: "cancel",
        label: "Cancel Request",
        variant: "danger",
      });
    }

    return items;
  }

  // ================= API RESPONSE HELPERS =================

  private extractRows(response: any): any[] {
    if (Array.isArray(response?.data)) {
      return response.data;
    }

    if (Array.isArray(response?.data?.rows)) {
      return response.data.rows;
    }

    if (Array.isArray(response)) {
      return response;
    }

    return [];
  }

  private buildListPayload(page: number, limit: number): any {
    const payload: any = {
      search: this.search.trim(),
      page,
      limit,
    };

    if (this.serviceId) {
      payload.serviceId = this.serviceId;
    }

    return payload;
  }

  // ================= FETCH REQUESTS =================

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

    // List view: normal server-side pagination
    if (this.viewMode === "list") {
      this.documentRequestService
        .list(
          this.buildListPayload(this.currentPage, this.pageSize),
        )
        .subscribe({
          next: (response: any) => {
            const rows = this.extractRows(response);

            this.documentRequests = rows;
            this.filteredDocumentRequests = rows;

            this.totalItems =
              response?.totalItems ??
              response?.total ??
              rows.length;

            this.loading = false;
          },
          error: (error: any) => {
            this.handleFetchError(error);
          },
        });

      return;
    }

    // Board view: load matching pages for all columns
    const boardPageSize = 100;

    this.documentRequestService
      .list(this.buildListPayload(1, boardPageSize))
      .pipe(
        switchMap((firstResponse: any) => {
          const firstRows = this.extractRows(firstResponse);

          const totalItems = Number(
            firstResponse?.totalItems ??
              firstResponse?.total ??
              firstRows.length,
          );

          const totalPages = Math.max(
            1,
            Number(
              firstResponse?.totalPages ??
                Math.ceil(totalItems / boardPageSize),
            ),
          );

          if (totalPages <= 1) {
            return of(firstRows);
          }

          const remainingCalls = Array.from(
            { length: totalPages - 1 },
            (_, index) =>
              this.documentRequestService.list(
                this.buildListPayload(index + 2, boardPageSize),
              ),
          );

          return forkJoin(remainingCalls).pipe(
            map((responses: any[]) => [
              ...firstRows,
              ...responses.flatMap((response) =>
                this.extractRows(response),
              ),
            ]),
          );
        }),
      )
      .subscribe({
        next: (rows: any[]) => {
          this.documentRequests = rows;
          this.filteredDocumentRequests = rows;
          this.totalItems = rows.length;
          this.loading = false;
        },
        error: (error: any) => {
          this.handleFetchError(error);
        },
      });
  }

  private handleFetchError(error: any): void {
    this.loading = false;

    console.error(
      "Error fetching document requests:",
      error,
    );

    if (
      error.status === 400 &&
      error.error?.error === "jwt expired"
    ) {
      this.toastr.error(
        "Session expired. Please log in again.",
      );

      localStorage.removeItem("token");
      this.router.navigate(["/login"]);
      return;
    }

    if (error.status === 401) {
      this.toastr.error(
        "Unauthorized access. Please log in again.",
      );

      localStorage.removeItem("token");

      this.router.navigate(["/login"]).then(() => {
        window.location.reload();
      });

      return;
    }

    this.toastr.error(
      error?.error?.message ||
        "Failed to fetch service requests",
      "Error",
    );
  }

  // ================= SEARCH =================

  onSearchChange(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    this.searchTimeout = setTimeout(() => {
      this.currentPage = 1;
      this.fetchDocumentRequests();
    }, 400);
  }

  resetFilter(): void {
    this.search = "";
    this.currentPage = 1;
    this.fetchDocumentRequests();
  }

  // ================= LIST PAGINATION =================

  onPageChange(event: PageChangeEvent | any): void {
    if (
      event &&
      typeof event === "object" &&
      "page" in event
    ) {
      this.currentPage = event.page;
      this.pageSize = event.pageSize;
    } else {
      this.currentPage = event;
    }

    this.fetchDocumentRequests();
  }

  onPageSizeChange(event: Event): void {
    const selectElement =
      event.target as HTMLSelectElement;

    this.pageSize = Number(selectElement.value);
    this.currentPage = 1;

    this.fetchDocumentRequests();
  }

  // ================= KANBAN HELPERS =================

getRequestsForColumn(column: KanbanColumn): any[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return this.filteredDocumentRequests.filter((request: any) => {
    const status = String(
      request.status || "REQUESTED"
    ).toUpperCase();

    const temporaryColumn =
      this.testColumnByRequestId[String(request.id)];

    // Use the temporary destination after a drag.
    const belongsToColumn = temporaryColumn
      ? temporaryColumn === column.title
      : column.statuses.includes(status);

    if (!belongsToColumn) {
      return false;
    }

    // Preserve the existing same-day/future due-date rule.
    if (!request.dueDate) {
      return false;
    }

    const dueDate = new Date(request.dueDate);

    if (Number.isNaN(dueDate.getTime())) {
      return false;
    }

    dueDate.setHours(0, 0, 0, 0);

    return dueDate.getTime() >= today.getTime();
  });
}
// ================= TEST-ONLY DROP HANDLER =================

dropTestRequest(event: CdkDragDrop<KanbanColumn>): void {
  const request = event.item.data as any;
  const targetColumn = event.container.data;

  if (!request || !targetColumn) {
    return;
  }

  // Record only the temporary visual destination.
  this.testColumnByRequestId[String(request.id)] =
    targetColumn.title;

  // Intentionally do not modify request.status.
  // Intentionally do not call the API.
}
getDueLabel(request: any): string {
  if (!request.dueDate) {
    return "No due date";
  }

  const dueDate = new Date(request.dueDate);
  const today = new Date();

  dueDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const days = Math.round(
    (dueDate.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24)
  );

  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";

  return `Due in ${days} days`;
}
  getColumnCount(column: KanbanColumn): number {
    return this.getRequestsForColumn(column).length;
  }

  getClientName(request: any): string {
    return (
      request.client?.clientName ||
      request.clientName ||
      request.client?.name ||
      "—"
    );
  }

  getServiceName(request: any): string {
    return (
      request.service?.serviceName ||
      request.serviceName ||
      request.service?.name ||
      "—"
    );
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      REQUESTED: "New Request",
      PARTIALLY_UPLOADED: "Documents Pending",
      UPLOADED: "Documents Submitted",
      UNDER_VERIFICATION: "Awaiting Review",
      RESUBMISSION_REQUIRED: "Action Required",
      PAYMENT_DUE: "Payment Pending",
      COMPLETED: "Completed",
      CANCELLED: "Cancelled",
    };

    return (
      labels[
        String(status || "REQUESTED").toUpperCase()
      ] || status
    );
  }

  getDocumentItems(request: any): any[] {
    return Array.isArray(request.items)
      ? request.items
      : [];
  }

  getUploadedCount(request: any): number {
    return this.getDocumentItems(request).filter(
      (item: any) =>
        [
          "UPLOADED",
          "UNDER_VERIFICATION",
          "APPROVED",
        ].includes(
          String(item.status || "").toUpperCase(),
        ),
    ).length;
  }

  getDocumentProgress(request: any): number {
    const items = this.getDocumentItems(request);

    if (!items.length) return 0;

    return Math.round(
      (this.getUploadedCount(request) /
        items.length) *
        100,
    );
  }

  getPriorityClass(priority: string): string {
    return `priority-${String(
      priority || "MEDIUM",
    ).toLowerCase()}`;
  }

  getItemStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      PENDING: "Pending Upload",
      UPLOADED: "Uploaded",
      UNDER_VERIFICATION: "Awaiting Review",
      APPROVED: "Approved",
      REJECTED: "Rejected",
      RESUBMISSION_REQUIRED: "Re-upload Required",
    };

    return (
      labels[
        String(status || "PENDING").toUpperCase()
      ] || status
    );
  }

  trackByRequestId(
    index: number,
    request: any,
  ): number {
    return request.id;
  }

  // ================= POPUP MENU =================

  openMenu(
    documentRequest: any,
    event: MouseEvent,
  ): void {
    event.stopPropagation();

    if (this.activeMenuId === documentRequest.id) {
      this.closeMenu();
      return;
    }

    this.selectedDocumentRequest = documentRequest;
    this.activeMenuId = documentRequest.id;

    const targetElement =
      event.currentTarget as HTMLElement;

    if (!targetElement) return;

    const rect =
      targetElement.getBoundingClientRect();

    const menuWidth = 220;
    const menuHeight = 160;
    const showAbove =
      window.innerHeight - rect.bottom < menuHeight;

    this.menuPopupPosition = {
      top: showAbove
        ? rect.top + window.scrollY - menuHeight
        : rect.bottom + window.scrollY,
      left: rect.right - menuWidth,
    };
  }

  closeMenu(): void {
    this.menuPopupPosition = null;
    this.activeMenuId = null;
    this.selectedDocumentRequest = null;
  }

  onMenuItemClick(item: PopupMenuItem): void {
    if (!this.selectedDocumentRequest) return;

    const id = this.selectedDocumentRequest.id;

    this.closeMenu();

    switch (item.id) {
      case "view":
        this.viewDocumentRequest(id);
        break;

      case "submitted-documents":
        this.viewSubmittedDocuments(id);
        break;

      case "edit":
        this.editDocumentRequest(id);
        break;

      case "cancel":
        this.cancelDocumentRequest(id);
        break;
    }
  }

  // ================= NAVIGATION =================

  addDocumentRequest(): void {
    this.router.navigate(["/add-service-request"]);
  }

  editDocumentRequest(
    id: string | number,
  ): void {
    const request = this.documentRequests.find(
      (item: any) =>
        Number(item.id) === Number(id),
    );

    if (
      request?.status === "COMPLETED" ||
      request?.status === "PAYMENT_DUE" ||
      request?.status === "CANCELLED"
    ) {
      this.toastr.info(
        "This service request cannot be edited in its current status.",
      );
      return;
    }

    this.router.navigate([
      "/edit-service-request",
      id,
    ]);
  }

  viewDocumentRequest(
    id: string | number,
  ): void {
    this.router.navigate(
      ["/view-service-request", id],
      {
        queryParams: {
          viewMode: "true",
        },
      },
    );
  }

  viewSubmittedDocuments(
    id: string | number,
  ): void {
    this.router.navigate([
      "/submitted-documents",
      id,
    ]);
  }

  cancelDocumentRequest(
    id: string | number,
  ): void {
    const dialogRef = this.dialog.open(
      ConfirmDialogComponent,
      {
        width: "450px",
        disableClose: true,
        data: {
          message:
            "Are you sure you want to cancel this service request?",
        },
      },
    );

    dialogRef
      .afterClosed()
      .subscribe((confirmed: boolean) => {
        if (!confirmed) return;

        // Cancellation API is not currently connected.
        this.toastr.info(
          "Cancel API is not connected yet.",
          "Information",
        );
      });
  }

  logout(): void {
    this.isLoggingOut = true;

    localStorage.removeItem("token");
    this.router.navigate(["/login"]);

    this.toastr.info("Logged out successfully.");
  }
}
