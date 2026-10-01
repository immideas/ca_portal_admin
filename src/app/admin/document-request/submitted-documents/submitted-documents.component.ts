import { Component, Input, OnInit, HostListener } from "@angular/core";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
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
  @Input() serviceId!: number;
  @Input() serviceRequestId!: number;
  @Input() embedded = false;
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
  // DOCUMENT PREVIEW MODAL
  // =====================================================

  showDocumentPreview = false;
  previewDocument: any = null;
  previewUrl = "";
  previewSafeUrl: SafeResourceUrl | null = null;
  previewType: "image" | "pdf" | "file" | "" = "";
  previewLoading = false;

  // =====================================================
  // CONSTRUCTOR
  // =====================================================

  constructor(
    private route: ActivatedRoute,
    private router: Router,

    private ngxLoader: NgxUiLoaderService,
    private toastr: ToastrService,

    private documentRequestService: DocumentRequestService,
    private sanitizer: DomSanitizer,
  ) {}

  // =====================================================
  // INIT
  // =====================================================

  ngOnInit(): void {
    // =====================================================
    // SERVICE VIEW MODE
    // =====================================================

    if (this.serviceId) {
      this.loadSubmittedDocumentsByService();
      return;
    }

    // =====================================================
    // NORMAL REQUEST MODE
    // =====================================================

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
  // ESCAPE KEY
  // =====================================================

  @HostListener("document:keydown.escape")
  onEscapeKey(): void {
    if (this.showDocumentPreview) {
      this.closeDocumentPreview();
    }

    if (this.showRejectModal) {
      this.closeRejectModal();
    }
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
  // LOAD SUBMITTED DOCUMENTS BY SERVICE
  // =====================================================

 loadSubmittedDocumentsByService(): void {
  if (!this.serviceRequestId) {
    return;
  }

  this.loading = true;

  this.ngxLoader.start();

  this.documentRequestService
    .getSubmittedDocuments(this.serviceRequestId)
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

        this.documents = Array.isArray(data.documents)
          ? data.documents
          : [];
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

    const fileName = String(
      document?.uploadedDocument?.originalFileName ||
        document?.uploadedDocument?.fileName ||
        "",
    ).toLowerCase();

    // Check MIME type
    if (fileType.includes("image")) {
      return true;
    }

    // Check extension
    const imageExtensions = ["jpg", "jpeg", "png", "webp", "gif", "bmp", "svg"];

    const extension = fileName.split(".").pop() || "";

    return imageExtensions.includes(extension);
  }
  // =====================================================
  // PDF
  // =====================================================

  isPdf(document: any): boolean {
    const fileType = String(
      document?.uploadedDocument?.fileType || "",
    ).toLowerCase();

    const fileName = String(
      document?.uploadedDocument?.originalFileName ||
        document?.uploadedDocument?.fileName ||
        "",
    ).toLowerCase();

    if (fileType.includes("pdf") || fileType === "application/pdf") {
      return true;
    }

    const extension = fileName.split(".").pop() || "";

    return extension === "pdf";
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

getResubmissionCount(): number {
  return this.documents.filter(
    (item) => item?.uploadedDocument?.status === "RESUBMISSION_REQUIRED",
  ).length;
}

  // =====================================================
  // DOCUMENT STATUS
  // =====================================================
  isResubmission(document: any): boolean {
  return (
    document?.uploadedDocument?.status === "RESUBMISSION_REQUIRED"
  );
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

  // =====================================================
  // VIEW DOCUMENT
  // =====================================================

  viewDocument(document: any): void {
    const url = this.getDocumentUrl(document);

    if (!url) {
      this.toastr.warning("Document file is not available", "Warning");
      return;
    }

    this.previewDocument = document;
    this.previewUrl = url;
    this.previewSafeUrl = null;
    this.previewLoading = true;

    if (this.isImage(document)) {
      this.previewType = "image";
    } else if (this.isPdf(document)) {
      this.previewType = "pdf";

      this.previewSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    } else {
      this.previewType = "file";
    }

    this.showDocumentPreview = true;

    setTimeout(() => {
      this.previewLoading = false;
    }, 200);
  }
  // =====================================================
  // CLOSE DOCUMENT PREVIEW
  // =====================================================

  closeDocumentPreview(): void {
    this.showDocumentPreview = false;
    this.previewDocument = null;
    this.previewUrl = "";
    this.previewSafeUrl = null;
    this.previewType = "";
    this.previewLoading = false;
  }
  // =====================================================
  // DOWNLOAD DOCUMENT
  // =====================================================

  // =====================================================
  // DOWNLOAD DOCUMENT
  // =====================================================

  async downloadDocument(document: any): Promise<void> {
    const url = this.getDocumentUrl(document);

    if (!url) {
      this.toastr.warning("Document file is not available", "Warning");
      return;
    }

    const fileName = this.getFileName(document);

    try {
      this.ngxLoader.start();

      const response = await fetch(url, {
        mode: "cors",
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      const blob = await response.blob();

      if (!blob || blob.size === 0) {
        throw new Error("Downloaded file is empty");
      }

      const blobUrl = window.URL.createObjectURL(blob);

      const link = window.document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      link.style.display = "none";

      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);

      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 1000);

      this.toastr.success("Document downloaded successfully", "Download");
    } catch (error) {
      console.error("DOWNLOAD DOCUMENT ERROR:", error);

      this.toastr.error(
        "Unable to download document. Please check S3 CORS configuration.",
        "Download Failed",
      );
    } finally {
      this.ngxLoader.stop();
    }
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

        if (this.serviceId) {
          this.loadSubmittedDocumentsByService();
        } else {
          this.loadSubmittedDocuments();
        }
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
      this.toastr.warning("Please enter resubmission reason", "Required");

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

          this.toastr.success(
            "Document resubmission requested successfully",
            "Success",
          );

          this.closeRejectModal();

          if (this.serviceId) {
            this.loadSubmittedDocumentsByService();
          } else {
            this.loadSubmittedDocuments();
          }
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
