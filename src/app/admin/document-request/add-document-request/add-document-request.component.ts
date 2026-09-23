import {
  Component,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";

import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";

import { HttpClientModule } from "@angular/common/http";

import { NgxUiLoaderModule, NgxUiLoaderService } from "ngx-ui-loader";

import { ToastrModule, ToastrService } from "ngx-toastr";

import { forkJoin, Observable } from "rxjs";

import { MatDialog, MatDialogModule } from "@angular/material/dialog";

import { ConfirmDialogComponent } from "../../../confirm-dialog/confirm-dialog.component";

import { ClientService } from "../../../services/client.service";
import { ClientServiceService } from "../../../services/client-service.service";
import { DocumentService } from "../../../services/document.service";
import { DocumentGroupService } from "../../../services/document-group.service";
import { DocumentRequestService } from "../../../services/document-request.service";
import { UserService } from "../../../services/user.service";
import { ServiceService } from "../../../services/service.service";

@Component({
  selector: "app-add-document-request",
  standalone: true,

  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormsModule,
    HttpClientModule,
    NgxUiLoaderModule,
    ToastrModule,
    MatDialogModule,
  ],

  templateUrl: "./add-document-request.component.html",
  styleUrl: "./add-document-request.component.css",
})
export class AddDocumentRequestComponent implements OnInit {
  documentRequestForm: FormGroup;

  submitted = false;
  isSaving = false;

  // =====================================================
  // ADD / EDIT / VIEW MODE
  // =====================================================

  isViewMode = false;
  isEditMode = false;

  documentRequestId: number | null = null;

  // =====================================================
  // CLIENTS
  // =====================================================

  clients: any[] = [];
  loadingClients = false;

  // =====================================================
  // CLIENT SERVICES
  // =====================================================

  services: any[] = [];
  loadingServices = false;

  /*
   * SERVICE MULTI-SELECT DROPDOWN (search + open state)
   */
  isServiceDropdownOpen = false;
  serviceSearchText = "";

  /*
   * Reference to the dropdown trigger element, used to
   * compute where the panel should float on screen.
   */
  @ViewChild("serviceTrigger")
  serviceTriggerRef?: ElementRef<HTMLElement>;

  servicePanelStyle: Record<string, string> = {};

  // =====================================================
  // STAFF
  // =====================================================

  staff: any[] = [];
  reviewers: any[] = [];

  loadingStaff = false;

  requiredDocuments: any[] = [];

  additionalDocuments: any[] = [];

  additionalDocSearchText = "";

  isAdditionalDocsExpanded = true;

  selectedDocumentIds: number[] = [];

  documents: any[] = [];

  loadingDocuments = false;
  loadingAdditionalDocuments = false;

  // =====================================================
  // MULTI SERVICE SELECTION
  // =====================================================

  selectedServices: any[] = [];

  selectedServiceIds: number[] = [];

  // =====================================================
  // SELECTED CLIENT SERVICE
  // =====================================================

  /*
   * Primary service.
   *
   * Kept because existing backend requires:
   *
   * clientServiceId
   * serviceId
   *
   * requestServices contains all selected services.
   */

  selectedClientServiceId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,

    private elementRef: ElementRef,

    private ngxLoader: NgxUiLoaderService,
    private toastr: ToastrService,

    private dialog: MatDialog,

