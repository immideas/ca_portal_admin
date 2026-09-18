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

import { ServiceCategoryService } from "../../../services/service-category.service";

@Component({
  selector: "app-add-service-category",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    NgxUiLoaderModule,
    ToastrModule,
  ],
  templateUrl: "./add-service-category.component.html",
  styleUrl: "./add-service-category.component.css",
})
export class AddServiceCategoryComponent implements OnInit {
  serviceCategoryForm: FormGroup;

  submitted = false;

  isEditMode = false;
  isViewMode = false;

  serviceCategoryId: string | null = null;

  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private serviceCategoryService: ServiceCategoryService,
    private router: Router,
    private route: ActivatedRoute,
    private ngxLoader: NgxUiLoaderService,
    private toastr: ToastrService,
  ) {
    this.serviceCategoryForm = this.fb.group({
      name: [
        "",
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(100),
        ],
      ],

      description: ["", [Validators.maxLength(500)]],

      status: [1],
    });
  }

  ngOnInit(): void {
    /*
     * Check edit/view mode
     */
    this.route.paramMap.subscribe((params) => {
      this.serviceCategoryId = params.get("id");

      if (this.serviceCategoryId) {
        this.isEditMode = true;

        this.loadServiceCategoryData(this.serviceCategoryId);
      }
    });

    /*
     * Check View Mode
     */
    this.route.queryParamMap.subscribe((queryParams) => {
      this.isViewMode = queryParams.get("viewMode") === "true";

      if (this.isViewMode) {
        this.serviceCategoryForm.disable();
      }
    });
  }

  /**
   * Load Service Category
   */
  private loadServiceCategoryData(id: string): void {
    this.ngxLoader.start();

    this.serviceCategoryService.getById(id).subscribe({
      next: (res: any) => {
        this.ngxLoader.stop();

        if (res?.success && res?.data) {
          const serviceCategory = res.data;

          this.serviceCategoryForm.patchValue({
            name: serviceCategory.name || "",

            description: serviceCategory.description || "",

            status: serviceCategory.status ?? 1,
          });
        } else {
          this.toastr.error(res?.message || "Service category not found");

          this.router.navigate(["/service-categories"]);
        }
      },

      error: (err: any) => {
        this.ngxLoader.stop();

        console.error("Failed to load service category:", err);

        this.toastr.error(
          err?.error?.message || "Failed to load service category",
        );

        this.router.navigate(["/service-categories"]);
      },
    });
  }

  /**
   * Save / Update Service Category
   */
  saveServiceCategory(): void {
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
    if (this.serviceCategoryForm.invalid) {
      this.serviceCategoryForm.markAllAsTouched();

      this.toastr.error("Please fill in all required fields correctly.");

      return;
    }

    this.errorMessage = null;

    this.ngxLoader.start();

    const formValue = this.serviceCategoryForm.getRawValue();

    const payload: any = {
      name: formValue.name?.trim(),

      description: formValue.description?.trim() || null,

      status: formValue.status === 0 ? 0 : 1,
    };

    /*
     * Update
     */
    if (this.isEditMode) {
      payload.id = this.serviceCategoryId;

      this.serviceCategoryService.update(payload).subscribe({
        next: (res: any) => {
          this.ngxLoader.stop();

          if (res?.success) {
            this.toastr.success("Service category updated successfully");

            this.router.navigate(["/service-categories"]);
          } else {
            this.toastr.error(
              res?.message || "Failed to update service category",
            );
          }
        },

        error: (err: any) => {
          this.ngxLoader.stop();

          console.error("Update service category error:", err);

          this.toastr.error(
            err?.error?.message || "Failed to update service category",
          );
        },
      });
    } else {
      /*
       * Create
       */
      this.serviceCategoryService.create(payload).subscribe({
        next: (res: any) => {
          this.ngxLoader.stop();

          if (res?.success) {
            this.toastr.success("Service category created successfully");

            this.router.navigate(["/service-categories"]);
          } else {
            this.toastr.error(
              res?.message || "Failed to create service category",
            );
          }
        },

        error: (err: any) => {
          this.ngxLoader.stop();

          console.error("Create service category error:", err);

          this.toastr.error(
            err?.error?.message || "Failed to create service category",
          );
        },
      });
    }
  }

  /**
   * Cancel
   */
  cancel(): void {
    this.router.navigate(["/service-categories"]);
  }

  /**
   * Enable Edit Mode
   */
  enableEditMode(): void {
    this.isViewMode = false;

    this.serviceCategoryForm.enable();
  }

  /**
   * Allow only alphabets and spaces
   */
  allowOnlyAlphabets(event: KeyboardEvent): void {
    const charCode = event.which || event.keyCode;

    const char = String.fromCharCode(charCode);

    if (!/^[a-zA-Z ]$/.test(char)) {
      event.preventDefault();
    }
  }
}
