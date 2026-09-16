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

import { DocumentTypeService } from "../../../services/document-type.service";

@Component({
  selector: "app-add-document-type",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    NgxUiLoaderModule,
    ToastrModule,
  ],
  templateUrl: "./add-document-type.component.html",
  styleUrl: "./add-document-type.component.css",
})
export class AddDocumentTypeComponent implements OnInit {
  documentTypeForm: FormGroup;

  submitted = false;

  isEditMode = false;
  isViewMode = false;

  documentTypeId: string | null = null;

  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private documentTypeService: DocumentTypeService,
    private router: Router,
    private route: ActivatedRoute,
    private ngxLoader: NgxUiLoaderService,
    private toastr: ToastrService,
  ) {
    this.documentTypeForm = this.fb.group({
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
      this.documentTypeId = params.get("id");

      if (this.documentTypeId) {
        this.isEditMode = true;

        this.loadDocumentTypeData(this.documentTypeId);
      }
    });

    /*
     * Check View Mode
     */
    this.route.queryParamMap.subscribe((queryParams) => {
      this.isViewMode = queryParams.get("viewMode") === "true";

      if (this.isViewMode) {
        this.documentTypeForm.disable();
      }
    });
  }

  /**
   * Load Document Type
   */
  private loadDocumentTypeData(id: string): void {
    this.ngxLoader.start();

    this.documentTypeService.getById(id).subscribe({
      next: (res: any) => {
        this.ngxLoader.stop();

        if (res?.success && res?.data) {
          const documentType = res.data;

          this.documentTypeForm.patchValue({
            name: documentType.name || "",
            description: documentType.description || "",
            status: documentType.status ?? 1,
          });
        } else {
          this.toastr.error(res?.message || "Document type not found");

          this.router.navigate(["/document-types"]);
        }
      },

      error: (err: any) => {
        this.ngxLoader.stop();

        console.error("Failed to load document type:", err);

        this.toastr.error(
          err?.error?.message || "Failed to load document type",
        );

        this.router.navigate(["/document-types"]);
      },
    });
  }

  /**
   * Save / Update Document Type
   */
  saveDocumentType(): void {
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
    if (this.documentTypeForm.invalid) {
      this.documentTypeForm.markAllAsTouched();

      this.toastr.error("Please fill in all required fields correctly.");

      return;
    }

    this.errorMessage = null;

    this.ngxLoader.start();

    const formValue = this.documentTypeForm.getRawValue();

    const payload: any = {
      name: formValue.name?.trim(),

      description: formValue.description?.trim() || null,

      status: formValue.status === 0 ? 0 : 1,
    };

    /*
     * Update
     */
    if (this.isEditMode) {
      payload.id = this.documentTypeId;

      this.documentTypeService.update(payload).subscribe({
        next: (res: any) => {
          this.ngxLoader.stop();

          if (res?.success) {
            this.toastr.success("Document type updated successfully");

            this.router.navigate(["/document-types"]);
          } else {
            this.toastr.error(res?.message || "Failed to update document type");
          }
        },

        error: (err: any) => {
          this.ngxLoader.stop();

          console.error("Update document type error:", err);

          this.toastr.error(
            err?.error?.message || "Failed to update document type",
          );
        },
      });
    } else {

    /*
     * Create
     */
      this.documentTypeService.create(payload).subscribe({
        next: (res: any) => {
          this.ngxLoader.stop();

          if (res?.success) {
            this.toastr.success("Document type created successfully");

            this.router.navigate(["/document-types"]);
          } else {
            this.toastr.error(res?.message || "Failed to create document type");
          }
        },

        error: (err: any) => {
          this.ngxLoader.stop();

          console.error("Create document type error:", err);

          this.toastr.error(
            err?.error?.message || "Failed to create document type",
          );
        },
      });
    }
  }

  /**
   * Cancel
   */
  cancel(): void {
    this.router.navigate(["/document-types"]);
  }

  /**
   * Enable Edit Mode
   */
  enableEditMode(): void {
    this.isViewMode = false;

    this.documentTypeForm.enable();
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
