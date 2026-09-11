import { Component, OnDestroy, OnInit } from "@angular/core";

import { Router, ActivatedRoute, RouterModule } from "@angular/router";

import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from "@angular/forms";

import { CommonModule } from "@angular/common";

import { HttpClientModule } from "@angular/common/http";

import { NgxUiLoaderModule, NgxUiLoaderService } from "ngx-ui-loader";

import { ToastrService, ToastrModule } from "ngx-toastr";

import { Observable } from "rxjs";

import { MatDialog, MatDialogModule } from "@angular/material/dialog";

import { ConfirmDialogComponent } from "../../../confirm-dialog/confirm-dialog.component";

import { ClientGroupService } from "../../../services/client-group.service";

@Component({
  selector: "app-add-client-group",
  templateUrl: "./add-client-group.component.html",
  styleUrls: ["./add-client-group.component.css"],

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
export class AddClientGroupComponent implements OnInit, OnDestroy {
  clientGroupForm: FormGroup;

  token: string | null = localStorage.getItem("token");

  submitted = false;

  isEditMode = false;

  isViewMode = false;

  clientGroupId: string | null = null;

  originalData: any = null;

  isSaving = false;

  constructor(
    private fb: FormBuilder,

    private router: Router,

    private route: ActivatedRoute,

    private ngxLoader: NgxUiLoaderService,

    private toastr: ToastrService,

    private dialog: MatDialog,

    private clientGroupService: ClientGroupService,
  ) {
    this.clientGroupForm = this.fb.group({
      name: [
        "",
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(150),
        ],
      ],

      code: [
        {
          value: "",
          disabled: true,
        },
      ],

      description: ["", [Validators.maxLength(1000)]],

      status: [1, Validators.required],
    });
  }

  ngOnInit(): void {
    this.clientGroupForm.get("name")?.valueChanges.subscribe(() => {
  if (!this.isEditMode && !this.isViewMode) {
    this.generateGroupCode();
  }
});
    this.route.paramMap.subscribe((params) => {
      this.clientGroupId = params.get("id");

      if (this.clientGroupId) {
        this.isEditMode = true;

        this.fetchClientGroupData(this.clientGroupId);
      }
    });

    this.route.queryParamMap.subscribe((queryParams) => {
      this.isViewMode = queryParams.get("viewMode") === "true";

      if (this.isViewMode) {
        this.clientGroupForm.disable();
      }
    });
  }

  fetchClientGroupData(id: string): void {
    this.ngxLoader.start();

    this.clientGroupService.listClientGroupById(id).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();

        const groupData = response?.data || response;

        this.originalData = groupData;

        this.clientGroupForm.patchValue({
          name: groupData.name || "",

          code: groupData.code || "",

          description: groupData.description || "",

          status: groupData.status ?? 1,
        });

        if (this.isViewMode) {
          this.clientGroupForm.disable();
        }
      },

      error: (err: any) => {
        this.ngxLoader.stop();

        console.error("Failed to fetch client group:", err);

        this.toastr.error(
          err?.error?.message || "Failed to fetch client group",
          "Error",
        );
      },
    });
  }
generateGroupCode(): void {
  const name = this.clientGroupForm.get("name")?.value;

  if (!name || !name.trim()) {
    this.clientGroupForm.get("code")?.setValue("");
    return;
  }

  const words = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);

  let prefix = "";

  if (words.length === 1) {
    prefix = words[0].substring(0, 2);
  } else {
    prefix = words[0].charAt(0) + words[1].charAt(0);
  }

  this.clientGroupForm
    .get("code")
    ?.setValue(`${prefix}-001`);
}
  saveClientGroup(): void {
    this.submitted = true;

    if (this.clientGroupForm.invalid) {
      this.clientGroupForm.markAllAsTouched();

      this.toastr.error("Please fill in all required fields correctly.");

      return;
    }

    this.isSaving = true;

    this.ngxLoader.start();

    const formValue = this.clientGroupForm.getRawValue();

    const payload: any = {
      name: formValue.name?.trim(),

  code: formValue.code?.trim(),

      description: formValue.description?.trim() || null,

      status: formValue.status,
    };

    if (this.isEditMode && this.clientGroupId) {
      payload.id = this.clientGroupId;

      this.clientGroupService.updateClientGroup(payload).subscribe({
        next: () => {
          this.ngxLoader.stop();

          this.isSaving = false;

          this.toastr.success("Client group updated successfully", "Success");

          this.router.navigate(["/client-groups"]);
        },

        error: (err: any) => {
          this.ngxLoader.stop();

          this.isSaving = false;

          console.error("Update client group failed:", err);

          this.toastr.error(
            err?.error?.message || "Failed to update client group",
            "Error",
          );
        },
      });
    } else {
      this.clientGroupService.createClientGroup(payload).subscribe({
        next: () => {
          this.ngxLoader.stop();

          this.isSaving = false;

          this.toastr.success("Client group added successfully", "Success");

          this.router.navigate(["/client-groups"]);
        },

        error: (err: any) => {
          this.ngxLoader.stop();

          this.isSaving = false;

          console.error("Create client group failed:", err);

          this.toastr.error(
            err?.error?.message || "Failed to add client group",
            "Error",
          );
        },
      });
    }
  }

  cancel(): void {
    this.router.navigate(["/client-groups"]);
  }

  enableEditMode(): void {
    this.isViewMode = false;

    this.clientGroupForm.enable();

    /*
     * Group code should always remain readonly.
     */
    this.clientGroupForm.get("code")?.disable();
  }

  canDeactivate(): Observable<boolean> | Promise<boolean> | boolean {
    if (this.clientGroupForm.dirty && !this.submitted && !this.isViewMode) {
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

  ngOnDestroy(): void {}
}
