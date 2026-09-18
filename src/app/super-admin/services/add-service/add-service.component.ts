import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { Router, ActivatedRoute, RouterModule } from "@angular/router";
import { NgxUiLoaderModule, NgxUiLoaderService } from "ngx-ui-loader";
import { ToastrModule, ToastrService } from "ngx-toastr";

import { ServiceService } from "../../../services/service.service";
import { ServiceCategoryService } from "../../../services/service-category.service";
import { DocumentService } from "../../../services/document.service";

@Component({
  selector: "app-add-service",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    NgxUiLoaderModule,
    ToastrModule,
  ],
  templateUrl: "./add-service.component.html",
  styleUrl: "./add-service.component.css",
})
export class AddServiceComponent implements OnInit {
  serviceForm: FormGroup;

  submitted = false;

  isEditMode = false;
  isViewMode = false;

  serviceId: string | null = null;

  errorMessage: string | null = null;

  serviceCategories: any[] = [];

  documentGroups: any[] = [];

  selectedDocumentGroups: string[] = [];
  isDocumentGroupsOpen = false;

  constructor(
    private fb: FormBuilder,
    private serviceService: ServiceService,
    private serviceCategoryService: ServiceCategoryService,
    private documentService: DocumentService,
    private router: Router,
    private route: ActivatedRoute,
    private ngxLoader: NgxUiLoaderService,
    private toastr: ToastrService,
  ) {
    this.serviceForm = this.fb.group({
      categoryId: ["", [Validators.required]],

      serviceName: [
        "",
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(100),
        ],
      ],

      serviceCode: [
        "",
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(50),
        ],
      ],

      description: ["", [Validators.maxLength(500)]],

      frequency: ["Yearly", [Validators.required]],

      defaultDueDays: [
        30,
        [Validators.required, Validators.min(0), Validators.max(365)],
      ],

      billingAmount: [
        0,
        [Validators.required, Validators.min(0), Validators.max(99999999)],
      ],

      documentGroups: [[]],

      status: [1],
    });
  }

  ngOnInit(): void {
    /*
     * Load Service Categories
     */
    this.loadServiceCategories();

    /*
     * Load Document Groups
     */
    this.loadDocumentGroups();

      this.setupServiceCodeGeneration();

    /*
     * Check Edit/View Mode
     */
    this.route.paramMap.subscribe((params) => {
      this.serviceId = params.get("id");

      if (this.serviceId) {
        this.isEditMode = true;

        this.loadServiceData(this.serviceId);
      }
    });

    /*
     * Check View Mode
     */
    this.route.queryParamMap.subscribe((queryParams) => {
      this.isViewMode = queryParams.get("viewMode") === "true";

      if (this.isViewMode) {
        this.serviceForm.disable();
      }
    });
  }

  /**
   * Load Service Categories
   */
  private loadServiceCategories(): void {
    this.serviceCategoryService.getActiveServiceCategories().subscribe({
      next: (res: any) => {
        if (res?.success) {
          this.serviceCategories = res.data || [];
        } else {
          this.toastr.error(
            res?.message || "Failed to load service categories",
          );
        }
      },

      error: (err: any) => {
        console.error("Failed to load service categories:", err);

        this.toastr.error(
          err?.error?.message || "Failed to load service categories",
        );
      },
    });
  }

  /**
   * Load Document Groups
   */
  /**
   * Load Document Groups
   */
  private loadDocumentGroups(): void {
    this.documentService.getDocumentGroups().subscribe({
      next: (res: any) => {
        if (res?.success) {
          this.documentGroups = res.data || [];
        } else {
          this.documentGroups = [];

          this.toastr.error(res?.message || "Failed to load document groups");
        }
      },

      error: (err: any) => {
        console.error("Failed to load document groups:", err);

        this.documentGroups = [];

        this.toastr.error(
          err?.error?.message || "Failed to load document groups",
        );
      },
    });
  }

  /**
   * Load Service
   */
  private loadServiceData(id: string): void {
    this.ngxLoader.start();

    this.serviceService.getById(id).subscribe({
      next: (res: any) => {
        this.ngxLoader.stop();

        if (res?.success && res?.data) {
          const service = res.data;

          this.serviceForm.patchValue({
            categoryId: service.categoryId ?? "",

            serviceName: service.serviceName || "",

            serviceCode: service.serviceCode || "",

            description: service.description || "",

            frequency: service.frequency || "Yearly",

            defaultDueDays: service.defaultDueDays ?? 30,

            billingAmount: service.billingAmount ?? 0,

            documentGroups: service.documentGroups || [],

            status: service.status ?? 1,
          });

          this.selectedDocumentGroups = service.documentGroups || [];
        } else {
          this.toastr.error(res?.message || "Service not found");

          this.router.navigate(["/services"]);
        }
      },

      error: (err: any) => {
        this.ngxLoader.stop();

        console.error("Failed to load service:", err);

        this.toastr.error(err?.error?.message || "Failed to load service");

        this.router.navigate(["/services"]);
      },
    });
  }

