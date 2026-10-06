import { Component, OnInit, OnDestroy } from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from "@angular/forms";

import { CommonModule } from "@angular/common";
import { HttpClientModule } from "@angular/common/http";
import { Router, RouterModule } from "@angular/router";

import { NgxUiLoaderModule, NgxUiLoaderService } from "ngx-ui-loader";

import { ToastrService, ToastrModule } from "ngx-toastr";

import { Observable } from "rxjs";

import { MatDialog, MatDialogModule } from "@angular/material/dialog";

import { ConfirmDialogComponent } from "../../confirm-dialog/confirm-dialog.component";

import { AdminConfigService } from "../../services/admin-config.service";

@Component({
  selector: "app-admin-config",

  templateUrl: "./admin-config.component.html",

  styleUrls: ["./admin-config.component.scss"],

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
export class AdminConfigComponent implements OnInit, OnDestroy {
  // =====================================================
  // FORM
  // =====================================================

  adminConfigForm: FormGroup;

  // =====================================================
  // STATE
  // =====================================================

  submitted = false;

  isEditMode = false;

  isSaving = false;

  configExists = false;

  configId: number | null = null;

  originalData: any = null;

  // =====================================================
  // CONSTRUCTOR
  // =====================================================

  constructor(
    private fb: FormBuilder,

    private router: Router,

    private ngxLoader: NgxUiLoaderService,

    private toastr: ToastrService,

    private dialog: MatDialog,

    private adminConfigService: AdminConfigService,
  ) {
    // ===================================================
    // FORM
    // ===================================================

    this.adminConfigForm = this.fb.group({
      // -------------------------------------------------
      // CGST
      // -------------------------------------------------

      cgstEnabled: [false],

      cgstPercentage: [0, [Validators.min(0), Validators.max(100)]],

      // -------------------------------------------------
      // SGST
      // -------------------------------------------------

      sgstEnabled: [false],

      sgstPercentage: [0, [Validators.min(0), Validators.max(100)]],

      // -------------------------------------------------
      // STATUS
      // -------------------------------------------------

      status: [1, Validators.required],
    });
  }

  // =====================================================
  // INIT
  // =====================================================

  ngOnInit(): void {
    this.getAdminConfig();

    // ===================================================
    // CGST ENABLE / DISABLE
    // ===================================================

    this.adminConfigForm
      .get("cgstEnabled")
      ?.valueChanges.subscribe((enabled: boolean) => {
        const control = this.adminConfigForm.get("cgstPercentage");

        if (enabled) {
          control?.enable();
        } else {
          control?.setValue(0, {
            emitEvent: false,
          });

          control?.disable({
            emitEvent: false,
          });
        }
      });

    // ===================================================
    // SGST ENABLE / DISABLE
    // ===================================================

    this.adminConfigForm
      .get("sgstEnabled")
      ?.valueChanges.subscribe((enabled: boolean) => {
        const control = this.adminConfigForm.get("sgstPercentage");

        if (enabled) {
          control?.enable();
        } else {
          control?.setValue(0, {
            emitEvent: false,
          });

          control?.disable({
            emitEvent: false,
          });
        }
      });
  }

  // =====================================================
  // GET ADMIN CONFIG
  // =====================================================

  getAdminConfig(): void {
    this.ngxLoader.start();

    this.adminConfigService.getAdminConfig().subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();

        const config = response?.data || null;

        // =================================================
        // CONFIG EXISTS
        // =================================================

        if (config) {
          this.configExists = true;

          this.configId = config.id || null;

          this.originalData = config;

          this.isEditMode = true;

          this.adminConfigForm.patchValue({
            cgstEnabled: !!config.cgstEnabled,

            cgstPercentage: Number(config.cgstPercentage || 0),

            sgstEnabled: !!config.sgstEnabled,

            sgstPercentage: Number(config.sgstPercentage || 0),

            status: config.status ?? 1,
          });

          // Enable percentage fields according
          // to current configuration.

          this.setTaxPercentageState();
        }

        // =================================================
        // CONFIG DOES NOT EXIST
        // =================================================
        else {
          this.configExists = false;

          this.isEditMode = false;

          this.configId = null;

          this.adminConfigForm.reset({
            cgstEnabled: false,

            cgstPercentage: 0,

            sgstEnabled: false,

            sgstPercentage: 0,

            status: 1,
          });

          this.setTaxPercentageState();
        }
      },

      error: (err: any) => {
        this.ngxLoader.stop();

        console.error("Failed to fetch admin config:", err);

        this.toastr.error(
          err?.error?.message || "Failed to fetch admin configuration",
          "Error",
        );
      },
    });
  }

  // =====================================================
  // TAX PERCENTAGE STATE
  // =====================================================

  setTaxPercentageState(): void {
    const cgstEnabled = this.adminConfigForm.get("cgstEnabled")?.value;

    const cgstControl = this.adminConfigForm.get("cgstPercentage");

    if (cgstEnabled) {
      cgstControl?.enable({
        emitEvent: false,
      });
    } else {
      cgstControl?.disable({
        emitEvent: false,
      });

      cgstControl?.setValue(0, {
        emitEvent: false,
      });
    }

    const sgstEnabled = this.adminConfigForm.get("sgstEnabled")?.value;

    const sgstControl = this.adminConfigForm.get("sgstPercentage");

    if (sgstEnabled) {
      sgstControl?.enable({
        emitEvent: false,
      });
    } else {
      sgstControl?.disable({
        emitEvent: false,
      });

      sgstControl?.setValue(0, {
        emitEvent: false,
      });
    }
  }

  // =====================================================
  // SAVE ADMIN CONFIG
  // =====================================================

  saveAdminConfig(): void {
    this.submitted = true;

    // ===================================================
    // VALIDATION
    // ===================================================

    if (this.adminConfigForm.invalid) {
      this.adminConfigForm.markAllAsTouched();

      this.toastr.error("Please fill in all required fields correctly.");

      return;
    }

    this.isSaving = true;

    this.ngxLoader.start();

    // ===================================================
    // GET FORM VALUE
    // ===================================================

    const formValue = this.adminConfigForm.getRawValue();

    // ===================================================
    // PAYLOAD
    // ===================================================

    const payload: any = {
      cgstEnabled: !!formValue.cgstEnabled,

      cgstPercentage: formValue.cgstEnabled
        ? Number(formValue.cgstPercentage || 0)
        : 0,

      sgstEnabled: !!formValue.sgstEnabled,

      sgstPercentage: formValue.sgstEnabled
        ? Number(formValue.sgstPercentage || 0)
        : 0,

      status: formValue.status,
    };

    // ===================================================
    // UPDATE
    // ===================================================

    if (this.isEditMode && this.configId) {
      payload.id = this.configId;

      this.adminConfigService.saveAdminConfig(payload).subscribe({
        next: () => {
          this.ngxLoader.stop();

          this.isSaving = false;

          this.toastr.success(
            "Admin configuration updated successfully",
            "Success",
          );

          this.getAdminConfig();
        },

        error: (err: any) => {
          this.ngxLoader.stop();

          this.isSaving = false;

          console.error("Update admin config failed:", err);

          this.toastr.error(
            err?.error?.message || "Failed to update admin configuration",
            "Error",
          );
        },
      });
    }

    // ===================================================
    // CREATE
    // ===================================================
    else {
      this.adminConfigService.saveAdminConfig(payload).subscribe({
        next: () => {
          this.ngxLoader.stop();

          this.isSaving = false;

          this.toastr.success(
            "Admin configuration created successfully",
            "Success",
          );

          this.getAdminConfig();
        },

        error: (err: any) => {
          this.ngxLoader.stop();

          this.isSaving = false;

          console.error("Create admin config failed:", err);

          this.toastr.error(
            err?.error?.message || "Failed to create admin configuration",
            "Error",
          );
        },
      });
    }
  }

  // =====================================================
  // CANCEL
  // =====================================================

  cancel(): void {
    this.router.navigate(["/dashboard"]);
  }

  // =====================================================
  // ENABLE EDIT MODE
  // =====================================================

  enableEditMode(): void {
    this.isEditMode = true;

    this.adminConfigForm.enable();

    this.setTaxPercentageState();
  }

  // =====================================================
  // CAN DEACTIVATE
  // =====================================================

  canDeactivate(): Observable<boolean> | Promise<boolean> | boolean {
    if (this.adminConfigForm.dirty && !this.submitted) {
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
