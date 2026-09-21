import { Component, Input, OnInit, OnDestroy } from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from "@angular/forms";
import { CommonModule } from "@angular/common";
import { HttpClientModule } from "@angular/common/http";
import { Router, ActivatedRoute, RouterModule } from "@angular/router";

import { NgxUiLoaderModule, NgxUiLoaderService } from "ngx-ui-loader";

import { ToastrModule, ToastrService } from "ngx-toastr";

import { Observable } from "rxjs";

import { MatDialog, MatDialogModule } from "@angular/material/dialog";

import { ConfirmDialogComponent } from "../../../confirm-dialog/confirm-dialog.component";

import { ClientService } from "../../../services/client.service";
import { ClientServiceService } from "../../../services/client-service.service";
import { ServiceService } from "../../../services/service.service";

@Component({
  selector: "app-add-client-services",
  templateUrl: "./add-client-services.component.html",
  styleUrls: ["./add-client-services.component.css"],
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    RouterModule,
    ReactiveFormsModule,
    NgxUiLoaderModule,
    ToastrModule,
    MatDialogModule,
  ],
})
export class AddClientServicesComponent implements OnInit, OnDestroy {
  // =====================================================
  // FORM
  // =====================================================

  clientServiceForm: FormGroup;

  // =====================================================
  // COMMON
  // =====================================================

  token: string | null = localStorage.getItem("token");

  submitted = false;
  isSaving = false;

  // =====================================================
  // ADD / VIEW MODE
  // =====================================================

  @Input() isViewMode = false;
  @Input() embedded = false;
  @Input() clientIdInput: number | null = null;
  isEditMode = false;

  // =====================================================
  // IDS
  // =====================================================

  clientId: string | null = null;
  clientServiceId: string | null = null;

  // =====================================================
  // CLIENTS
  // =====================================================

  clients: any[] = [];

  selectedClient: any = null;

  // =====================================================
  // SERVICES
  // =====================================================

  services: any[] = [];

  // =====================================================
  // GROUPED SERVICES
  // =====================================================

  serviceGroups: any[] = [];

  // =====================================================
  // SELECTED SERVICES
  // =====================================================

  selectedServiceIds = new Set<number>();

  // =====================================================
  // ORIGINAL DATA
  // =====================================================

  originalData: any = null;

  // =====================================================
  // CONSTRUCTOR
  // =====================================================

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private ngxLoader: NgxUiLoaderService,
    private toastr: ToastrService,
    private dialog: MatDialog,
    private clientService: ClientService,
    private clientServiceService: ClientServiceService,
    private serviceService: ServiceService,
  ) {
    this.clientServiceForm = this.fb.group({
      clientId: [null, Validators.required],
    });
  }

  // =====================================================
  // INIT
  // =====================================================

