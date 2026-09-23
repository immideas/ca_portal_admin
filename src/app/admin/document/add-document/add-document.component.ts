import {
  Component,
  OnDestroy,
  OnInit,
  ElementRef,
  ViewChild,
  HostListener,
} from "@angular/core";

import { Router, ActivatedRoute, RouterModule } from "@angular/router";

import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
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

import { DocumentGroupService } from "../../../services/document-group.service";

import { UploadService } from "../../../services/upload.service";

import { UploadType } from "../../../shared/enums/uploadTypeEnums";

import { ImageUploaderLibComponent } from "@swiftlyme/image-uploader";

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
    FormsModule,
    NgxUiLoaderModule,
    ToastrModule,
    MatDialogModule,
    ImageUploaderLibComponent,
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

  // =========================================================
  // DOCUMENT PREVIEW
  // =========================================================

  @ViewChild("documentPreviewUploaderHost")
  documentPreviewUploaderHost?: ElementRef<HTMLElement>;

  maxPreviewImages = 1;

  documentPreview: {
    fileName: string;
    filePath: string;
    fileType: string;
    fileSize: number;
    previewUrl: string;
  } | null = null;

  // S3 files uploaded during current Add/Edit session
  private newlyUploadedDocumentPreviewKeys: Set<string> = new Set<string>();

  // Existing S3 file which should be deleted only after DB update succeeds
  private pendingDeleteDocumentPreviewKeys: string[] = [];

  // =========================================================
  // DOCUMENT TYPES
  // =========================================================

  documentTypes: any[] = [];

  loadingDocumentTypes = false;

  // =========================================================
  // DOCUMENT GROUPS
  // =========================================================

  documentGroups: any[] = [];

  loadingDocumentGroups = false;

  // =========================================================
  // DOCUMENT GROUP MULTI SELECT
  // =========================================================

  filteredDocumentGroups: any[] = [];

  showGroupDropdown = false;

  groupSearchText = "";

  constructor(
    private fb: FormBuilder,

    private router: Router,

    private route: ActivatedRoute,

    private ngxLoader: NgxUiLoaderService,

    private toastr: ToastrService,

    private dialog: MatDialog,

    private documentService: DocumentService,

    private documentTypeService: DocumentTypeService,

    private documentGroupService: DocumentGroupService,

    private uploadService: UploadService,
  ) {
    this.documentForm = this.fb.group({
      // =================================================
      // DOCUMENT GROUPS
      // One document can belong to multiple groups
      // =================================================

      groupIds: [[], [Validators.required]],

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
    // =================================================
    // Load active Document Groups
    // =================================================

    this.loadDocumentGroups();

    // =================================================
    // Load active Document Types
    // =================================================

    this.loadDocumentTypes();

    // =================================================
    // Check route ID
    // =================================================

    this.route.paramMap.subscribe((params) => {
      this.documentId = params.get("id");

      if (this.documentId) {
        this.isEditMode = true;

        this.fetchDocumentData(this.documentId);
      }
    });

    // =================================================
    // Check view mode
    // =================================================

    this.route.queryParamMap.subscribe((queryParams) => {
      this.isViewMode = queryParams.get("viewMode") === "true";

      if (this.isViewMode) {
        this.documentForm.disable();
      }
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
  // LOAD ACTIVE DOCUMENT GROUPS
  // =====================================================

  loadDocumentGroups(): void {
    this.loadingDocumentGroups = true;

    this.documentGroupService.getActiveDocumentGroups().subscribe({
      next: (response: any) => {
        this.loadingDocumentGroups = false;

        if (response?.success) {
          this.documentGroups = response.data || [];
        } else {
          this.documentGroups = response?.data || response || [];
        }

        // Initialize filtered document groups
        this.filteredDocumentGroups = [...this.documentGroups];

        console.log("Document Groups:", this.documentGroups);
      },

      error: (err: any) => {
        this.loadingDocumentGroups = false;

        this.documentGroups = [];
        this.filteredDocumentGroups = [];

        console.error("Failed to load document groups:", err);

        this.toastr.error(
          err?.error?.message || "Failed to load document groups",
          "Error",
        );
      },
    });
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
  // DOCUMENT GROUP MULTI SELECT
  // =====================================================

  toggleGroupDropdown(event?: Event): void {
    if (this.isViewMode) {
      return;
    }

    if (event) {
      event.stopPropagation();
    }

    this.showGroupDropdown = !this.showGroupDropdown;

    if (this.showGroupDropdown) {
      this.groupSearchText = "";
      this.filteredDocumentGroups = [...this.documentGroups];
    }
  }

  filterDocumentGroups(): void {
    const search = (this.groupSearchText || "").trim().toLowerCase();

    if (!search) {
      this.filteredDocumentGroups = [...this.documentGroups];
      return;
    }

    this.filteredDocumentGroups = this.documentGroups.filter(
      (group: any) =>
        group.groupName?.toLowerCase().includes(search) ||
        group.groupCode?.toLowerCase().includes(search),
    );
  }

  isDocumentGroupSelected(groupId: number | string): boolean {
    const selectedIds = this.documentForm.get("groupIds")?.value || [];

    return selectedIds.some(
      (id: any) => Number(id) === Number(groupId),
    );
  }

  toggleDocumentGroup(groupId: number | string, event: Event): void {
    event.stopPropagation();

    if (this.isViewMode) {
      return;
    }

    let selectedIds: number[] =
      this.documentForm.get("groupIds")?.value || [];

    selectedIds = selectedIds.map((id: any) => Number(id));

    const numericGroupId = Number(groupId);

    if (selectedIds.includes(numericGroupId)) {
      selectedIds = selectedIds.filter(
        (id: number) => id !== numericGroupId,
      );
    } else {
      selectedIds.push(numericGroupId);
    }

    this.documentForm.get("groupIds")?.setValue(selectedIds);
    this.documentForm.get("groupIds")?.markAsTouched();
    this.documentForm.get("groupIds")?.markAsDirty();
  }

  selectAllDocumentGroups(event: Event): void {
    event.stopPropagation();

    if (this.isViewMode) {
      return;
    }

    const allGroupIds = this.documentGroups
      .map((group: any) => Number(group.id))
      .filter((id: number) => !isNaN(id) && id > 0);

    this.documentForm.get("groupIds")?.setValue(allGroupIds);
    this.documentForm.get("groupIds")?.markAsTouched();
    this.documentForm.get("groupIds")?.markAsDirty();
  }

  clearAllDocumentGroups(event: Event): void {
    event.stopPropagation();

    if (this.isViewMode) {
      return;
    }

    this.documentForm.get("groupIds")?.setValue([]);
    this.documentForm.get("groupIds")?.markAsTouched();
    this.documentForm.get("groupIds")?.markAsDirty();
  }

  getSelectedDocumentGroups(): any[] {
    const selectedIds = this.documentForm.get("groupIds")?.value || [];

    if (!Array.isArray(selectedIds)) {
      return [];
    }

    return this.documentGroups.filter((group: any) =>
      selectedIds.some(
        (id: any) => Number(id) === Number(group.id),
      ),
    );
  }

  removeDocumentGroup(
    groupId: number | string,
    event: Event,
  ): void {
    event.stopPropagation();

    if (this.isViewMode) {
      return;
    }

    let selectedIds: number[] =
      this.documentForm.get("groupIds")?.value || [];

    selectedIds = selectedIds
      .map((id: any) => Number(id))
      .filter((id: number) => id !== Number(groupId));

    this.documentForm.get("groupIds")?.setValue(selectedIds);
    this.documentForm.get("groupIds")?.markAsDirty();
    this.documentForm.get("groupIds")?.markAsTouched();
  }

  @HostListener("document:click")
  closeGroupDropdown(): void {
    this.showGroupDropdown = false;
  }

  // =====================================================
  // GENERATE DOCUMENT CODE
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
      next: async (response: any) => {
        this.ngxLoader.stop();

        const documentData = response?.data || response;

        this.originalData = documentData;

        // =====================================================
        // LOAD EXISTING DOCUMENT PREVIEW
        // =====================================================

        this.documentPreview = null;

        if (documentData.documentPreview) {
          let previewUrl = documentData.documentPreview;

          try {
            previewUrl = await this.uploadService.getPreviewUrl(
              documentData.documentPreview,
            );
          } catch (err) {
            console.error("Failed to generate document preview URL:", err);
          }

          this.documentPreview = {
            fileName:
              documentData.documentPreview.split("/").pop() ||
              "document-preview",

            filePath: documentData.documentPreview,

            fileType: this.getDocumentPreviewFileType(
              documentData.documentPreview,
            ),

            fileSize: 0,

            previewUrl: previewUrl || documentData.documentPreview,
          };
        }

        // =====================================================
        // NORMALIZE GROUP IDS
        // =====================================================

        let groupIds: number[] = [];

        if (Array.isArray(documentData.groupIds)) {
          groupIds = documentData.groupIds
            .map((id: any) => Number(id))
            .filter((id: number) => !isNaN(id));
        }

        // =====================================================
        // PATCH FORM
        // =====================================================

        this.documentForm.patchValue({
          groupIds: groupIds,

          name: documentData.documentName || "",

          documentCode: documentData.documentCode || "",

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

        // =====================================================
        // KEEP DOCUMENT CODE DISABLED
        // =====================================================

        this.documentForm.get("documentCode")?.disable({
          emitEvent: false,
        });

        // =====================================================
        // VIEW MODE
        // =====================================================

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
  // DOCUMENT PREVIEW FILE TYPE
  // =====================================================

  private getDocumentPreviewFileType(filePath: string): string {
    const path = String(filePath || "")
      .split("?")[0]
      .toLowerCase();

    if (path.endsWith(".pdf")) {
      return "application/pdf";
    }

    if (path.endsWith(".png")) {
      return "image/png";
    }

    if (path.endsWith(".jpg") || path.endsWith(".jpeg")) {
      return "image/jpeg";
    }

    if (path.endsWith(".webp")) {
      return "image/webp";
    }

    return "image/*";
  }

  // =====================================================
  // CHECK PDF
  // =====================================================

  isDocumentPreviewPdf(): boolean {
    const fileType = String(this.documentPreview?.fileType || "").toLowerCase();

    const filePath = String(this.documentPreview?.filePath || "")
      .split("?")[0]
      .toLowerCase();

    return fileType === "application/pdf" || filePath.endsWith(".pdf");
  }

  // =========================================================
  // DOCUMENT PREVIEW HELPERS
  // =========================================================

  getDocumentPreviewUrls(): string[] {
    if (!this.documentPreview?.previewUrl) {
      return [];
    }

    return [this.documentPreview.previewUrl];
  }

  // =========================================================
  // DOCUMENT PREVIEW UPLOAD
  // =========================================================

  async onDocumentPreviewUpload(image: any): Promise<void> {
    if (this.isViewMode || !image?.file) {
      return;
    }

    try {
      const result = await this.uploadService.upload(
        image.file,
        UploadType.DOCUMENT_PREVIEW,
      );

      image.key = result.key;

      this.documentPreview = {
        fileName: image.file.name,

        filePath: result.key,

        fileType: image.file.type || "",

        fileSize: image.file.size,

        previewUrl: result.previewUrl || result.key,
      };

      this.newlyUploadedDocumentPreviewKeys.add(result.key);

      console.log("Document preview uploaded:", this.documentPreview);
    } catch (err: any) {
      console.error("Document preview S3 upload failed:", err);

      this.toastr.error(
        `Document preview upload failed: ${err?.message || err}`,
        "Error",
      );
    }
  }

  // =========================================================
  // DOCUMENT PREVIEW REPLACE
  // =========================================================

  async onDocumentPreviewReplace(event: any): Promise<void> {
    if (this.isViewMode || !event?.new?.file) {
      return;
    }

    const oldPreview = this.documentPreview;

    const oldKey = oldPreview?.filePath || "";

    try {
      // =====================================================
      // UPLOAD NEW PREVIEW FIRST
      // =====================================================

      const result = await this.uploadService.upload(
        event.new.file,
        UploadType.DOCUMENT_PREVIEW,
      );

      event.new.key = result.key;

      // =====================================================
      // HANDLE OLD S3 FILE
      // =====================================================

      if (
        oldKey &&
        typeof oldKey === "string" &&
        !oldKey.startsWith("http://") &&
        !oldKey.startsWith("https://")
      ) {
        // Old file was uploaded during this session

        if (this.newlyUploadedDocumentPreviewKeys.has(oldKey)) {
          try {
            await this.uploadService.delete(oldKey);

            this.newlyUploadedDocumentPreviewKeys.delete(oldKey);
          } catch (err) {
            console.error("Failed to delete old document preview:", err);
          }
        } else {
          // Existing DB file
          this.pendingDeleteDocumentPreviewKeys.push(oldKey);
        }
      }

      // =====================================================
      // STORE NEW PREVIEW
      // =====================================================

      this.documentPreview = {
        fileName: event.new.file.name,

        filePath: result.key,

        fileType: event.new.file.type || "",

        fileSize: event.new.file.size,

        previewUrl: result.previewUrl || result.key,
      };

      this.newlyUploadedDocumentPreviewKeys.add(result.key);

      console.log("Document preview replaced:", this.documentPreview);
    } catch (err: any) {
      console.error("Document preview replacement failed:", err);

      this.toastr.error(
        `Document preview replacement failed: ${err?.message || err}`,
        "Error",
      );
    }
  }

  // =========================================================
  // DOCUMENT PREVIEW DELETE
  // =========================================================

  async onDocumentPreviewDelete(): Promise<void> {
    const preview = this.documentPreview;

    if (!preview) {
      return;
    }

    const key = preview.filePath;

    // Newly uploaded during current session

    if (key && this.newlyUploadedDocumentPreviewKeys.has(key)) {
      try {
        await this.uploadService.delete(key);

        this.newlyUploadedDocumentPreviewKeys.delete(key);
      } catch (err) {
        console.error("Failed to delete new document preview from S3:", err);
      }
    }

    // Existing DB preview
    else if (key) {
      if (this.isEditMode && this.documentId) {
        try {
          await this.deleteExistingDocumentPreview();
        } catch (err) {
          console.error("Failed to delete existing document preview:", err);
        }
      }
    }

    this.documentPreview = null;
  }

  // =========================================================
  // DELETE EXISTING DOCUMENT PREVIEW
  // =========================================================

  private async deleteExistingDocumentPreview(): Promise<void> {
    if (!this.documentId) {
      return;
    }

    // IMPORTANT:
    // We should NOT directly delete the DB document here.
    // Only remove the preview field.

    await new Promise<void>((resolve, reject) => {
      this.documentService
        .updateDocument({
          id: this.documentId,
          documentPreview: null,
        })
        .subscribe({
          next: () => resolve(),

          error: (err) => reject(err),
        });
    });
  }

  // =========================================================
  // IMAGE CHANGE
  // =========================================================

  handleDocumentPreviewImagesChange(images: any[]): void {
    /*
     * Same safety behavior used by KYC.
     *
     * Image uploader can sometimes emit an empty/stale
     * imagesChange event.
     */

    if (!images) {
      return;
    }

    if (this.documentPreview && images.length === 0) {
      return;
    }
  }

  // =========================================================
  // IMAGE EDIT
  // =========================================================

  onDocumentPreviewEdit(image: any): void {
    console.log("Document preview edited:", image);
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
     * documentCode will still be included
     * in the API payload.
     */

    const formValue = this.documentForm.getRawValue();

    // =====================================================
    // NORMALIZE GROUP IDS
    // =====================================================

    const groupIds: number[] = Array.isArray(formValue.groupIds)
      ? formValue.groupIds
          .map((id: any) => Number(id))
          .filter((id: number) => !isNaN(id) && id > 0)
      : [];

    // =====================================================
    // VALIDATE GROUP IDS
    // =====================================================

    if (groupIds.length === 0) {
      this.ngxLoader.stop();

      this.isSaving = false;

      this.documentForm.get("groupIds")?.markAsTouched();

      this.toastr.error("Please select at least one document group.");

      return;
    }

    // =====================================================
    // PAYLOAD
    // =====================================================

    const payload: any = {
      groupIds: groupIds,

      documentName: formValue.name?.trim(),

      documentCode: formValue.documentCode?.trim(),

      documentTypeId: Number(formValue.documentTypeId),

      documentDescription: formValue.description?.trim() || null,

      isMandatory: formValue.isMandatory,

      allowedFileTypes: formValue.allowedFileTypes?.trim() || null,

      maxFileSize:
        formValue.maxFileSize !== null && formValue.maxFileSize !== ""
          ? Number(formValue.maxFileSize)
          : null,

      status: formValue.status,

      documentPreview: this.documentPreview?.filePath || null,
    };

    // =================================================
    // UPDATE
    // =================================================

    if (this.isEditMode && this.documentId) {
      payload.id = this.documentId;

      this.documentService.updateDocument(payload).subscribe({
        next: async () => {
          // =====================================================
          // DELETE OLD DOCUMENT PREVIEW FROM S3
          // ONLY AFTER DB UPDATE SUCCESS
          // =====================================================

          for (const key of this.pendingDeleteDocumentPreviewKeys) {
            try {
              await this.uploadService.delete(key);
            } catch (err) {
              console.error(
                "Failed to delete old document preview from S3:",
                key,
                err,
              );
            }
          }

          this.pendingDeleteDocumentPreviewKeys = [];

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
     * Document code should remain
     * auto-generated/read-only.
     */

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
