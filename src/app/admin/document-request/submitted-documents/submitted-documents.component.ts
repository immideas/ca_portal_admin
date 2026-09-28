import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { HttpClientModule } from "@angular/common/http";
import { FormsModule } from "@angular/forms";
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
    FormsModule,
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

  // =====================================================
  // DOCUMENT VERIFICATION
  // =====================================================

  showRejectModal = false;

  selectedDocument: any = null;

  rejectionReason = "";

  // =====================================================
  // CONSTRUCTOR
  // =====================================================

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

  // =====================================================
  // UPLOADED COUNT
  // =====================================================

  getUploadedCount(): number {
    return this.documents.filter((item) => item.uploaded).length;
  }

  // =====================================================
  // PENDING COUNT
  // =====================================================

  getPendingCount(): number {
    return this.documents.filter((item) => !item.uploaded).length;
  }

  // =====================================================
  // APPROVED COUNT
  // =====================================================

  getApprovedCount(): number {
    return this.documents.filter(
      (item) => item?.uploadedDocument?.status === "APPROVED",
    ).length;
  }

  // =====================================================
  // REJECTED COUNT
  // =====================================================

  getRejectedCount(): number {
    return this.documents.filter(
      (item) => item?.uploadedDocument?.status === "REJECTED",
    ).length;
  }

  // =====================================================
  // UNDER REVIEW COUNT
  // =====================================================

  getUnderReviewCount(): number {
    return this.documents.filter((item) => {
      const status = item?.uploadedDocument?.status;

      return status === "UPLOADED" || status === "UNDER_VERIFICATION";
    }).length;
  }

  // =====================================================
  // DOCUMENT STATUS
  // =====================================================

  isApproved(document: any): boolean {
    return document?.uploadedDocument?.status === "APPROVED";
  }

  isRejected(document: any): boolean {
    return document?.uploadedDocument?.status === "REJECTED";
  }

  isUnderReview(document: any): boolean {
    const status = document?.uploadedDocument?.status;

    return status === "UPLOADED" || status === "UNDER_VERIFICATION";
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
  // APPROVE DOCUMENT
  // =====================================================

  approveDocument(document: any): void {
    const documentId = document?.uploadedDocument?.id;

    if (!documentId) {
      this.toastr.error("Submitted document ID is missing", "Error");

      return;
    }

    this.documentRequestService.approveSubmittedDocument(documentId).subscribe({
      next: (response: any) => {
        if (!response?.success) {
          this.toastr.error(
            response?.message || "Failed to approve document",
            "Error",
          );

          return;
        }

        this.toastr.success("Document approved successfully", "Success");

        this.loadSubmittedDocuments();
      },

      error: (error: any) => {
        console.error("APPROVE DOCUMENT ERROR:", error);

        this.toastr.error(
          error?.error?.message || "Failed to approve document",
          "Error",
        );
      },
    });
  }

  // =====================================================
  // OPEN REJECT MODAL
  // =====================================================

  openRejectModal(document: any): void {
    this.selectedDocument = document;

    this.rejectionReason = "";

    this.showRejectModal = true;
  }

  // =====================================================
  // CLOSE REJECT MODAL
  // =====================================================

  closeRejectModal(): void {
    this.showRejectModal = false;

    this.selectedDocument = null;

    this.rejectionReason = "";
  }

  // =====================================================
  // REJECT DOCUMENT
  // =====================================================

  rejectDocument(): void {
    const documentId = this.selectedDocument?.uploadedDocument?.id;

    if (!documentId) {
      this.toastr.error("Submitted document ID is missing", "Error");

      return;
    }

    const reason = this.rejectionReason.trim();

    if (!reason) {
      this.toastr.warning("Please enter rejection reason", "Required");

      return;
    }

    this.documentRequestService
      .rejectSubmittedDocument(documentId, reason)
      .subscribe({
        next: (response: any) => {
          if (!response?.success) {
            this.toastr.error(
              response?.message || "Failed to reject document",
              "Error",
            );

            return;
          }

          this.toastr.success("Document rejected successfully", "Success");

          this.closeRejectModal();

          this.loadSubmittedDocuments();
        },

        error: (error: any) => {
          console.error("REJECT DOCUMENT ERROR:", error);

          this.toastr.error(
            error?.error?.message || "Failed to reject document",
            "Error",
          );
        },
      });
  }

  // =====================================================
  // TRACK BY
  // =====================================================

  trackByDocument(index: number, document: any): number {
    return Number(document?.requestItemId) || index;
  }
}