ngOnInit(): void {

  // =====================================================
  // LOAD BASIC DATA
  // =====================================================

  this.loadClients();
  this.loadServices();


  // =====================================================
  // GET CLIENT ID FROM ROUTE / PARENT
  // =====================================================

  this.route.paramMap.subscribe((params) => {

    const routeClientId = params.get("clientId");

    /*
     * Client View
     *
     * Example:
     * clientIdInput = 2
     */
    if (this.clientIdInput) {

      this.clientId = String(this.clientIdInput);

    } else {

      /*
       * Direct Add/Edit page
       *
       * Example:
       * /add-client-services/2
       * /edit-client-services/2
       */
      this.clientId = routeClientId;
    }


    // =================================================
    // CLIENT ID AVAILABLE
    // =================================================

    if (this.clientId) {

      const clientId = Number(this.clientId);

      /*
       * Patch client ID into form
       */
      this.clientServiceForm.patchValue({
        clientId: clientId,
      });

      /*
       * Load client information
       */
      this.loadSelectedClient(clientId);

      /*
       * IMPORTANT:
       *
       * Load ALL services assigned to this client.
       *
       * This is required for both:
       *
       * Client View
       * Edit Client Services
       */
      this.loadAssignedServicesForClient(clientId);
    }

  });


  // =====================================================
  // DETECT ADD / EDIT ROUTE
  // =====================================================

  this.route.url.subscribe((segments) => {

    const currentPath = segments
      .map(segment => segment.path)
      .join("/");

    console.log(
      "Current services route:",
      currentPath
    );


    /*
     * EDIT
     *
     * /edit-client-services/2
     */
    if (currentPath.startsWith("edit-client-services")) {

      this.isEditMode = true;

      console.log(
        "Client Services: EDIT MODE"
      );

    }

    /*
     * ADD
     *
     * /add-client-services/2
     */
    else if (
      currentPath.startsWith("add-client-services")
    ) {

      this.isEditMode = false;

      console.log(
        "Client Services: ADD MODE"
      );

    }

  });


  // =====================================================
  // VIEW MODE
  // =====================================================

  this.route.queryParamMap.subscribe((queryParams) => {

    const queryViewMode =
      queryParams.get("viewMode") === "true";


    /*
     * When component is embedded inside
     * ClientViewComponent,
     * parent controls view mode.
     */
    if (this.clientIdInput) {

      this.isViewMode = true;

    } else {

      this.isViewMode = queryViewMode;
    }


    /*
     * Disable form in View Mode
     */
    if (this.isViewMode) {

      this.clientServiceForm.disable();
    }

  });

}

  // =====================================================
  // LOAD CLIENTS
  // =====================================================

  loadClients(): void {
    this.clientService.listAllClients({}).subscribe({
      next: (response: any) => {
        this.clients = response?.data || response || [];

        if (this.clientId) {
          this.loadSelectedClient(Number(this.clientId));
        }
      },

      error: (err: any) => {
        console.error("Failed to fetch clients:", err);

        this.toastr.error(
          err?.error?.message || "Failed to fetch clients",
          "Error",
        );
      },
    });
  }

  // =====================================================
  // LOAD SELECTED CLIENT
  // =====================================================

  loadSelectedClient(id: number): void {
    this.selectedClient =
      this.clients.find((client: any) => Number(client.id) === Number(id)) ||
      null;
  }

  // =====================================================
  // CLIENT CHANGE
  // =====================================================

  onClientChange(): void {
    const id = this.clientServiceForm.get("clientId")?.value;

    this.loadSelectedClient(Number(id));
  }

  // =====================================================
  // LOAD SERVICES
  // =====================================================

  loadServices(): void {
    this.ngxLoader.start();

    this.serviceService.getActiveServices().subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();

        this.services = response?.data || response || [];

        this.buildServiceGroups();
      },

      error: (err: any) => {
        this.ngxLoader.stop();

        console.error("Failed to fetch services:", err);

        this.toastr.error(
          err?.error?.message || "Failed to fetch services",
          "Error",
        );
      },
    });
  }

  // =====================================================
  // GROUP SERVICES BY CATEGORY
  // =====================================================

  buildServiceGroups(): void {
    const groups = new Map<number, any>();

    this.services.forEach((service: any) => {
      const category = service?.category || service?.ServiceCategory || {};

      const categoryId = Number(service.categoryId ?? category.id);

      const categoryName =
        category.name || service.categoryName || "Other Services";

      if (!groups.has(categoryId)) {
        groups.set(categoryId, {
          id: categoryId,
          name: categoryName,
          services: [],
        });
      }

      groups.get(categoryId).services.push(service);
    });

    this.serviceGroups = Array.from(groups.values()).sort((a: any, b: any) =>
      a.name.localeCompare(b.name),
    );
  }

  // =====================================================
  // CHECK SERVICE
  // =====================================================

  isServiceSelected(serviceId: number): boolean {
    return this.selectedServiceIds.has(Number(serviceId));
  }

  // =====================================================
  // SERVICE CHECKBOX CHANGE
  // =====================================================

  toggleService(serviceId: number, event: Event): void {
    if (this.isViewMode) {
      return;
    }

    const checked = (event.target as HTMLInputElement).checked;

    if (checked) {
      this.selectedServiceIds.add(Number(serviceId));
    } else {
      this.selectedServiceIds.delete(Number(serviceId));
    }
  }

  // =====================================================
  // SELECT ALL CATEGORY
  // =====================================================

  isCategorySelected(group: any): boolean {
    if (!group.services?.length) {
      return false;
    }

    return group.services.every((service: any) =>
      this.selectedServiceIds.has(Number(service.id)),
    );
  }

  // =====================================================
  // TOGGLE CATEGORY
  // =====================================================

  toggleCategory(group: any, event: Event): void {
    if (this.isViewMode) {
      return;
    }

    const checked = (event.target as HTMLInputElement).checked;

    group.services.forEach((service: any) => {
      if (checked) {
        this.selectedServiceIds.add(Number(service.id));
      } else {
        this.selectedServiceIds.delete(Number(service.id));
      }
    });
  }

  // =====================================================
  // SELECTED COUNT
  // =====================================================

  get selectedServiceCount(): number {
    return this.selectedServiceIds.size;
  }

  // =====================================================
  // FETCH CLIENT SERVICES
  // =====================================================

  fetchClientServiceData(id: string): void {
    this.ngxLoader.start();

    this.clientServiceService.getClientServiceById(Number(id)).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();

        const data = response?.data || response;

        this.originalData = data;

        // ---------------------------------------------
        // CLIENT
        // ---------------------------------------------

        if (data?.clientId) {
          this.clientServiceForm.patchValue({
            clientId: data.clientId,
          });

          this.loadSelectedClient(Number(data.clientId));
        }

        // ---------------------------------------------
        // SERVICE
        // ---------------------------------------------

        const service = data?.service || data?.Service || null;

        if (service?.id) {
          this.selectedServiceIds.add(Number(service.id));
        }

        // ---------------------------------------------
        // VIEW MODE
        // ---------------------------------------------

        if (this.isViewMode) {
          this.clientServiceForm.disable();
        }
      },

      error: (err: any) => {
        this.ngxLoader.stop();

        console.error("Failed to fetch client service:", err);

        this.toastr.error(
          err?.error?.message || "Failed to fetch client service",
          "Error",
        );
      },
    });
  }

  // =====================================================
  // LOAD ALL ASSIGNED SERVICES FOR CLIENT VIEW
  // =====================================================

  loadAssignedServicesForClient(clientId: number): void {
    this.ngxLoader.start();

    this.clientServiceService.getClientServices(clientId).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();

        if (!response?.success) {
          return;
        }

        const assignments = response.data || [];

        // Select all services assigned to this client
        this.selectedServiceIds = new Set(
          assignments.map((item: any) => Number(item.serviceId)),
        );

        console.log("Assigned services:", assignments);
        console.log(
          "Selected service IDs:",
          Array.from(this.selectedServiceIds),
        );
      },

      error: (err: any) => {
        this.ngxLoader.stop();

        console.error("Failed to fetch assigned client services:", err);

        this.toastr.error(
          err?.error?.message || "Failed to fetch assigned services",
          "Error",
        );
      },
    });
  }
  // =====================================================
  // SAVE SERVICES
  // =====================================================

  saveClientService(): void {
    this.submitted = true;

    if (this.clientServiceForm.invalid) {
      this.clientServiceForm.markAllAsTouched();

      this.toastr.error("Please select a client.", "Error");

      return;
    }

    // ---------------------------------------------------
    // CHECK SERVICE SELECTION
    // ---------------------------------------------------

    if (this.selectedServiceIds.size === 0) {
      this.toastr.error("Please select at least one service.", "Error");

      return;
    }

    this.isSaving = true;

    this.ngxLoader.start();

    const clientId = Number(this.clientServiceForm.get("clientId")?.value);

    const serviceIds = Array.from(this.selectedServiceIds);

    // ---------------------------------------------------
    // CREATE
    // ---------------------------------------------------

    this.clientServiceService
      .createClientServices(clientId, serviceIds)
      .subscribe({
        next: () => {
          this.ngxLoader.stop();

          this.isSaving = false;

          this.toastr.success(
            `${serviceIds.length} service(s) assigned successfully`,
            "Success",
          );

          this.cancel();
        },

        error: (err: any) => {
          this.ngxLoader.stop();

          this.isSaving = false;

          console.error("Create client services failed:", err);

          this.toastr.error(
            err?.error?.message || "Failed to assign services",
            "Error",
          );
        },
      });
  }

  // =====================================================
  // CANCEL
  // =====================================================

  cancel(): void {
    this.router.navigate(["/clients"]);
  }

  // =====================================================
  // EDIT MODE
  // =====================================================

  enableEditMode(): void {
    this.isViewMode = false;

    this.clientServiceForm.enable();
  }

  // =====================================================
  // CAN DEACTIVATE
  // =====================================================

  canDeactivate(): Observable<boolean> | Promise<boolean> | boolean {
    if (this.clientServiceForm.dirty && !this.submitted && !this.isViewMode) {
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

  // =====================================================
  // DESTROY
  // =====================================================

  ngOnDestroy(): void {}
}
