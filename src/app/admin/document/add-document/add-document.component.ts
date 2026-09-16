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

import { DocumentService } from "../../../services/document.service";

import { DocumentTypeService } from "../../../services/document-type.service";

@Component({
  selector: "app-add-document",

  templateUrl: "./add-document.component.html",

  styleUrls: ["./add-document.component.css"],

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
export class AddDocumentComponent implements OnInit, OnDestroy {
  documentForm: FormGroup;

  token: string | null = localStorage.getItem("token");

  submitted = false;

  isEditMode = false;

  isViewMode = false;

  documentId: string | null = null;

  originalData: any = null;

  isSaving = false;

  /*
   * Document Types
   */
  documentTypes: any[] = [];

  loadingDocumentTypes = false;
  documentGroups: any[] = [];
loadingDocumentGroups = false;
filteredDocumentGroups: any[] = [];
showGroupSuggestions = false;

  constructor(
    private fb: FormBuilder,

    private router: Router,

    private route: ActivatedRoute,

    private ngxLoader: NgxUiLoaderService,

    private toastr: ToastrService,

    private dialog: MatDialog,

    private documentService: DocumentService,

    private documentTypeService: DocumentTypeService,
  ) {
    this.documentForm = this.fb.group({
      // =================================================
      // DOCUMENT GROUP NAME
      // =================================================

      groupName: [
        "",
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(150),
        ],
      ],

      // =================================================
      // DOCUMENT GROUP CODE
      // Automatically generated from groupName
      // =================================================

      groupCode: [
        {
          value: "",
          disabled: true,
        },
      ],

      // =================================================
      // DOCUMENT NAME
      // =================================================

      name: [
        "",
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(150),
        ],
      ],

      // =================================================
      // DOCUMENT CODE
      // Automatically generated from document name
      // =================================================

      documentCode: [
        {
          value: "",
          disabled: true,
        },
      ],

      // =================================================
      // DOCUMENT TYPE
      // =================================================

      documentTypeId: [null, [Validators.required]],

      // =================================================
      // DESCRIPTION
      // =================================================

      description: ["", [Validators.maxLength(1000)]],

      // =================================================
      // MANDATORY
      // =================================================

      isMandatory: [false, Validators.required],

      // =================================================
      // ALLOWED FILE TYPES
      // =================================================

      allowedFileTypes: ["", [Validators.maxLength(255)]],

      // =================================================
      // MAX FILE SIZE
      // =================================================

      maxFileSize: [null, [Validators.min(1)]],

      // =================================================
      // STATUS
      // =================================================

      status: [1, Validators.required],
    });
  }

  // =====================================================
  // INIT
  // =====================================================

  ngOnInit(): void {
    /*
     * Load active Document Types
     */
      this.loadDocumentGroups();
    this.loadDocumentTypes();

    /*
     * Check route ID.
     */
    this.route.paramMap.subscribe((params) => {
      this.documentId = params.get("id");

      if (this.documentId) {
        this.isEditMode = true;

        this.fetchDocumentData(this.documentId);
      }
    });

    /*
     * Check view mode.
     */
    this.route.queryParamMap.subscribe((queryParams) => {
      this.isViewMode = queryParams.get("viewMode") === "true";

      if (this.isViewMode) {
        this.documentForm.disable();
      }
    });

    // =================================================
    // AUTO GENERATE GROUP CODE
    // =================================================

    this.documentForm.get("groupName")?.valueChanges.subscribe((value) => {
      /*
       * Do not regenerate existing code while editing.
       * Existing group code should remain unchanged.
       */
      if (this.isEditMode) {
        return;
      }

      const code = this.generateCode(value);

      this.documentForm.get("groupCode")?.setValue(code, {
        emitEvent: false,
      });
    });

    // =================================================
    // AUTO GENERATE DOCUMENT CODE
    // =================================================

    this.documentForm.get("name")?.valueChanges.subscribe((value) => {
      /*
       * Do not regenerate existing code while editing.
       * Existing document code should remain unchanged.
       */
      if (this.isEditMode) {
        return;
      }

      const code = this.generateCode(value);

      this.documentForm.get("documentCode")?.setValue(code, {
        emitEvent: false,
      });
    });
  }
  // =====================================================
// LOAD EXISTING DOCUMENT GROUPS
// =====================================================

// =====================================================
// LOAD EXISTING DOCUMENT GROUPS
// =====================================================

loadDocumentGroups(): void {
  this.loadingDocumentGroups = true;

  this.documentService.listUniqueGroupNames().subscribe({
    next: (response: any) => {
      this.loadingDocumentGroups = false;

      if (response?.success) {
        this.documentGroups = response.data || [];
      } else {
        this.documentGroups = response?.data || response || [];
      }

      // Initially show all groups
      this.filteredDocumentGroups = this.documentGroups;

      console.log("Document Groups:", this.documentGroups);
    },

    error: (err: any) => {
      this.loadingDocumentGroups = false;

      this.documentGroups = [];
      this.filteredDocumentGroups = [];

      console.error("Failed to load document groups:", err);

      this.toastr.error(
        err?.error?.message || "Failed to load document groups",
        "Error"
      );
    }
  });
}
// =====================================================
// SEARCH DOCUMENT GROUPS
// =====================================================

onGroupInput(event: Event): void {
  const input = event.target as HTMLInputElement;

  const value = input.value.trim().toLowerCase();

  this.showGroupSuggestions = true;

  if (!value) {
    this.filteredDocumentGroups = this.documentGroups;
    return;
  }

  this.filteredDocumentGroups = this.documentGroups.filter(
    (group) =>
      group.groupName?.toLowerCase().includes(value) ||
      group.groupCode?.toLowerCase().includes(value)
  );
}
// =====================================================
// SELECT EXISTING DOCUMENT GROUP
// =====================================================

selectDocumentGroup(group: any): void {
  this.documentForm.patchValue({
    groupName: group.groupName,
    groupCode: group.groupCode
  });

  this.showGroupSuggestions = false;
}
// =====================================================
// HIDE GROUP SUGGESTIONS
// =====================================================

hideGroupSuggestions(): void {
  setTimeout(() => {
    this.showGroupSuggestions = false;
  }, 200);
}
  // =====================================================
  // LOAD DOCUMENT TYPES
  // =====================================================

  loadDocumentTypes(): void {
    this.loadingDocumentTypes = true;

    this.documentTypeService.getActiveDocumentTypes().subscribe({
      next: (response: any) => {
        this.loadingDocumentTypes = false;

        if (response?.success) {
          this.documentTypes = response.data || [];
        } else {
          this.documentTypes = [];

          this.toastr.error(
            response?.message || "Failed to load document types",
            "Error",
          );
        }
      },

      error: (err: any) => {
        this.loadingDocumentTypes = false;

        this.documentTypes = [];

        console.error("Failed to load document types:", err);

        this.toastr.error(
          err?.error?.message || "Failed to load document types",
          "Error",
        );
      },
    });
  }

  // =====================================================
  // GENERATE CODE
  // =====================================================

  private generateCode(value: string): string {
    return (value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  // =====================================================
  // FETCH DOCUMENT
  // =====================================================

  fetchDocumentData(id: string): void {
    this.ngxLoader.start();

    this.documentService.listDocumentById(id).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();

        const documentData = response?.data || response;

        this.originalData = documentData;

        this.documentForm.patchValue({
          groupName: documentData.groupName || "",

          groupCode: documentData.groupCode || "",

          name: documentData.documentName || "",

          documentCode: documentData.documentCode || "",

          /*
           * NEW
           *
           * Backend now returns:
           *
           * documentTypeId: 1
           *
           * and also:
           *
           * documentType: {
           *   id: 1,
           *   name: "Identity Proof"
           * }
           */
          documentTypeId:
            documentData.documentTypeId ??
            documentData.documentType?.id ??
            null,

          description: documentData.documentDescription || "",

          isMandatory: documentData.isMandatory ?? false,

          allowedFileTypes: documentData.allowedFileTypes || "",

          maxFileSize: documentData.maxFileSize ?? null,

          status: documentData.status ?? 1,
        });

        /*
         * Keep the existing codes disabled.
         */
        this.documentForm.get("groupCode")?.disable({
          emitEvent: false,
        });

        this.documentForm.get("documentCode")?.disable({
          emitEvent: false,
        });

        /*
         * View mode
         */
        if (this.isViewMode) {
          this.documentForm.disable();
        }
      },

      error: (err: any) => {
        this.ngxLoader.stop();

        console.error("Failed to fetch document:", err);

        this.toastr.error(
          err?.error?.message || "Failed to fetch document",
          "Error",
        );
      },
    });
  }

  // =====================================================
  // SAVE DOCUMENT
  // =====================================================

  saveDocument(): void {
    this.submitted = true;

    if (this.documentForm.invalid) {
      this.documentForm.markAllAsTouched();

      this.toastr.error("Please fill in all required fields correctly.");

      return;
    }

    this.isSaving = true;

    this.ngxLoader.start();

    /*
     * IMPORTANT:
     *
     * getRawValue() includes disabled fields.
     *
     * Therefore groupCode and documentCode
     * will still be included in the API payload.
     */
    const formValue = this.documentForm.getRawValue();

    const payload: any = {
      groupName: formValue.groupName?.trim(),

      groupCode: formValue.groupCode?.trim(),

      documentName: formValue.name?.trim(),

      documentCode: formValue.documentCode?.trim(),

      /*
       * NEW
       *
       * Send Document Type ID
       *
       * Example:
       *
       * documentTypeId: 2
       */
      documentTypeId: Number(formValue.documentTypeId),

      documentDescription: formValue.description?.trim() || null,

      isMandatory: formValue.isMandatory,

      allowedFileTypes: formValue.allowedFileTypes?.trim() || null,

      maxFileSize:
        formValue.maxFileSize !== null && formValue.maxFileSize !== ""
          ? Number(formValue.maxFileSize)
          : null,

      status: formValue.status,
    };

    // =================================================
    // UPDATE
    // =================================================

    if (this.isEditMode && this.documentId) {
      payload.id = this.documentId;

      this.documentService.updateDocument(payload).subscribe({
        next: () => {
          this.ngxLoader.stop();

          this.isSaving = false;

          this.toastr.success("Document updated successfully", "Success");

          this.router.navigate(["/documents"]);
        },

        error: (err: any) => {
          this.ngxLoader.stop();

          this.isSaving = false;

          console.error("Update document failed:", err);

          this.toastr.error(
            err?.error?.message || "Failed to update document",
            "Error",
          );
        },
      });
    }

    // =================================================
    // CREATE
    // =================================================
    else {
      this.documentService.createDocument(payload).subscribe({
        next: () => {
          this.ngxLoader.stop();

          this.isSaving = false;

          this.toastr.success("Document added successfully", "Success");

          this.router.navigate(["/documents"]);
        },

        error: (err: any) => {
          this.ngxLoader.stop();

          this.isSaving = false;

          console.error("Create document failed:", err);

          this.toastr.error(
            err?.error?.message || "Failed to add document",
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
    this.router.navigate(["/documents"]);
  }

  // =====================================================
  // ENABLE EDIT MODE
  // =====================================================

  enableEditMode(): void {
    this.isViewMode = false;

    this.documentForm.enable();

    /*
     * Codes should remain auto-generated/read-only.
     */
    this.documentForm.get("groupCode")?.disable({
      emitEvent: false,
    });

    this.documentForm.get("documentCode")?.disable({
      emitEvent: false,
    });
  }

  // =====================================================
  // CAN DEACTIVATE
  // =====================================================

  canDeactivate(): Observable<boolean> | Promise<boolean> | boolean {
    if (this.documentForm.dirty && !this.submitted && !this.isViewMode) {
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
