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

import { DocumentGroupService } from "../../../services/document-group.service";

@Component({
  selector: "app-add-document-group",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    NgxUiLoaderModule,
    ToastrModule,
  ],
  templateUrl: "./add-document-group.component.html",
  styleUrl: "./add-document-group.component.css",
})
export class AddDocumentGroupComponent implements OnInit {
  documentGroupForm: FormGroup;

  submitted = false;

  isEditMode = false;
  isViewMode = false;

  documentGroupId: string | null = null;

  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private documentGroupService: DocumentGroupService,
    private router: Router,
    private route: ActivatedRoute,
    private ngxLoader: NgxUiLoaderService,
    private toastr: ToastrService,
  ) {
    this.documentGroupForm = this.fb.group({
      groupName: [
        "",
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(100),
        ],
      ],

      groupCode: [
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
      this.documentGroupId = params.get("id");

      if (this.documentGroupId) {
        this.isEditMode = true;

        this.loadDocumentGroupData(this.documentGroupId);
      }
    });

    /*
     * Check View Mode
     */
    this.route.queryParamMap.subscribe((queryParams) => {
      this.isViewMode = queryParams.get("viewMode") === "true";

      if (this.isViewMode) {
        this.documentGroupForm.disable();
      }
    });

    /*
     * Automatically generate Group Code
     * from Group Name
     */
    this.documentGroupForm
      .get("groupName")
      ?.valueChanges.subscribe((value: string) => {
        if (this.isViewMode) {
          return;
        }

        const generatedCode = this.generateGroupCode(value);

        this.documentGroupForm.get("groupCode")?.setValue(generatedCode, {
          emitEvent: false,
        });
      });
  }

  /**
   * Generate Group Code from Group Name
   *
   * Examples:
   *
   * Identity & KYC
   * => IDENTITY_KYC
   *
   * Salary & Income
   * => SALARY_INCOME
   *
   * Tax Statements & TDS
   * => TAX_STATEMENTS_TDS
   */
  private generateGroupCode(groupName: string): string {
    if (!groupName) {
      return "";
    }

    return groupName
      .trim()
      .toUpperCase()
      .replace(/&/g, " ")
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .replace(/_+/g, "_")
      .substring(0, 100);
  }

  /**
   * Load Document Group
   */
  private loadDocumentGroupData(id: string): void {
    this.ngxLoader.start();

    this.documentGroupService.getById(id).subscribe({
      next: (res: any) => {
        this.ngxLoader.stop();

        if (res?.success && res?.data) {
          const documentGroup = res.data;

          this.documentGroupForm.patchValue({
            groupName: documentGroup.groupName || "",

            groupCode: documentGroup.groupCode || "",

            description: documentGroup.description || "",

            status: documentGroup.status ?? 1,
          });
        } else {
          this.toastr.error(res?.message || "Document group not found");

          this.router.navigate(["/document-groups"]);
        }
      },

      error: (err: any) => {
        this.ngxLoader.stop();

        console.error("Failed to load document group:", err);

        this.toastr.error(
          err?.error?.message || "Failed to load document group",
        );

        this.router.navigate(["/document-groups"]);
      },
    });
  }

  /**
   * Save / Update Document Group
   */
  saveDocumentGroup(): void {
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
    if (this.documentGroupForm.invalid) {
      this.documentGroupForm.markAllAsTouched();

      this.toastr.error("Please fill in all required fields correctly.");

      return;
    }

    this.errorMessage = null;

    this.ngxLoader.start();

    const formValue = this.documentGroupForm.getRawValue();

    /*
     * Generate code again before saving.
     *
     * This guarantees that the backend receives
     * the correct code even if the form was changed.
     */
    const generatedGroupCode = this.generateGroupCode(formValue.groupName);

    const payload: any = {
      groupName: formValue.groupName?.trim(),

      groupCode: generatedGroupCode,

      description: formValue.description?.trim() || null,

      status: formValue.status === 0 ? 0 : 1,
    };

    /*
     * Update
     */
    if (this.isEditMode) {
      payload.id = this.documentGroupId;

      this.documentGroupService.update(payload).subscribe({
        next: (res: any) => {
          this.ngxLoader.stop();

          if (res?.success) {
            this.toastr.success("Document group updated successfully");

            this.router.navigate(["/document-groups"]);
          } else {
            this.toastr.error(
              res?.message || "Failed to update document group",
            );
          }
        },

        error: (err: any) => {
          this.ngxLoader.stop();

          console.error("Update document group error:", err);

          this.toastr.error(
            err?.error?.message || "Failed to update document group",
          );
        },
      });
    } else {
      /*
       * Create
       */
      this.documentGroupService.create(payload).subscribe({
        next: (res: any) => {
          this.ngxLoader.stop();

          if (res?.success) {
            this.toastr.success("Document group created successfully");

            this.router.navigate(["/document-groups"]);
          } else {
            this.toastr.error(
              res?.message || "Failed to create document group",
            );
          }
        },

        error: (err: any) => {
          this.ngxLoader.stop();

          console.error("Create document group error:", err);

          this.toastr.error(
            err?.error?.message || "Failed to create document group",
          );
        },
      });
    }
  }

  /**
   * Cancel
   */
  cancel(): void {
    this.router.navigate(["/document-groups"]);
  }

  /**
   * Enable Edit Mode
   */
  enableEditMode(): void {
    this.isViewMode = false;

    this.documentGroupForm.enable();
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
