
import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from "@angular/forms";
import { Router, ActivatedRoute, RouterModule } from "@angular/router";
import { NgxUiLoaderModule, NgxUiLoaderService } from "ngx-ui-loader";
import { ToastrModule, ToastrService } from "ngx-toastr";

import { PortalService } from "../../../services/portal.service";

@Component({
  selector: "app-add-portal",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    NgxUiLoaderModule,
    ToastrModule,
  ],
  templateUrl: "./add-portal.component.html",
  styleUrl: "./add-portal.component.css",
})
export class AddPortalComponent implements OnInit {
  portalForm: FormGroup;

  submitted = false;

  isEditMode = false;
  isViewMode = false;

  portalId: string | null = null;

  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private portalService: PortalService,
    private router: Router,
    private route: ActivatedRoute,
    private ngxLoader: NgxUiLoaderService,
    private toastr: ToastrService,
  ) {
    this.portalForm = this.fb.group({
      name: [
        "",
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(150),
        ],
      ],
      url: [
        "",
        [
          Validators.required,
          Validators.maxLength(500),
          this.validatePortalUrl,
        ],
      ],
      description: ["", [Validators.maxLength(500)]],
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.portalId = params.get("id");

      if (this.portalId) {
        this.isEditMode = true;
        this.loadPortalData(this.portalId);
      }
    });

    this.route.queryParamMap.subscribe((queryParams) => {
      this.isViewMode = queryParams.get("viewMode") === "true";

      if (this.isViewMode) {
        this.portalForm.disable();
      }
    });
  }

  /**
   * Validate portal URL.
   * Only HTTP and HTTPS URLs are accepted.
   */
  private validatePortalUrl(
    control: AbstractControl,
  ): ValidationErrors | null {
    const value = String(control.value ?? "").trim();

    if (!value) {
      return null;
    }

    try {
      const parsedUrl = new URL(value);

      if (
        (parsedUrl.protocol !== "http:" &&
          parsedUrl.protocol !== "https:") ||
        !parsedUrl.hostname ||
        !parsedUrl.hostname.includes(".")
      ) {
        return { invalidPortalUrl: true };
      }

      return null;
    } catch {
      return { invalidPortalUrl: true };
    }
  }

  /**
   * Load Portal
   */
  private loadPortalData(id: string): void {
    this.ngxLoader.start();

    this.portalService.getById(id).subscribe({
      next: (res: any) => {
        this.ngxLoader.stop();

        if (res?.success && res?.data) {
          const portal = res.data;

          this.portalForm.patchValue({
            name: portal.name || "",
            url: portal.url || "",
            description: portal.description || "",
          });

          // Keep fields disabled in view mode.
          if (this.isViewMode) {
            this.portalForm.disable();
          }
        } else {
          this.toastr.error(res?.message || "Portal not found");
          this.router.navigate(["/manage-portals"]);
        }
      },

      error: (err: any) => {
        this.ngxLoader.stop();

        console.error("Failed to load portal:", err);

        this.toastr.error(
          err?.error?.message || "Failed to load portal",
        );

        this.router.navigate(["/manage-portals"]);
      },
    });
  }

  /**
   * Save / Update Portal
   */
  savePortal(): void {
    this.submitted = true;

    if (this.isViewMode) {
      return;
    }

    if (this.portalForm.invalid) {
      this.portalForm.markAllAsTouched();
      this.toastr.error("Please fill in all required fields correctly.");
      return;
    }

    this.errorMessage = null;
    this.ngxLoader.start();

    const formValue = this.portalForm.getRawValue();

    const payload: any = {
      name: String(formValue.name || "").trim(),
      url: String(formValue.url || "").trim(),
      description:
        String(formValue.description || "").trim() || null,
    };

    /*
     * Update Portal
     */
    if (this.isEditMode) {
      payload.id = this.portalId;

      this.portalService.update(payload).subscribe({
        next: (res: any) => {
          this.ngxLoader.stop();

          if (res?.success) {
            this.toastr.success("Portal updated successfully");
            this.router.navigate(["/manage-portals"]);
          } else {
            this.errorMessage =
              res?.message || "Failed to update portal";

            this.toastr.error(
              this.errorMessage || "Failed to update portal",
            );
          }
        },

        error: (err: any) => {
          this.ngxLoader.stop();

          console.error("Update portal error:", err);

          this.errorMessage =
            err?.error?.message || "Failed to update portal";

          this.toastr.error(
            this.errorMessage || "Failed to update portal",
          );
        },
      });
    } else {
      /*
       * Create Portal
       */
      this.portalService.create(payload).subscribe({
        next: (res: any) => {
          this.ngxLoader.stop();

          if (res?.success) {
            this.toastr.success("Portal created successfully");
            this.router.navigate(["/manage-portals"]);
          } else {
            this.errorMessage =
              res?.message || "Failed to create portal";

            this.toastr.error(
              this.errorMessage || "Failed to create portal",
            );
          }
        },

        error: (err: any) => {
          this.ngxLoader.stop();

          console.error("Create portal error:", err);

          this.errorMessage =
            err?.error?.message || "Failed to create portal";

          this.toastr.error(
            this.errorMessage || "Failed to create portal",
          );
        },
      });
    }
  }

  /**
   * Cancel
   */
  cancel(): void {
    this.router.navigate(["/manage-portals"]);
  }

  /**
   * Enable Edit Mode
   */
  enableEditMode(): void {
    this.isViewMode = false;
    this.portalForm.enable();
  }
}