private setupServiceCodeGeneration(): void {
  const serviceNameControl = this.serviceForm.get("serviceName");
  const serviceCodeControl = this.serviceForm.get("serviceCode");

  if (!serviceNameControl || !serviceCodeControl) {
    return;
  }

  serviceNameControl.valueChanges.subscribe((value: string) => {

    if (this.isEditMode || this.isViewMode) {
      return;
    }

    const generatedCode = this.generateServiceCode(value);

    serviceCodeControl.setValue(generatedCode, {
      emitEvent: false,
    });
  });
}

private generateServiceCode(serviceName: string): string {
  if (!serviceName) {
    return "";
  }

  return serviceName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .substring(0, 50);
}
  /**
   * Save / Update Service
   */
  saveService(): void {
    this.submitted = true;

    /*
     * View mode
     */
    if (this.isViewMode) {
      return;
    }

    /*
     * Validate form
     */
    if (this.serviceForm.invalid) {
      this.serviceForm.markAllAsTouched();

      this.toastr.error("Please fill in all required fields correctly.");

      return;
    }

    this.errorMessage = null;

    this.ngxLoader.start();

    const formValue = this.serviceForm.getRawValue();

    const payload: any = {
      categoryId: formValue.categoryId,

      serviceName: formValue.serviceName?.trim(),

      serviceCode: formValue.serviceCode?.trim(),

      description: formValue.description?.trim() || null,

      frequency: formValue.frequency,

      defaultDueDays: Number(formValue.defaultDueDays),

      billingAmount: Number(formValue.billingAmount),

      documentGroups: formValue.documentGroups || [],

      status: formValue.status === 0 ? 0 : 1,
    };

    /*
     * Update
     */
    if (this.isEditMode) {
      payload.id = this.serviceId;

      this.serviceService.update(payload).subscribe({
        next: (res: any) => {
          this.ngxLoader.stop();

          if (res?.success) {
            this.toastr.success("Service updated successfully");

            this.router.navigate(["/services"]);
          } else {
            this.toastr.error(res?.message || "Failed to update service");
          }
        },

        error: (err: any) => {
          this.ngxLoader.stop();

          console.error("Update service error:", err);

          this.toastr.error(err?.error?.message || "Failed to update service");
        },
      });
    } else {
      /*
       * Create
       */
      this.serviceService.create(payload).subscribe({
        next: (res: any) => {
          this.ngxLoader.stop();

          if (res?.success) {
            this.toastr.success("Service created successfully");

            this.router.navigate(["/services"]);
          } else {
            this.toastr.error(res?.message || "Failed to create service");
          }
        },

        error: (err: any) => {
          this.ngxLoader.stop();

          console.error("Create service error:", err);

          this.toastr.error(err?.error?.message || "Failed to create service");
        },
      });
    }
  }
  /**
   * Toggle Document Groups dropdown
   */
  toggleDocumentGroups(): void {
    if (this.isViewMode) {
      return;
    }

    this.isDocumentGroupsOpen = !this.isDocumentGroupsOpen;
  }
  /**
   * Document Group Selection
   */
  onDocumentGroupChange(event: Event, groupCode: string): void {
    const checkbox = event.target as HTMLInputElement;

    const currentGroups = [...this.selectedDocumentGroups];

    if (checkbox.checked) {
      // Add group if not already selected
      if (!currentGroups.includes(groupCode)) {
        currentGroups.push(groupCode);
      }
    } else {
      // Remove group
      const index = currentGroups.indexOf(groupCode);

      if (index !== -1) {
        currentGroups.splice(index, 1);
      }
    }

    this.selectedDocumentGroups = currentGroups;

    this.serviceForm.patchValue({
      documentGroups: currentGroups,
    });
  }
getSelectedDocumentGroupNames(): string {
  if (
    !this.selectedDocumentGroups ||
    this.selectedDocumentGroups.length === 0
  ) {
    return "No document groups selected";
  }

  const selectedNames = this.documentGroups
    .filter((group) =>
      this.selectedDocumentGroups.includes(group.groupCode)
    )
    .map((group) => group.groupName);

  return selectedNames.length > 0
    ? selectedNames.join(", ")
    : "No document groups selected";
}
  /**
   * Cancel
   */
  cancel(): void {
    this.router.navigate(["/services"]);
  }

  /**
   * Enable Edit Mode
   */
  enableEditMode(): void {
    this.isViewMode = false;

    this.serviceForm.enable();
  }

  /**
   * Allow alphabets, numbers and spaces
   */
  allowServiceNameCharacters(event: KeyboardEvent): void {
    const charCode = event.which || event.keyCode;

    const char = String.fromCharCode(charCode);

    if (!/^[a-zA-Z0-9 ]$/.test(char)) {
      event.preventDefault();
    }
  }

  /**
   * Allow service code characters
   */
  allowServiceCodeCharacters(event: KeyboardEvent): void {
    const char = event.key;

    if (!/^[a-zA-Z0-9_-]$/.test(char)) {
      event.preventDefault();
    }
  }

  /**
   * Allow numbers only
   */
  allowOnlyNumbers(event: KeyboardEvent): void {
    const char = event.key;

    if (!/^[0-9]$/.test(char)) {
      event.preventDefault();
    }
  }

  /**
   * Allow decimal numbers
   */
  allowDecimalNumbers(event: KeyboardEvent): void {
    const char = event.key;

    if (!/^[0-9.]$/.test(char)) {
      event.preventDefault();
    }
  }
}
