import { Component, OnInit } from "@angular/core";

import { CommonModule } from "@angular/common";

import { ActivatedRoute, Router, RouterModule } from "@angular/router";

import { HttpClientModule } from "@angular/common/http";

import { NgxUiLoaderModule, NgxUiLoaderService } from "ngx-ui-loader";

import { ToastrModule, ToastrService } from "ngx-toastr";

import { DocumentRequestService } from "../../../services/document-request.service";

@Component({
  selector: "app-submitted-documents",

  standalone: true,

  imports: [
    CommonModule,
    RouterModule,
    HttpClientModule,
    NgxUiLoaderModule,
    ToastrModule,
  ],

  templateUrl: "./submitted-documents.component.html",

  styleUrl: "./submitted-documents.component.css",
})
export class SubmittedDocumentsComponent implements OnInit {
  // =====================================================
  // REQUEST
  // =====================================================

  documentRequestId: number | null = null;

  documentRequest: any = null;

  documents: any[] = [];

  // =====================================================
  // LOADING
  // =====================================================

  loading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,

    private ngxLoader: NgxUiLoaderService,
    private toastr: ToastrService,

    private documentRequestService: DocumentRequestService,
  ) {}

  // =====================================================
  // INIT
  // =====================================================

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get("id");

      if (!id) {
        this.toastr.error("Document request ID is missing", "Error");

        this.cancel();

        return;
      }

      const numericId = Number(id);

      if (!Number.isInteger(numericId) || numericId <= 0) {
        this.toastr.error("Invalid document request ID", "Error");

        this.cancel();

        return;
      }

      this.documentRequestId = numericId;

      this.loadSubmittedDocuments();
    });
  }

  // =====================================================
  // LOAD SUBMITTED DOCUMENTS
  // =====================================================

  loadSubmittedDocuments(): void {
    if (!this.documentRequestId) {
      return;
    }

    this.loading = true;

    this.ngxLoader.start();

    this.documentRequestService
      .getSubmittedDocuments(this.documentRequestId)
      .subscribe({
        next: (response: any) => {
          this.loading = false;

          this.ngxLoader.stop();

          if (!response?.success) {
            this.toastr.error(
              response?.message || "Failed to load submitted documents",
              "Error",
            );

            return;
          }

          const data = response?.data || {};

          this.documentRequest = {
            requestId: data.requestId,

            requestCode: data.requestCode,

            requestStatus: data.requestStatus,
          };

          this.documents = Array.isArray(data.documents) ? data.documents : [];
        },

        error: (error: any) => {
          this.loading = false;

          this.ngxLoader.stop();

          console.error("SUBMITTED DOCUMENTS API ERROR:", error);

          this.toastr.error(
            error?.error?.message || "Failed to load submitted documents",
            "Error",
          );
        },
      });
  }

  // =====================================================
  // BACK
  // =====================================================

  cancel(): void {
    this.router.navigate(["/admin/document-request"]);
  }

  // =====================================================
  // CHECK DOCUMENT
  // =====================================================

  isUploaded(document: any): boolean {
    return Boolean(document?.uploaded && document?.uploadedDocument);
  }

  // =====================================================
  // IMAGE
  // =====================================================

  isImage(document: any): boolean {
    const fileType = String(
      document?.uploadedDocument?.fileType || "",
    ).toLowerCase();

    return (
      fileType.includes("image") ||
      ["jpg", "jpeg", "png", "webp", "gif"].includes(fileType)
    );
  }

  // =====================================================
  // PDF
  // =====================================================

  isPdf(document: any): boolean {
    const fileType = String(
      document?.uploadedDocument?.fileType || "",
    ).toLowerCase();

    return fileType.includes("pdf") || fileType === "application/pdf";
  }

  // =====================================================
  // FILE NAME
  // =====================================================

  getFileName(document: any): string {
    return (
      document?.uploadedDocument?.originalFileName ||
      document?.uploadedDocument?.fileName ||
      "Document"
    );
  }

  // =====================================================
  // FILE SIZE
  // =====================================================

  formatFileSize(bytes: number | null | undefined): string {
    if (!bytes) {
      return "0 KB";
    }

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  getUploadedCount(): number {
  return this.documents.filter(
    (item) => item.uploaded
  ).length;
}

getPendingCount(): number {
  return this.documents.filter(
    (item) => !item.uploaded
  ).length;
}

  // =====================================================
  // DOCUMENT URL
  // =====================================================

 getDocumentUrl(document: any): string {
  return document?.uploadedDocument?.fileUrl || "";
}

  // =====================================================
  // VIEW DOCUMENT
  // =====================================================

  viewDocument(document: any): void {
    const url = this.getDocumentUrl(document);

    if (!url) {
      this.toastr.warning("Document file is not available", "Warning");

      return;
    }

    window.open(url, "_blank");
  }

  // =====================================================
  // DOWNLOAD DOCUMENT
  // =====================================================

  downloadDocument(document: any): void {
    const url = this.getDocumentUrl(document);

    if (!url) {
      this.toastr.warning("Document file is not available", "Warning");

      return;
    }

    const link = window.document.createElement("a");

    link.href = url;

    link.target = "_blank";

    link.download = this.getFileName(document);

    link.click();
  }

  // =====================================================
  // TRACK BY
  // =====================================================

  trackByDocument(index: number, document: any): number {
    return Number(document?.requestItemId) || index;
  }
}
