import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  ActivatedRoute,
  Router,
  RouterModule,
} from "@angular/router";

import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";

import { HttpClientModule } from "@angular/common/http";

import {
  NgxUiLoaderModule,
  NgxUiLoaderService,
} from "ngx-ui-loader";

import {
  ToastrModule,
  ToastrService,
} from "ngx-toastr";

import { forkJoin } from "rxjs";

import { ClientService } from "../../../services/client.service";
import { ClientServiceService } from "../../../services/client-service.service";
import { DocumentService } from "../../../services/document.service";
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
    HttpClientModule,
    NgxUiLoaderModule,
    ToastrModule,
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

  // =====================================================
  // STAFF
  // =====================================================

  staff: any[] = [];
  reviewers: any[] = [];

  loadingStaff = false;

  // =====================================================
  // DOCUMENTS
  // =====================================================

  documents: any[] = [];
  selectedDocumentIds: number[] = [];

  loadingDocuments = false;

  // =====================================================
  // SELECTED CLIENT SERVICE
  // =====================================================

  selectedClientServiceId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,

    private ngxLoader: NgxUiLoaderService,
    private toastr: ToastrService,

    private clientService: ClientService,
    private clientServiceService: ClientServiceService,
    private documentService: DocumentService,
    private documentRequestService: DocumentRequestService,
    private userService: UserService,
    private serviceService: ServiceService
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

  this.route.paramMap.subscribe((params) => {
    const id = params.get("id");

    console.log("ROUTE ID:", id);

    const url = this.router.url;

    if (url.includes("/view-document-request/")) {
      this.isViewMode = true;
      this.isEditMode = false;
    } else if (url.includes("/edit-document-request/")) {
      this.isViewMode = false;
      this.isEditMode = true;
    } else {
      this.isViewMode = false;
      this.isEditMode = false;
    }

    this.route.queryParamMap.subscribe((queryParams) => {
      if (queryParams.get("viewMode") === "true") {
        this.isViewMode = true;
        this.isEditMode = false;
      }

      this.applyViewMode();

      if (id) {
        const numericId = Number(id);

        if (Number.isInteger(numericId) && numericId > 0) {
          this.documentRequestId = numericId;

          console.log(
            "CALLING LOAD DOCUMENT REQUEST:",
            numericId
          );

          this.loadDocumentRequest(numericId);
        }
      }
    });
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
  // LOAD DOCUMENT REQUEST
  // =====================================================

  loadDocumentRequest(id: number): void {
  console.log("========== DOCUMENT REQUEST LOAD ==========");
  console.log("Request ID:", id);

  this.ngxLoader.start();

  this.documentRequestService.getById(id).subscribe({
    next: (response: any) => {
      this.ngxLoader.stop();

      console.log("API RESPONSE:", response);

      if (!response?.success) {
        console.error("API returned success=false:", response);
        return;
      }

     const request = response.data.documentRequest;

      console.log("REQUEST DATA:", request);

      if (!request) {
        console.error("response.data is empty");
        return;
      }

      // PATCH FORM
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

      console.log(
        "FORM VALUE AFTER PATCH:",
        this.documentRequestForm.getRawValue()
      );

      // Client service
      this.selectedClientServiceId =
        request.clientServiceId
          ? Number(request.clientServiceId)
          : null;

      // Load services belonging to client
      if (request.clientId) {
        this.loadClientServices(Number(request.clientId));
      }

      // Load documents belonging to service
      if (request.serviceId) {
        this.loadServiceDocuments(Number(request.serviceId));
      }

      // Required documents
      const requestItems =
        Array.isArray(request.items)
          ? request.items
          : Array.isArray(request.documentRequestItems)
            ? request.documentRequestItems
            : [];

      this.selectedDocumentIds = requestItems
        .map((item: any) => Number(item.documentId))
        .filter(
          (documentId: number) =>
            Number.isInteger(documentId) && documentId > 0
        );

      // Finally apply view mode
      this.applyViewMode();
    },

    error: (error: any) => {
      this.ngxLoader.stop();

      console.error(
        "DOCUMENT REQUEST GET API ERROR:",
        error
      );
    },
  });
}

  // =====================================================
  // LOAD CLIENTS
  // =====================================================

  loadClients(): void {
    this.loadingClients = true;

    this.clientService
      .listAllClients({})
      .subscribe({
        next: (response: any) => {
          this.loadingClients = false;

          console.log(
            "Clients response:",
            response
          );

          if (response?.success) {
            this.clients =
              Array.isArray(response.data)
                ? response.data
                : [];
          } else {
            this.clients =
              Array.isArray(response?.data)
                ? response.data
                : Array.isArray(response)
                ? response
                : [];
          }
        },

        error: (err: any) => {
          this.loadingClients = false;

          console.error(
            "Failed to load clients:",
            err
          );

          this.toastr.error(
            err?.error?.message ||
              "Failed to load clients",
            "Error"
          );
        },
      });
  }

  // =====================================================
  // LOAD USERS
  // =====================================================

  loadUsers(): void {
    this.loadingStaff = true;

    this.userService
      .getAllUsers({})
      .subscribe({
        next: (response: any) => {
          this.loadingStaff = false;

          console.log(
            "Users response:",
            response
          );

          let users: any[] = [];

          if (response?.success) {
            users = Array.isArray(response.data)
              ? response.data
              : [];
          } else {
            users = Array.isArray(response?.data)
              ? response.data
              : Array.isArray(response)
              ? response
              : [];
          }

          this.staff = users;
          this.reviewers = users;

          console.log(
            "Staff:",
            this.staff
          );

          console.log(
            "Reviewers:",
            this.reviewers
          );
        },

        error: (err: any) => {
          this.loadingStaff = false;

          console.error(
            "Failed to load users:",
            err
          );

          this.toastr.error(
            err?.error?.message ||
              "Failed to load staff",
            "Error"
          );
        },
      });
  }

  // =====================================================
  // CLIENT CHANGE
  // =====================================================

  onClientChange(): void {
    /*
     * Do nothing in View mode.
     */

    if (this.isViewMode) {
      return;
    }

    const clientId =
      this.documentRequestForm.get(
        "clientId"
      )?.value;

    // Clear previous service
    this.documentRequestForm.patchValue({
      serviceId: null,
    });

    // Clear selected client service
    this.selectedClientServiceId = null;

    // Clear previous data
    this.services = [];
    this.documents = [];
    this.selectedDocumentIds = [];

    if (!clientId) {
      return;
    }

    this.loadClientServices(
      Number(clientId)
    );
  }

  // =====================================================
  // LOAD CLIENT SERVICES
  // =====================================================

  loadClientServices(
    clientId: number
  ): void {
    this.loadingServices = true;

    this.clientServiceService
      .getClientServices(clientId)
      .subscribe({
        next: (response: any) => {
          this.loadingServices = false;

          console.log(
            "Client services response:",
            response
          );

          if (!response?.success) {
            this.services = [];

            this.toastr.error(
              response?.message ||
                "Failed to load assigned services",
              "Error"
            );

            return;
          }

          const assignments =
            Array.isArray(response.data)
              ? response.data
              : [];

          /*
           * Keep complete client-service assignment.
           *
           * We need:
           *
           * assignment.id
           * assignment.serviceId
           * assignment.serviceName /
           * assignment.service.serviceName
           *
           * when creating Document Request.
           */

          this.services = assignments;

          console.log(
            "Assigned services:",
            this.services
          );
        },

        error: (err: any) => {
          this.loadingServices = false;

          console.error(
            "Failed to load client services:",
            err
          );

          this.toastr.error(
            err?.error?.message ||
              "Failed to load assigned services",
            "Error"
          );
        },
      });
  }

  // =====================================================
  // SERVICE CHANGE
  // =====================================================

  onServiceChange(): void {
    /*
     * Do nothing in View mode.
     */

    if (this.isViewMode) {
      return;
    }

    const serviceId =
      this.documentRequestForm.get(
        "serviceId"
      )?.value;

    // Clear old documents
    this.documents = [];
    this.selectedDocumentIds = [];

    // Clear old client service
    this.selectedClientServiceId = null;

    if (!serviceId) {
      return;
    }

    const numericServiceId =
      Number(serviceId);

    if (
      !Number.isInteger(
        numericServiceId
      ) ||
      numericServiceId <= 0
    ) {
      console.error(
        "Invalid service ID:",
        serviceId
      );

      return;
    }

    /*
     * Find selected client-service assignment.
     *
     * IMPORTANT:
     *
     * assignment.id
     *     = clientServiceId
     *
     * assignment.serviceId
     *     = actual serviceId
     */

    const selectedAssignment =
      this.services.find(
        (item: any) =>
          Number(item.serviceId) ===
          numericServiceId
      );

    if (!selectedAssignment) {
      console.error(
        "Selected service is not assigned to this client:",
        numericServiceId
      );

      this.toastr.error(
        "Selected service is not assigned to this client.",
        "Error"
      );

      return;
    }

    this.selectedClientServiceId =
      Number(selectedAssignment.id);

    console.log(
      "Selected client service ID:",
      this.selectedClientServiceId
    );

    console.log(
      "Selected service ID:",
      numericServiceId
    );

    console.log(
      "Selected assignment:",
      selectedAssignment
    );

    // Load documents belonging to this service
    this.loadServiceDocuments(
      numericServiceId
    );
  }

  // =====================================================
  // LOAD SERVICE DOCUMENTS
  // =====================================================

  loadServiceDocuments(
    serviceId: number
  ): void {
    this.loadingDocuments = true;

    this.documents = [];
    this.selectedDocumentIds =
      this.selectedDocumentIds || [];

    console.log(
      "Loading documents for service:",
      serviceId
    );

    /*
     * STEP 1:
     *
     * Get service document groups.
     *
     * We intentionally use:
     *
     * /services/document-groups
     *
     * instead of getById(),
     * because getById() is restricted
     * to Super Admin.
     */

    this.serviceService
      .getDocumentGroups(serviceId)
      .subscribe({
        next: (serviceResponse: any) => {
          console.log(
            "Service document groups response:",
            serviceResponse
          );

          if (
            !serviceResponse?.success ||
            !serviceResponse?.data
          ) {
            this.loadingDocuments = false;

            this.toastr.error(
              serviceResponse?.message ||
                "Failed to load service details",
              "Error"
            );

            return;
          }

          const service =
            serviceResponse.data;

          /*
           * STEP 2:
           *
           * Get document groups.
           *
           * Example:
           *
           * ["ITR_SAL"]
           *
           * Or multiple:
           *
           * ["ITR_SAL", "ITR_CG"]
           */

          const documentGroups: string[] =
            Array.isArray(
              service.documentGroups
            )
              ? service.documentGroups
                  .filter(
                    (groupCode: any) =>
                      typeof groupCode ===
                        "string" &&
                      groupCode.trim()
                  )
                  .map(
                    (groupCode: string) =>
                      groupCode
                        .trim()
                        .toUpperCase()
                  )
              : [];

          /*
           * Remove duplicate group codes.
           */

          const uniqueGroupCodes =
            Array.from(
              new Set(documentGroups)
            );

          console.log(
            "Document groups for service:",
            uniqueGroupCodes
          );

          if (
            uniqueGroupCodes.length === 0
          ) {
            this.loadingDocuments = false;

            console.log(
              "No document groups mapped to this service."
            );

            return;
          }

          /*
           * STEP 3:
           *
           * Call existing:
           *
           * /documents/group
           *
           * for every group.
           */

          const documentRequests =
            uniqueGroupCodes.map(
              (groupCode: string) =>
                this.documentService
                  .getDocumentsByGroup(
                    groupCode
                  )
            );

          /*
           * forkJoin waits until ALL group
           * requests finish.
           *
           * This supports services having:
           *
           * 1 group
           * 2 groups
           * 3 groups
           * etc.
           */

          forkJoin(
            documentRequests
          ).subscribe({
            next: (
              responses: any[]
            ) => {
              console.log(
                "Documents by group responses:",
                responses
              );

              /*
               * STEP 4:
               *
               * Extract documents from
               * every response.
               */

              const allDocuments: any[] =
                responses.flatMap(
                  (response: any) => {
                    if (
                      response?.success &&
                      Array.isArray(
                        response.data
                      )
                    ) {
                      return response.data;
                    }

                    return [];
                  }
                );

              /*
               * STEP 5:
               *
               * Remove duplicate documents.
               *
               * This is useful if a document
               * appears in more than one
               * mapped group.
               */

              const uniqueDocuments =
                Array.from(
                  new Map(
                    allDocuments.map(
                      (document: any) => [
                        Number(
                          document.id
                        ),
                        document,
                      ]
                    )
                  ).values()
                );

              /*
               * Optional sorting:
               *
               * Mandatory documents first,
               * then document name.
               */

              uniqueDocuments.sort(
                (a: any, b: any) => {
                  const mandatoryA =
                    a.isMandatory
                      ? 1
                      : 0;

                  const mandatoryB =
                    b.isMandatory
                      ? 1
                      : 0;

                  if (
                    mandatoryA !==
                    mandatoryB
                  ) {
                    return (
                      mandatoryB -
                      mandatoryA
                    );
                  }

                  return String(
                    a.documentName ||
                      ""
                  ).localeCompare(
                    String(
                      b.documentName ||
                        ""
                    )
                  );
                }
              );

              this.documents =
                uniqueDocuments;

              this.loadingDocuments =
                false;

              console.log(
                "Final documents for selected service:",
                this.documents
              );

              console.log(
                "Total documents:",
                this.documents.length
              );
            },

            error: (err: any) => {
              this.loadingDocuments =
                false;

              console.error(
                "Failed to load documents by group:",
                err
              );

              this.toastr.error(
                err?.error?.message ||
                  "Failed to load required documents",
                "Error"
              );
            },
          });
        },

        error: (err: any) => {
          this.loadingDocuments = false;

          console.error(
            "Failed to load service details:",
            err
          );

          this.toastr.error(
            err?.error?.message ||
              "Failed to load service details",
            "Error"
          );
        },
      });
  }

  // =====================================================
  // DOCUMENT SELECTION
  // =====================================================

  isDocumentSelected(
    documentId: number
  ): boolean {
    return this.selectedDocumentIds.includes(
      Number(documentId)
    );
  }

  toggleDocument(
    documentId: number
  ): void {
    /*
     * Don't allow changing documents
     * in View mode.
     */

    if (this.isViewMode) {
      return;
    }

    documentId = Number(documentId);

    if (
      this.selectedDocumentIds.includes(
        documentId
      )
    ) {
      this.selectedDocumentIds =
        this.selectedDocumentIds.filter(
          (id) =>
            id !== documentId
        );
    } else {
      this.selectedDocumentIds.push(
        documentId
      );
    }
  }

  // =====================================================
  // SELECT ALL
  // =====================================================

  selectAllDocuments(): void {
    if (this.isViewMode) {
      return;
    }

    this.selectedDocumentIds =
      this.documents.map(
        (document: any) =>
          Number(document.id)
      );
  }

  // =====================================================
  // CLEAR ALL
  // =====================================================

  clearAllDocuments(): void {
    if (this.isViewMode) {
      return;
    }

    this.selectedDocumentIds = [];
  }

  // =====================================================
  // SAVE DOCUMENT REQUEST
  // =====================================================

  saveDocumentRequest(): void {
    /*
     * View mode should never submit.
     */

    if (this.isViewMode) {
      return;
    }

    this.submitted = true;

    if (
      this.documentRequestForm.invalid
    ) {
      this.documentRequestForm.markAllAsTouched();

      this.toastr.error(
        "Please fill in all required fields correctly.",
        "Error"
      );

      return;
    }

    if (
      !this.selectedClientServiceId
    ) {
      this.toastr.error(
        "Please select a valid service assigned to this client.",
        "Error"
      );

      return;
    }

    if (
      this.selectedDocumentIds.length ===
      0
    ) {
      this.toastr.error(
        "Please select at least one document.",
        "Error"
      );

      return;
    }

    const formValue =
      this.documentRequestForm.getRawValue();

    const payload = {
      taskName:
        formValue.taskName?.trim(),

      clientId:
        Number(formValue.clientId),

      clientServiceId:
        Number(
          this.selectedClientServiceId
        ),

      serviceId:
        Number(formValue.serviceId),

      assignedTo:
        Number(formValue.assignedTo),

      reviewerId:
        formValue.reviewerId
          ? Number(
              formValue.reviewerId
            )
          : null,

      priority:
        formValue.priority,

      period:
        formValue.period?.trim() ||
        null,

      dueDate:
        formValue.dueDate || null,

      documentIds:
        this.selectedDocumentIds,
    };

    console.log(
      "Create Document Request payload:",
      payload
    );

    this.isSaving = true;

    this.ngxLoader.start();

    /*
     * Keep existing create logic unchanged.
     */

    this.documentRequestService
      .create(payload)
      .subscribe({
        next: (response: any) => {
          this.ngxLoader.stop();

          this.isSaving = false;

          console.log(
            "Create Document Request response:",
            response
          );

          if (!response?.success) {
            this.toastr.error(
              response?.message ||
                "Failed to create document request",
              "Error"
            );

            return;
          }

          this.toastr.success(
            response?.message ||
              "Document request created successfully",
            "Success"
          );

          this.submitted = true;

          this.router.navigate([
            "/document-requests",
          ]);
        },

        error: (err: any) => {
          this.ngxLoader.stop();

          this.isSaving = false;

          console.error(
            "Create document request failed:",
            err
          );

          this.toastr.error(
            err?.error?.message ||
              "Failed to create document request",
            "Error"
          );
        },
      });
  }

  // =====================================================
  // CANCEL
  // =====================================================

  cancel(): void {
    this.router.navigate([
      "/document-requests",
    ]);
  }
}