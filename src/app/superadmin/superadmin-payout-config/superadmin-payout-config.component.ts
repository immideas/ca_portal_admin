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

import { SuperadminConfigService } from "../../services/superadmin-config.service";

@Component({
  selector: "app-superadmin-payout-config",
  templateUrl: "./superadmin-payout-config.component.html",
  styleUrls: ["./superadmin-payout-config.component.scss"],
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
export class SuperadminPayoutConfigComponent implements OnInit, OnDestroy {
  // =====================================================
  // FORM
  // =====================================================

  superadminConfigForm: FormGroup;

  // =====================================================
  // STATE
  // =====================================================

  submitted = false;
  isEditMode = false;
  isSaving = false;
  configExists = false;
  configId: number | null = null;
  originalData: any = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private ngxLoader: NgxUiLoaderService,
    private toastr: ToastrService,
    private dialog: MatDialog,
    private superadminConfigService: SuperadminConfigService,
  ) {
    this.superadminConfigForm = this.fb.group({
      minPayoutAmount: [
        500,
        [
          Validators.required,
          Validators.min(0),
          Validators.max(9999999999.99),
          Validators.pattern(/^\d+(\.\d{1,2})?$/),
        ],
      ],

      status: [1, Validators.required],
    });
  }

  // =====================================================
  // INIT
  // =====================================================

  ngOnInit(): void {
    this.getSuperadminConfig();
  }

  // =====================================================
  // GET SUPERADMIN CONFIG
  // =====================================================

  getSuperadminConfig(): void {
    this.ngxLoader.start();

    this.superadminConfigService.getSuperadminConfig().subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();

        const config = response?.data || null;

        if (config) {
          this.configExists = true;
          this.configId = config.id || null;
          this.originalData = config;
          this.isEditMode = true;

          this.superadminConfigForm.patchValue({
            minPayoutAmount: Number(config.minPayoutAmount ?? 500),
            status: Number(config.status ?? 1),
          });

          this.superadminConfigForm.markAsPristine();
        } else {
          this.configExists = false;
          this.configId = null;
          this.originalData = null;
          this.isEditMode = false;

          this.superadminConfigForm.reset({
            minPayoutAmount: 500,
            status: 1,
          });

          this.superadminConfigForm.markAsPristine();
        }
      },

      error: (err: any) => {
        this.ngxLoader.stop();

        console.error("Failed to fetch Superadmin config:", err);

        this.toastr.error(
          err?.error?.message || "Failed to fetch Superadmin configuration",
          "Error",
        );
      },
    });
  }

  // =====================================================
  // SAVE SUPERADMIN CONFIG
  // =====================================================

  saveSuperadminConfig(): void {
    this.submitted = true;

    if (this.superadminConfigForm.invalid) {
      this.superadminConfigForm.markAllAsTouched();

      this.toastr.error("Please enter a valid minimum payout amount.");

      return;
    }

    this.isSaving = true;
    this.ngxLoader.start();

    const formValue = this.superadminConfigForm.getRawValue();

    const payload = {
      minPayoutAmount: Number(formValue.minPayoutAmount),
      status: Number(formValue.status),
    };

    this.superadminConfigService.saveSuperadminConfig(payload).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.isSaving = false;

        this.toastr.success(
          response?.message || "Superadmin configuration saved successfully",
          "Success",
        );

        this.getSuperadminConfig();
      },

      error: (err: any) => {
        this.ngxLoader.stop();
        this.isSaving = false;

        console.error("Save Superadmin config failed:", err);

        this.toastr.error(
          err?.error?.message || "Failed to save Superadmin configuration",
          "Error",
        );
      },
    });
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
    this.superadminConfigForm.enable();
  }

  // =====================================================
  // CAN DEACTIVATE
  // =====================================================

  canDeactivate(): Observable<boolean> | Promise<boolean> | boolean {
    if (this.superadminConfigForm.dirty && !this.submitted) {
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