    private clientService: ClientService,
    private clientServiceService: ClientServiceService,
    private documentService: DocumentService,
    private documentGroupService: DocumentGroupService,
    private documentRequestService: DocumentRequestService,
    private userService: UserService,
    private serviceService: ServiceService,
  ) {
    this.documentRequestForm = this.fb.group({
      // =================================================
      // REQUEST INFORMATION
      // =================================================

      taskName: [
        "",
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(255),
        ],
      ],

      clientId: [null, Validators.required],

      /*
       * Primary service.
       *
       * Multiple services are actually stored in:
       * selectedServices / requestServices
       */
      serviceId: [null, Validators.required],

      // =================================================
      // ASSIGNMENT
      // =================================================

      assignedTo: [null, Validators.required],

      reviewerId: [null],

      // =================================================
      // REQUEST DETAILS
      // =================================================

      priority: ["MEDIUM", Validators.required],

      period: ["", [Validators.maxLength(100)]],

      dueDate: [null],
    });
  }

  // =====================================================
  // INIT
  // =====================================================

  ngOnInit(): void {
    this.loadClients();

    this.loadUsers();

    // =================================================
    // ROUTE ID -> EDIT MODE
    // =================================================

    this.route.paramMap.subscribe((params) => {
      const id = params.get("id");

      if (id) {
        const numericId = Number(id);

        if (Number.isInteger(numericId) && numericId > 0) {
          this.isEditMode = true;

          this.documentRequestId = numericId;

          this.loadDocumentRequest(numericId);
        }
      }
    });

    // =================================================
    // QUERY PARAM -> VIEW MODE
    // =================================================

    this.route.queryParamMap.subscribe((queryParams) => {
      this.isViewMode = queryParams.get("viewMode") === "true";

      this.applyViewMode();
    });
  }

  // =====================================================
  // APPLY VIEW MODE
  // =====================================================

  private applyViewMode(): void {
    if (this.isViewMode) {
      this.documentRequestForm.disable();
    } else {
      this.documentRequestForm.enable();
    }
  }

  // =====================================================
  // ENABLE EDIT MODE
  // =====================================================

  enableEditMode(): void {
    this.isViewMode = false;

    this.documentRequestForm.enable();

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        viewMode: null,
      },
      queryParamsHandling: "merge",
    });
  }

  // =====================================================
  // LOAD DOCUMENT REQUEST
  // =====================================================

  loadDocumentRequest(id: number): void {
    this.ngxLoader.start();

    this.documentRequestService.getById(id).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();

        console.log("DOCUMENT REQUEST RAW RESPONSE:", response);

        if (!response?.success) {
          console.error("API returned success=false:", response);

          return;
        }

        // =================================================
        // GET REQUEST
        // =================================================

        const request =
          response?.data?.documentRequest ||
          (Array.isArray(response?.data) ? response.data[0] : null);

        if (!request) {
          console.error("Document request data not found:", response);

          return;
        }

        console.log("EDIT REQUEST:", request);

        // =================================================
        // GET DOCUMENT REQUEST ITEMS
        // =================================================

        const requestItems = Array.isArray(response?.data?.items)
          ? response.data.items
          : Array.isArray(request?.items)
            ? request.items
            : Array.isArray(request?.documentRequestItems)
              ? request.documentRequestItems
              : Array.isArray(response?.data)
                ? response.data[0]?.items || []
                : [];

        console.log("REQUEST ITEMS:", requestItems);

        // =================================================
        // PATCH FORM
        // =================================================

        this.documentRequestForm.patchValue({
          taskName: request.taskName ?? "",

          clientId: request.clientId ?? null,

          serviceId: request.serviceId ?? null,

          assignedTo: request.assignedTo ?? null,

          reviewerId: request.reviewerId ?? null,

          priority: request.priority ?? "MEDIUM",

          period: request.period ?? "",

          dueDate: request.dueDate ?? null,
        });

        // =================================================
        // LOAD SAVED REQUEST SERVICES
        // =================================================

        let savedRequestServices: any[] = [];

        if (Array.isArray(request.requestServices)) {
          savedRequestServices = request.requestServices;
        } else if (typeof request.requestServices === "string") {
          try {
            const parsed = JSON.parse(request.requestServices);

            savedRequestServices = Array.isArray(parsed) ? parsed : [];
          } catch {
            savedRequestServices = [];
          }
        }

        // =================================================
        // OLD RECORD SUPPORT
        // =================================================

        if (savedRequestServices.length === 0 && request.serviceId) {
          savedRequestServices = [
            {
              clientServiceId: Number(request.clientServiceId),

              serviceId: Number(request.serviceId),
            },
          ];
        }

        // =================================================
        // SAVE TEMP SELECTED SERVICE IDS
        // =================================================

        this.selectedServiceIds = savedRequestServices
          .map((item: any) => Number(item.serviceId))
          .filter((id: number) => Number.isInteger(id) && id > 0);

        // =================================================
        // SELECTED CLIENT SERVICE
        // =================================================

        this.selectedClientServiceId = request.clientServiceId
          ? Number(request.clientServiceId)
          : savedRequestServices.length > 0
            ? Number(savedRequestServices[0].clientServiceId)
            : null;

        // =================================================
        // SELECTED DOCUMENTS
        // =================================================

        this.selectedDocumentIds = requestItems
          .map((item: any) => Number(item.documentId))
          .filter(
            (documentId: number) =>
              Number.isInteger(documentId) && documentId > 0,
          );

        this.selectedDocumentIds = Array.from(
          new Set(this.selectedDocumentIds),
        );

        console.log("PATCHED DOCUMENT IDS:", this.selectedDocumentIds);

        // =================================================
        // LOAD CLIENT SERVICES
        // =================================================

        if (request.clientId) {
          this.loadClientServices(Number(request.clientId));
        }

        this.applyViewMode();
      },

      error: (error: any) => {
        this.ngxLoader.stop();

        console.error("DOCUMENT REQUEST GET API ERROR:", error);

        this.toastr.error(
          error?.error?.message || "Failed to fetch document request",
          "Error",
        );
      },
    });
  }

  // =====================================================
  // LOAD CLIENTS
  // =====================================================

  loadClients(): void {
    this.loadingClients = true;

    this.clientService.listAllClients({}).subscribe({
      next: (response: any) => {
        this.loadingClients = false;

        if (response?.success) {
          this.clients = Array.isArray(response.data) ? response.data : [];
        } else {
          this.clients = Array.isArray(response?.data)
            ? response.data
            : Array.isArray(response)
              ? response
              : [];
        }
      },

      error: (err: any) => {
        this.loadingClients = false;

        console.error("Failed to load clients:", err);

        this.toastr.error(
          err?.error?.message || "Failed to load clients",
          "Error",
        );
      },
    });
  }

  // =====================================================
  // LOAD USERS
  // =====================================================

  loadUsers(): void {
    this.loadingStaff = true;

    this.userService.getAllUsers({}).subscribe({
      next: (response: any) => {
        this.loadingStaff = false;

        let users: any[] = [];

        if (response?.success) {
          users = Array.isArray(response.data) ? response.data : [];
        } else {
          users = Array.isArray(response?.data)
            ? response.data
            : Array.isArray(response)
              ? response
              : [];
        }

        this.staff = users;

        this.reviewers = users;
      },

      error: (err: any) => {
        this.loadingStaff = false;

        console.error("Failed to load users:", err);

        this.toastr.error(
          err?.error?.message || "Failed to load staff",
          "Error",
        );
      },
    });
  }

  // =====================================================
  // CLIENT CHANGE
  // =====================================================

  onClientChange(): void {
    if (this.isViewMode) {
      return;
    }

    const clientId = this.documentRequestForm.get("clientId")?.value;

    // =================================================
    // CLEAR SERVICE
    // =================================================

    this.documentRequestForm.patchValue({
      serviceId: null,
    });

    this.selectedClientServiceId = null;

    // =================================================
    // CLEAR SERVICES
    // =================================================

    this.services = [];

    this.selectedServices = [];

    this.selectedServiceIds = [];

    this.serviceSearchText = "";

    this.isServiceDropdownOpen = false;

    // =================================================
    // CLEAR DOCUMENTS
    // =================================================

    this.documents = [];

    this.requiredDocuments = [];

    this.additionalDocuments = [];

    this.additionalDocSearchText = "";

    this.selectedDocumentIds = [];

    if (!clientId) {
      return;
    }

    this.loadClientServices(Number(clientId));
  }

  // =====================================================
  // LOAD CLIENT SERVICES
  // =====================================================

  loadClientServices(clientId: number): void {
    this.loadingServices = true;

    this.clientServiceService.getClientServices(clientId).subscribe({
      next: (response: any) => {
        this.loadingServices = false;

        if (!response?.success) {
          this.services = [];

          this.toastr.error(
            response?.message || "Failed to load assigned services",
            "Error",
          );

          return;
        }

        const assignments = Array.isArray(response.data) ? response.data : [];

        this.services = assignments;

        // =================================================
        // EDIT MODE
        // =================================================

        if (this.isEditMode && this.selectedServiceIds.length > 0) {
          this.selectedServices = this.selectedServiceIds
            .map((serviceId: number) =>
              this.services.find(
                (item: any) => Number(item.serviceId) === Number(serviceId),
              ),
            )
            .filter(Boolean);

          this.syncPrimaryService();

          this.loadSelectedServiceDocuments();
        }
      },

      error: (err: any) => {
        this.loadingServices = false;

        console.error("Failed to load client services:", err);

        this.toastr.error(
          err?.error?.message || "Failed to load assigned services",
          "Error",
        );
      },
    });
  }

  // =====================================================
  // SERVICE MULTI-SELECT DROPDOWN
  // =====================================================

  /*
   * Services filtered by the search box inside the dropdown
   * panel. Matches against whichever name field is present.
   */
  get filteredServices(): any[] {
    const query = this.serviceSearchText.trim().toLowerCase();

    if (!query) {
      return this.services;
    }

    return this.services.filter((service: any) => {
      const name = String(
        service.serviceName ||
          service.service?.serviceName ||
          service.name ||
          "",
      ).toLowerCase();

      return name.includes(query);
    });
  }

  toggleServiceDropdown(): void {
    if (this.isViewMode || !this.documentRequestForm.get("clientId")?.value) {
      return;
    }

    const opening = !this.isServiceDropdownOpen;

    if (opening) {
      /*
       * Compute position BEFORE flipping the flag, so the
       * panel never renders (even for a single frame) at
       * the wrong spot.
       */
      this.positionServicePanel();

      this.serviceSearchText = "";
    }

    this.isServiceDropdownOpen = opening;
  }

  closeServiceDropdown(): void {
    this.isServiceDropdownOpen = false;
  }

  /*
   * Reads the trigger's current on-screen position and
   * turns it into fixed-position coordinates for the panel.
   * Using position: fixed (viewport-relative) instead of
   * position: absolute (ancestor-relative) is what lets the
   * dropdown escape a parent card's overflow: hidden instead
   * of being clipped at the card's edge.
   */
  private positionServicePanel(): void {
    const triggerEl = this.serviceTriggerRef?.nativeElement;

    if (!triggerEl) {
      return;
    }

    const rect = triggerEl.getBoundingClientRect();

    const gap = 6;

    /*
     * Flip the panel above the trigger if there isn't
     * enough room below it in the viewport.
     */
    const estimatedPanelHeight = 300;

    const spaceBelow = window.innerHeight - rect.bottom;

    const openUpwards =
      spaceBelow < estimatedPanelHeight && rect.top > spaceBelow;

    this.servicePanelStyle = openUpwards
      ? {
          position: "fixed",
          left: `${rect.left}px`,
          width: `${rect.width}px`,
          bottom: `${window.innerHeight - rect.top + gap}px`,
        }
      : {
          position: "fixed",
          left: `${rect.left}px`,
          width: `${rect.width}px`,
          top: `${rect.bottom + gap}px`,
        };
  }

  /*
   * Keep the panel glued to the trigger while the page
   * scrolls or the window resizes, instead of drifting away
   * from the field it belongs to.
   */
  @HostListener("window:scroll")
  @HostListener("window:resize")
  onWindowScrollOrResize(): void {
    if (this.isServiceDropdownOpen) {
      this.positionServicePanel();
    }
  }

  clearAllServices(): void {
    if (this.isViewMode) {
      return;
    }

    this.selectedServices = [];

    this.selectedServiceIds = [];

    this.syncPrimaryService();

    this.loadSelectedServiceDocuments();
  }

  /*
   * Closes the service dropdown when the user clicks
   * anywhere outside of this component (e.g. another
   * field, or the page background).
   */
  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isServiceDropdownOpen) {
      return;
    }

    const clickedInside = this.elementRef.nativeElement.contains(event.target);

    if (!clickedInside) {
      this.isServiceDropdownOpen = false;
    }
  }

  // =====================================================
  // SERVICE SELECTION
  // =====================================================

  isServiceSelected(serviceId: number): boolean {
    return this.selectedServiceIds.includes(Number(serviceId));
  }

  // =====================================================
  // SELECT / UNSELECT SERVICE
  // =====================================================

  toggleService(assignment: any): void {
    if (this.isViewMode || !assignment) {
      return;
    }

    const serviceId = Number(assignment.serviceId);

    const clientServiceId = Number(assignment.id);

    if (!Number.isInteger(serviceId) || serviceId <= 0) {
      return;
    }

    const index = this.selectedServiceIds.indexOf(serviceId);

    // =================================================
    // REMOVE SERVICE
    // =================================================

    if (index >= 0) {
      this.selectedServiceIds = this.selectedServiceIds.filter(
        (id) => id !== serviceId,
      );

      this.selectedServices = this.selectedServices.filter(
        (item: any) => Number(item.serviceId) !== serviceId,
      );
    }

    // =================================================
    // ADD SERVICE
    // =================================================
    else {
      this.selectedServiceIds.push(serviceId);

      this.selectedServices.push({
        ...assignment,

        serviceId,

        id: clientServiceId,
      });
    }

    // =================================================
    // PRIMARY SERVICE
    // =================================================

    this.syncPrimaryService();

    // =================================================
    // LOAD REQUIRED DOCUMENTS
    // =================================================

    this.loadSelectedServiceDocuments();
  }

  // =====================================================
  // REMOVE SELECTED SERVICE
  // =====================================================

  removeSelectedService(serviceId: number): void {
    if (this.isViewMode) {
      return;
    }

    const numericServiceId = Number(serviceId);

    this.selectedServiceIds = this.selectedServiceIds.filter(
      (id) => id !== numericServiceId,
    );

    this.selectedServices = this.selectedServices.filter(
      (item: any) => Number(item.serviceId) !== numericServiceId,
    );

    this.syncPrimaryService();

    this.loadSelectedServiceDocuments();
  }

  // =====================================================
  // PRIMARY SERVICE
  // =====================================================

  private syncPrimaryService(): void {
    const primaryService = this.selectedServices[0];

    if (!primaryService) {
      this.selectedClientServiceId = null;

      this.documentRequestForm.patchValue({
        serviceId: null,
      });

      return;
    }

    this.selectedClientServiceId = Number(primaryService.id);

    this.documentRequestForm.patchValue({
      serviceId: Number(primaryService.serviceId),
    });
  }

  // =====================================================
  // OLD SINGLE SERVICE SUPPORT
  // =====================================================

  onServiceChange(): void {
    if (this.isViewMode) {
      return;
    }

    const serviceId = this.documentRequestForm.get("serviceId")?.value;

    if (!serviceId) {
      this.selectedServices = [];

      this.selectedServiceIds = [];

      this.selectedClientServiceId = null;

      this.requiredDocuments = [];

      this.documents = [];

      this.additionalDocuments = [];

      this.selectedDocumentIds = [];

      return;
    }

    const numericServiceId = Number(serviceId);

    const selectedAssignment = this.services.find(
      (item: any) => Number(item.serviceId) === numericServiceId,
    );

    if (!selectedAssignment) {
      this.toastr.error(
        "Selected service is not assigned to this client.",
        "Error",
      );

      return;
    }

    this.selectedServices = [selectedAssignment];

    this.selectedServiceIds = [numericServiceId];

    this.selectedClientServiceId = Number(selectedAssignment.id);

    this.loadSelectedServiceDocuments();
  }

  // =====================================================
  // LOAD REQUIRED DOCUMENTS
  // =====================================================

  private loadSelectedServiceDocuments(): void {
    this.loadingDocuments = true;

    this.requiredDocuments = [];

    this.documents = [];

    if (this.selectedServiceIds.length === 0) {
      this.loadingDocuments = false;

      this.additionalDocuments = [];

      return;
    }

    // =================================================
    // LOAD DOCUMENT GROUPS FOR ALL SELECTED SERVICES
    // =================================================

    const documentRequests = this.selectedServiceIds.map((serviceId) =>
      this.getServiceDocuments(serviceId),
    );

    forkJoin(documentRequests).subscribe({
      next: (results: any[][]) => {
        const allRequiredDocuments = results.flat();

        // =================================================
        // REMOVE DUPLICATES
        //
        // Two (or more) selected services can both require
        // the same document (e.g. "Aadhaar"). We key this
        // Map by document.id, so whichever service listed
        // it first "wins" and it only appears once in
        // requiredDocuments below.
        // =================================================

        const uniqueRequiredDocuments = Array.from(
          new Map(
            allRequiredDocuments.map((document: any) => [
              Number(document.id),

              document,
            ]),
          ).values(),
        );

        // =================================================
        // SORT
        // =================================================

        uniqueRequiredDocuments.sort((a: any, b: any) => {
          const mandatoryA = a.isMandatory ? 1 : 0;

          const mandatoryB = b.isMandatory ? 1 : 0;

          if (mandatoryA !== mandatoryB) {
            return mandatoryB - mandatoryA;
          }

          return String(a.documentName || "").localeCompare(
            String(b.documentName || ""),
          );
        });

        // =================================================
        // REQUIRED DOCUMENTS
        // =================================================

        this.requiredDocuments = uniqueRequiredDocuments;

        /*
         * Keep compatibility with existing HTML
         * which may use "documents".
         */
        this.documents = uniqueRequiredDocuments;

        // =================================================
        // REQUIRED DOCUMENT IDS
        // =================================================

        const requiredIds = uniqueRequiredDocuments
          .map((document: any) => Number(document.id))
          .filter((id: number) => Number.isInteger(id) && id > 0);

        // =================================================
        // AUTOMATICALLY SELECT REQUIRED DOCUMENTS
        // =================================================

        this.selectedDocumentIds = Array.from(
          new Set([...this.selectedDocumentIds, ...requiredIds]),
        );

        // =================================================
        // CLEAN IDS
        // =================================================

        this.selectedDocumentIds = Array.from(
          new Set(
            this.selectedDocumentIds
              .map(Number)
              .filter((id) => Number.isInteger(id) && id > 0),
          ),
        );

        this.loadingDocuments = false;

        // =================================================
        // LOAD ALL ADDITIONAL DOCUMENTS
        // =================================================

        this.loadAdditionalDocuments();
      },

      error: (err: any) => {
        this.loadingDocuments = false;

        console.error("Failed to load required documents:", err);

        this.toastr.error(
          err?.error?.message || "Failed to load required documents",
          "Error",
        );
      },
    });
  }

  // =====================================================
  // GET DOCUMENTS FOR ONE SERVICE
  // =====================================================

  private getServiceDocuments(serviceId: number): Observable<any[]> {
    return new Observable((subscriber) => {
      this.serviceService.getDocumentGroups(serviceId).subscribe({
        next: (serviceResponse: any) => {
          if (!serviceResponse?.success || !serviceResponse?.data) {
            subscriber.next([]);

            subscriber.complete();

            return;
          }

          const service = serviceResponse.data;

          // =================================================
          // SERVICE DOCUMENT GROUPS
          // =================================================

          const documentGroups: string[] = Array.isArray(service.documentGroups)
            ? service.documentGroups
                .filter(
                  (groupCode: any) =>
                    typeof groupCode === "string" && groupCode.trim(),
                )
                .map((groupCode: string) => groupCode.trim().toUpperCase())
            : [];

          const uniqueGroupCodes = Array.from(new Set(documentGroups));

          if (uniqueGroupCodes.length === 0) {
            subscriber.next([]);

            subscriber.complete();

            return;
          }

          // =================================================
          // LOAD ACTIVE DOCUMENT GROUP MASTER
          // =================================================

          this.documentGroupService.getActiveDocumentGroups().subscribe({
            next: (groupResponse: any) => {
              if (
                !groupResponse?.success ||
                !Array.isArray(groupResponse.data)
              ) {
                subscriber.next([]);

                subscriber.complete();

                return;
              }

              const documentGroupMaster = groupResponse.data;

              // =================================================
              // CONVERT GROUP CODE -> GROUP ID
              // =================================================

              const groupIds = uniqueGroupCodes
                .map((groupCode: string) => {
                  const group = documentGroupMaster.find(
                    (item: any) =>
                      String(item.groupCode).trim().toUpperCase() === groupCode,
                  );

                  return group ? Number(group.id) : null;
                })
                .filter(
                  (id): id is number =>
                    id !== null && Number.isInteger(id) && id > 0,
                );

              if (groupIds.length === 0) {
                subscriber.next([]);

                subscriber.complete();

                return;
              }

              // =================================================
              // LOAD DOCUMENTS FOR GROUP IDs
              // =================================================

              const requests = groupIds.map((groupId: number) =>
                this.documentService.getDocumentsByGroup(String(groupId)),
              );

              forkJoin(requests).subscribe({
                next: (responses: any[]) => {
                  const documents = responses.flatMap((response: any) =>
                    response?.success && Array.isArray(response.data)
                      ? response.data
                      : [],
                  );

                  subscriber.next(documents);

                  subscriber.complete();
                },

                error: (error: any) => subscriber.error(error),
              });
            },

            error: (error: any) => subscriber.error(error),
          });
        },

        error: (error: any) => subscriber.error(error),
      });
    });
  }

  // =====================================================
  // LOAD ALL DOCUMENT MASTER LIST
  // =====================================================

  private loadAdditionalDocuments(): void {
    this.loadingAdditionalDocuments = true;
    this.additionalDocSearchText = "";

    this.documentService.getAllDocumentMaster().subscribe({
      next: (response: any) => {
        console.log("ALL DOCUMENT MASTER RESPONSE:", response);

        this.loadingAdditionalDocuments = false;

        const allDocuments = Array.isArray(response?.data) ? response.data : [];

        console.log("ALL DOCUMENT MASTER COUNT:", allDocuments.length);

        console.log(
          "ALL DOCUMENT MASTER IDS:",
          allDocuments.map((document: any) => document.id),
        );

        // =================================================
        // REQUIRED DOCUMENT IDS
        // =================================================

        const requiredIds = new Set(
          this.requiredDocuments
            .map((document: any) => Number(document.id))
            .filter((id: number) => Number.isInteger(id) && id > 0),
        );

        console.log("REQUIRED DOCUMENT COUNT:", this.requiredDocuments.length);

        console.log("REQUIRED DOCUMENT IDS:", Array.from(requiredIds));

        // =================================================
        // ADDITIONAL DOCUMENTS
        // =================================================

        const seenAdditionalIds = new Set<number>();

        this.additionalDocuments = allDocuments
          .filter((document: any) => {
            const documentId = Number(document?.id);

            // Invalid document ID
            if (!Number.isInteger(documentId) || documentId <= 0) {
              return false;
            }

            // Already required
            if (requiredIds.has(documentId)) {
              return false;
            }

            // Duplicate
            if (seenAdditionalIds.has(documentId)) {
              return false;
            }

            seenAdditionalIds.add(documentId);

            return true;
          })
          .sort((a: any, b: any) =>
            String(a.documentName || "").localeCompare(
              String(b.documentName || ""),
            ),
          );

        console.log(
          "FINAL ADDITIONAL DOCUMENT COUNT:",
          this.additionalDocuments.length,
        );

        console.log("FINAL ADDITIONAL DOCUMENTS:", this.additionalDocuments);
      },

      error: (err: any) => {
        this.loadingAdditionalDocuments = false;

        this.additionalDocuments = [];

        console.error("FAILED TO LOAD ALL DOCUMENT MASTER:", err);

        this.toastr.error(
          err?.error?.message || "Failed to load additional documents",
          "Error",
        );
      },
    });
  }

  // =====================================================
  // BACKWARD COMPATIBLE SERVICE DOCUMENT METHOD
  // =====================================================

  loadServiceDocuments(serviceId: number): void {
    if (!serviceId) {
      return;
    }

    const assignment = this.services.find(
      (item: any) => Number(item.serviceId) === Number(serviceId),
    );

    if (assignment) {
      this.selectedServices = [assignment];

      this.selectedServiceIds = [Number(serviceId)];

      this.selectedClientServiceId = Number(assignment.id);
    }

    this.loadSelectedServiceDocuments();
  }

  // =====================================================
  // DOCUMENT SELECTION
  // =====================================================

  isDocumentSelected(documentId: number): boolean {
    return this.selectedDocumentIds.includes(Number(documentId));
  }

  // =====================================================
  // CHECK REQUIRED DOCUMENT
  // =====================================================

  isRequiredDocument(documentId: number): boolean {
    return this.requiredDocuments.some(
      (document: any) => Number(document.id) === Number(documentId),
    );
  }

  // =====================================================
  // ADDITIONAL DOCUMENTS: SEARCH FILTER
  // =====================================================

  get filteredAdditionalDocuments(): any[] {
    const query = this.additionalDocSearchText.trim().toLowerCase();

    if (!query) {
      return this.additionalDocuments;
    }

    return this.additionalDocuments.filter((document: any) => {
      const name = String(
        document.documentName || document.name || "",
      ).toLowerCase();

      const description = String(
        document.documentDescription || document.description || "",
      ).toLowerCase();

      return name.includes(query) || description.includes(query);
    });
  }

  // =====================================================
  // TOGGLE DOCUMENT
  // =====================================================

  toggleDocument(documentId: number): void {
    if (this.isViewMode) {
      return;
    }

    const numericDocumentId = Number(documentId);

    if (!Number.isInteger(numericDocumentId) || numericDocumentId <= 0) {
      return;
    }

    // =================================================
    // REQUIRED DOCUMENT
    // =================================================

    if (this.isRequiredDocument(numericDocumentId)) {
      /*
       * Required documents are automatically
       * included in the request.
       *
       * We don't allow removing them.
       */
      return;
    }

    // =================================================
    // ADDITIONAL DOCUMENT
    // =================================================

    if (this.selectedDocumentIds.includes(numericDocumentId)) {
      this.selectedDocumentIds = this.selectedDocumentIds.filter(
        (id) => id !== numericDocumentId,
      );
    } else {
      this.selectedDocumentIds.push(numericDocumentId);
    }
  }

  // =====================================================
  // SELECT ALL DOCUMENTS
  // =====================================================

  selectAllDocuments(): void {
    if (this.isViewMode) {
      return;
    }

    /*
     * Select all applies to the currently visible
     * (search-filtered) additional documents plus
     * everything already required, so a narrowed
     * search doesn't accidentally drop selections
     * made before the search was typed.
     */

    const allVisibleDocumentIds = [
      ...this.requiredDocuments,

      ...this.filteredAdditionalDocuments,
    ].map((document: any) => Number(document.id));

    this.selectedDocumentIds = Array.from(
      new Set(
        [...this.selectedDocumentIds, ...allVisibleDocumentIds].filter(
          (id) => Number.isInteger(id) && id > 0,
        ),
      ),
    );
  }

  // =====================================================
  // CLEAR ADDITIONAL DOCUMENTS
  // =====================================================

  clearAllDocuments(): void {
    if (this.isViewMode) {
      return;
    }

    /*
     * Required documents must remain selected.
     */

    const requiredIds = this.requiredDocuments.map((document: any) =>
      Number(document.id),
    );

    this.selectedDocumentIds = Array.from(new Set(requiredIds));
  }

  // =====================================================
  // TOGGLE ADDITIONAL DOCUMENTS CARD EXPAND / COLLAPSE
  // =====================================================

  toggleAdditionalDocsExpand(): void {
    this.isAdditionalDocsExpanded = !this.isAdditionalDocsExpanded;
  }

  // =====================================================
  // SAVE DOCUMENT REQUEST
  // =====================================================

  saveDocumentRequest(): void {
    if (this.isViewMode) {
      return;
    }

    this.submitted = true;

    // =================================================
    // FORM VALIDATION
    // =================================================

    if (this.documentRequestForm.invalid) {
      this.documentRequestForm.markAllAsTouched();

      this.toastr.error(
        "Please fill in all required fields correctly.",
        "Error",
      );

      return;
    }

    // =================================================
    // SERVICE VALIDATION
    // =================================================

    if (!this.selectedClientServiceId || this.selectedServices.length === 0) {
      this.toastr.error(
        "Please select at least one service assigned to this client.",
        "Error",
      );

      return;
    }

    // =================================================
    // DOCUMENT VALIDATION
    // =================================================

    if (this.selectedDocumentIds.length === 0) {
      this.toastr.error("Please select at least one document.", "Error");

      return;
    }

    const formValue = this.documentRequestForm.getRawValue();

    // =================================================
    // NORMALIZE SERVICES
    // =================================================

    const normalizedRequestServices = this.selectedServices

      .map((item: any) => ({
        clientServiceId: Number(item.id),

        serviceId: Number(item.serviceId),
      }))

      .filter(
        (item: any) =>
          Number.isInteger(item.clientServiceId) &&
          item.clientServiceId > 0 &&
          Number.isInteger(item.serviceId) &&
          item.serviceId > 0,
      );

    if (normalizedRequestServices.length === 0) {
      this.toastr.error(
        "Please select at least one service assigned to this client.",
        "Error",
      );

      return;
    }

    // =================================================
    // PAYLOAD
    // =================================================

    const payload: any = {
      taskName: formValue.taskName?.trim(),

      clientId: Number(formValue.clientId),

      /*
       * Primary service.
       *
       * Kept for old backend compatibility.
       */
      clientServiceId: Number(this.selectedClientServiceId),

      serviceId: Number(formValue.serviceId),

      /*
       * ALL selected services.
       */
      requestServices: normalizedRequestServices,

      assignedTo: Number(formValue.assignedTo),

      reviewerId: formValue.reviewerId ? Number(formValue.reviewerId) : null,

      priority: formValue.priority,

      period: formValue.period?.trim() || null,

      dueDate: formValue.dueDate || null,

      /*
       * Required + Additional documents.
       */
      documentIds: Array.from(
        new Set(
          this.selectedDocumentIds
            .map(Number)
            .filter((id) => Number.isInteger(id) && id > 0),
        ),
      ),
    };

    console.log("DOCUMENT REQUEST PAYLOAD:", payload);

    // =================================================
    // SAVE
    // =================================================

    this.isSaving = true;

    this.ngxLoader.start();

    // =================================================
    // UPDATE
    // =================================================

    if (this.isEditMode && this.documentRequestId) {
      payload.id = this.documentRequestId;

      this.documentRequestService.update(payload).subscribe({
        next: (response: any) => {
          this.ngxLoader.stop();

          this.isSaving = false;

          if (!response?.success) {
            this.toastr.error(
              response?.message || "Failed to update service request",
              "Error",
            );

            return;
          }

          this.toastr.success(
            response?.message || "Service request updated successfully",
            "Success",
          );

          this.submitted = true;

          this.router.navigate(["/service-requests"]);
        },

        error: (err: any) => {
          this.ngxLoader.stop();

          this.isSaving = false;

          console.error("Update document request failed:", err);

          this.toastr.error(
            err?.error?.message || "Failed to update document request",
            "Error",
          );
        },
      });

      return;
    }

    // =================================================
    // CREATE
    // =================================================

    this.documentRequestService.create(payload).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();

        this.isSaving = false;

        if (!response?.success) {
          this.toastr.error(
            response?.message || "Failed to create document request",
            "Error",
          );

          return;
        }

        this.toastr.success(
          response?.message || "Document request created successfully",
          "Success",
        );

        this.submitted = true;

        this.router.navigate(["/service-requests"]);
      },

      error: (err: any) => {
        this.ngxLoader.stop();

        this.isSaving = false;

        console.error("Create document request failed:", err);

        this.toastr.error(
          err?.error?.message || "Failed to create document request",
          "Error",
        );
      },
    });
  }

  // =====================================================
  // CANCEL
  // =====================================================

  cancel(): void {
    this.router.navigate(["/service-requests"]);
  }

  // =====================================================
  // CAN DEACTIVATE
  // =====================================================

  canDeactivate(): Observable<boolean> | Promise<boolean> | boolean {
    if (this.documentRequestForm.dirty && !this.submitted && !this.isViewMode) {
      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        width: "550px",
        disableClose: true,

        data: {
          message: "You have unsaved changes. Do you really want to leave?",
        },
      });

      return dialogRef.afterClosed();
    }

    return true;
  }
}
