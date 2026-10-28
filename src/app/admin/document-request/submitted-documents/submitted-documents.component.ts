import { Component, Input, OnInit, HostListener } from "@angular/core";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { HttpClientModule } from "@angular/common/http";
import { FormsModule } from "@angular/forms";
import { NgxUiLoaderModule, NgxUiLoaderService } from "ngx-ui-loader";
import { ToastrModule, ToastrService } from "ngx-toastr";
import { DocumentRequestService } from "../../../services/document-request.service";
import { UploadService } from "../../../services/upload.service";
import { UploadType } from "../../../shared/enums/uploadTypeEnums";
import { ImageUploaderLibComponent } from "@swiftlyme/image-uploader";

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
    ImageUploaderLibComponent,
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

  /** ZIP now also carries review info (status / rejectionReason) from the backend. */
  zipUpload: {
    id?: number;
    uploaded: boolean;
    fileName: string;
    filePath: string;
    fileUrl: string;
    status?: string;
    rejectionReason?: string | null;
  } | null = null;

  downloadingZip = false;

  // =====================================================
  // LOADING
  // =====================================================

  loading = false;

  // =====================================================
  // DOCUMENT VERIFICATION / RESUBMISSION MODAL
  // =====================================================

  showRejectModal = false;

  selectedDocument: any = null;

  /** 'document' = resubmission for one document, 'zip' = resubmission for the customer ZIP. */
  rejectTarget: "document" | "zip" = "document";

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
  selectedFiles: Record<number, File | null> = {};
  uploadingDocuments: Record<number, boolean> = {};
  isUploadingDocument(document: any): boolean {
    const documentId =
      document.documentRequestItemId ?? document.requestItemId ?? document.id;

    return !!this.uploadingDocuments[Number(documentId)];
  }
  submittingAllDocuments = false;

  /** Pending CA uploads are kept separate from existing submitted-document data. */
  pendingUploads: Record<
    number,
    {
      fileName: string;
      filePath: string;
      fileType: string;
      fileSize: number;
      fileUrl: string;
    }
  > = {};

  /** Stable empty array so [imageUrls] never looks "changed" to the package. */
  private readonly emptyImageUrls: string[] = [];

  /**
   * Cached URL arrays handed to the uploader, keyed by request item ID.
   * Arrays are cached so change detection never gives the package a new array
   * instance (which would rebuild its slots).
   */
  caDocumentImageUrls: Record<number, string[]> = {};

  /** Bumping a version re-creates that document's uploader (used to roll back on errors). */
  uploaderVersions: Record<number, number> = {};

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
    private uploadService: UploadService,
  ) {}

  // =====================================================
  // INIT
  // =====================================================

  ngOnInit(): void {
    // SERVICE VIEW MODE
    if (this.serviceId) {
      this.loadSubmittedDocumentsByService();
      return;
    }

    // NORMAL REQUEST MODE
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

this.zipUpload = data.zipUpload?.uploaded
  ? {
      ...data.zipUpload,
      id: Number(data.zipUpload.id ?? data.zipUpload.zipUploadId),
    }
  : null;

          // Fresh data: rebuild uploader URL cache.
          this.caDocumentImageUrls = {};
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

          this.documents = Array.isArray(data.documents) ? data.documents : [];
this.zipUpload = data.zipUpload?.uploaded
  ? {
      ...data.zipUpload,
      id: Number(data.zipUpload.id ?? data.zipUpload.zipUploadId),
    }
  : null;

          // Fresh data: rebuild uploader URL cache.
          this.caDocumentImageUrls = {};
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

    if (fileType.includes("image")) {
      return true;
    }

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
  // COUNTS
  // =====================================================

  getUploadedCount(): number {
    return this.documents.filter((item) => item.uploaded).length;
  }

  getPendingCount(): number {
    return this.documents.filter((item) => !item.uploaded).length;
  }

  getApprovedCount(): number {
    return this.documents.filter(
      (item) => item?.uploadedDocument?.status === "APPROVED",
    ).length;
  }

  getResubmissionCount(): number {
    return this.documents.filter(
      (item) => item?.uploadedDocument?.status === "RESUBMISSION_REQUIRED",
    ).length;
  }

  // =====================================================
  // DOCUMENT STATUS
  // =====================================================

  isResubmission(document: any): boolean {
    return document?.uploadedDocument?.status === "RESUBMISSION_REQUIRED";
  }

  // =====================================================
  // ZIP STATUS
  // =====================================================

  isZipResubmission(): boolean {
    return this.zipUpload?.status === "RESUBMISSION_REQUIRED";
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

        this.reloadDocuments();
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

  /** Reloads data in whichever mode (service / normal) the page is in. */
  private reloadDocuments(): void {
    if (this.serviceId) {
      this.loadSubmittedDocumentsByService();
    } else {
      this.loadSubmittedDocuments();
    }
  }

  // =====================================================
  // OPEN REJECT (RESUBMISSION) MODAL - DOCUMENT
  // =====================================================

  openRejectModal(document: any): void {
    this.rejectTarget = "document";

    this.selectedDocument = document;

    this.rejectionReason = "";

    this.showRejectModal = true;
  }

  // =====================================================
  // OPEN REJECT (RESUBMISSION) MODAL - ZIP
  // =====================================================

  openZipRejectModal(): void {
    if (!this.zipUpload) {
      return;
    }

    this.rejectTarget = "zip";

    this.selectedDocument = null;

    this.rejectionReason = "";

    this.showRejectModal = true;
  }

  // =====================================================
  // CLOSE REJECT MODAL
  // =====================================================

  closeRejectModal(): void {
    this.showRejectModal = false;

    this.selectedDocument = null;

    this.rejectTarget = "document";

    this.rejectionReason = "";
  }

  // =====================================================
  // REJECT DOCUMENT / ZIP
  // =====================================================

  rejectDocument(): void {
    const reason = this.rejectionReason.trim();

    if (!reason) {
      this.toastr.warning("Please enter resubmission reason", "Required");

      return;
    }

    // ---------------- ZIP RESUBMISSION ----------------
    if (this.rejectTarget === "zip") {
      this.rejectZip(reason);
      return;
    }

    // ---------------- DOCUMENT RESUBMISSION ----------------
    const documentId = this.selectedDocument?.uploadedDocument?.id;

    if (!documentId) {
      this.toastr.error("Submitted document ID is missing", "Error");

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

          this.reloadDocuments();
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


private rejectZip(reason: string): void {
  const zipId = Number(this.zipUpload?.id);

  if (!Number.isInteger(zipId) || zipId <= 0) {
    this.toastr.error("ZIP record ID is missing", "Error");
    return;
  }

  this.documentRequestService
    .rejectSubmittedZip(zipId, reason)
    .subscribe({
      next: (response: any) => {
        if (!response?.success) {
          this.toastr.error(
            response?.message || "Failed to request ZIP resubmission",
            "Error"
          );
          return;
        }

        this.toastr.success(
          "ZIP resubmission requested successfully",
          "Success"
        );

        this.closeRejectModal();
        this.reloadDocuments();
      },
      error: (error: any) => {
        console.error("ZIP resubmission API error:", error);

        this.toastr.error(
          error?.error?.message || "Failed to request ZIP resubmission",
          "Error"
        );
      },
    });
}


  // =====================================================
  // DOWNLOAD CUSTOMER ZIP
  // =====================================================

  async downloadZip(): Promise<void> {
    const url = this.zipUpload?.fileUrl;

    if (!url) {
      this.toastr.warning("ZIP file is not available", "Warning");
      return;
    }

    const fileName = this.zipUpload?.fileName || "Customer Documents.zip";

    try {
      this.downloadingZip = true;
      this.ngxLoader.start();

      const response = await fetch(url, { mode: "cors" });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      const blob = await response.blob();

      if (!blob.size) {
        throw new Error("Downloaded ZIP file is empty");
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

      this.toastr.success("ZIP downloaded successfully", "Download");
    } catch (error) {
      console.error("DOWNLOAD ZIP ERROR:", error);

      this.toastr.error(
        "Unable to download ZIP. Please check the S3 URL and CORS configuration.",
        "Download Failed",
      );
    } finally {
      this.downloadingZip = false;
      this.ngxLoader.stop();
    }
  }

  // =====================================================
  // CA INDIVIDUAL DOCUMENT UPLOAD (legacy file input)
  // =====================================================

  async onFileSelected(event: Event, document: any): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const itemId = this.getItemId(document);

    if (!Number.isInteger(itemId) || itemId <= 0) {
      this.toastr.error(
        "Document request item ID is missing.",
        "Upload failed",
      );
      input.value = "";
      return;
    }

    if (this.uploadingDocuments[itemId]) {
      input.value = "";
      return;
    }

    if (!String(this.documentRequest?.requestCode || "").trim()) {
      this.toastr.error(
        "Request code is missing. Cannot upload document.",
        "Upload failed",
      );
      input.value = "";
      return;
    }

    if (!file.size) {
      this.toastr.warning("The selected file is empty.", "Invalid file");
      input.value = "";
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      this.toastr.warning("File size must not exceed 20 MB.", "Invalid file");
      input.value = "";
      return;
    }

    await this.uploadDocumentFile(file, document, itemId);
    input.value = "";
  }

  /** Uploads the file to S3 and keeps it as a pending CA upload. Returns true on success. */
  private async uploadDocumentFile(
    file: File,
    document: any,
    itemId: number,
  ): Promise<boolean> {
    this.uploadingDocuments[itemId] = true;
    this.ngxLoader.start();

    try {
      const requestCode = String(
        this.documentRequest?.requestCode || "",
      ).trim();
      if (!requestCode) throw new Error("Request code is missing.");

      const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
      const documentCode = String(
        document?.documentCode ||
          document?.code ||
          document?.requestItemId ||
          itemId,
      ).replace(/[^a-zA-Z0-9_-]/g, "_");

      const customFileName = `CA_${documentCode}_${Date.now()}.${extension}`;
      const customFolder = `service-request-documents/${requestCode}`;

      const result = await this.uploadService.upload(
        file,
        UploadType.SERVICE_REQUEST_DOCUMENT,
        customFileName,
        customFolder,
      );

      if (!result?.key)
        throw new Error("Upload failed: S3 key was not returned.");

      // Replacing a pending file: remove the previous temporary S3 file.
      const previousPending = this.pendingUploads[itemId];

      if (previousPending?.filePath && previousPending.filePath !== result.key) {
        try {
          await this.uploadService.delete(previousPending.filePath);
        } catch (deleteError) {
          console.error("Failed to delete old pending file:", deleteError);
        }
      }

      // Keep pending CA uploads separate; do not change existing status/approval data.
      this.pendingUploads[itemId] = {
        fileName: file.name,
        filePath: result.key,
        fileType: file.type || "",
        fileSize: file.size,
        fileUrl:
          result.previewUrl ||
          (file.type?.startsWith("image/") ? URL.createObjectURL(file) : ""),
      };

      // Refresh the URL cache for this uploader.
      delete this.caDocumentImageUrls[itemId];

      this.toastr.success(`${file.name} uploaded to S3.`, "Upload successful");

      return true;
    } catch (error: any) {
      console.error("CA DOCUMENT UPLOAD ERROR:", error);
      this.toastr.error(
        error?.message || error?.error?.message || "Unable to upload document.",
        "Upload failed",
      );

      return false;
    } finally {
      this.uploadingDocuments[itemId] = false;
      this.ngxLoader.stop();
    }
  }

  // =====================================================
  // FILE RULES (same behaviour as Client Portal)
  // =====================================================

  getMaxFileSize(document: any): string {
    const maxSize = document?.maxFileSize;

    if (maxSize === null || maxSize === undefined || maxSize === "") {
      return "No limit";
    }

    return `${maxSize} MB`;
  }

  getAllowedFileTypes(document: any): string {
    const allowedTypes = document?.allowedFileTypes;

    if (!allowedTypes) {
      return "Any supported format";
    }

    return String(allowedTypes)
      .split(",")
      .map((type: string) => type.trim().toUpperCase())
      .filter(Boolean)
      .join(", ");
  }

  // =====================================================
  // UPLOADER HELPERS
  // =====================================================

  private getItemId(document: any): number {
    return Number(
      document?.documentRequestItemId ??
        document?.requestItemId ??
        document?.id,
    );
  }

  getCaUploaderVersion(document: any): number {
    return this.uploaderVersions[this.getItemId(document)] ?? 0;
  }

  getPendingUpload(document: any): {
    fileName: string;
    filePath: string;
    fileType: string;
    fileSize: number;
    fileUrl: string;
  } | null {
    const itemId = this.getItemId(document);
    return itemId > 0 ? this.pendingUploads[itemId] || null : null;
  }

  hasPendingUploads(): boolean {
    return Object.keys(this.pendingUploads).length > 0;
  }

  /** Delete button is shown only for a file CA has just uploaded (not the customer's file). */
  canDeleteCaDocument(document: any): boolean {
    return !!this.getPendingUpload(document);
  }

  /**
   * The package detects a pre-loaded PDF only when the URL ENDS with ".pdf".
   * A signed S3 URL ends with a query string, so a "#document.pdf" fragment
   * is added. The fragment is never sent to the server (signature stays valid).
   */
  private withPdfHint(url: string, isPdf: boolean): string {
    if (!url) return url;
    if (!isPdf || url.includes("#document.pdf")) return url;
    return `${url}#document.pdf`;
  }

  getCaDocumentImageUrls(document: any): string[] {
    const itemId = this.getItemId(document);

    // Cached array -> stable reference for the package.
    const cached = this.caDocumentImageUrls[itemId];
    if (cached) {
      return cached;
    }

    let urls: string[] = this.emptyImageUrls;

    // Show a newly selected/uploaded file first (image or PDF).
    const pending = this.pendingUploads[itemId];

    if (pending?.fileUrl) {
      const pendingIsPdf =
        pending.fileType === "application/pdf" ||
        pending.fileName?.toLowerCase().endsWith(".pdf");

      urls = [this.withPdfHint(pending.fileUrl, !!pendingIsPdf)];
    } else {
      // Otherwise show the existing customer-submitted document.
      const existingUrl = this.getDocumentUrl(document);

      if (existingUrl) {
        urls = [this.withPdfHint(existingUrl, this.isPdf(document))];
      }
    }

    if (urls !== this.emptyImageUrls) {
      this.caDocumentImageUrls[itemId] = urls;
    }

    return urls;
  }

  /** Re-creates an uploader (rolls the UI back after a failed validation/upload). */
  private resetCaUploader(itemId: number): void {
    delete this.caDocumentImageUrls[itemId];
    this.uploaderVersions[itemId] = (this.uploaderVersions[itemId] || 0) + 1;
  }

  /** Reads the File out of the different event payloads of the package. */
  private extractUploaderFile(event: any): File | undefined {
    if (event instanceof File) return event;
    if (event?.new?.file instanceof File) return event.new.file; // imageReplace
    if (event?.croppedFile instanceof File) return event.croppedFile; // imageEdit
    if (event?.file instanceof File) return event.file; // imageUpload
    if (event?.files?.[0] instanceof File) return event.files[0];
    return undefined;
  }

  // =====================================================
  // UPLOADER EVENTS (upload / replace / edit / delete)
  // =====================================================

  /** (imageUpload) and (imageReplace) */
  async onCaImageUpload(event: any, document: any): Promise<void> {
    await this.processCaFile(this.extractUploaderFile(event), event, document);
  }

  /** (imageEdit) - crop / rotate saved. */
  async onCaImageEdit(event: any, document: any): Promise<void> {
    await this.processCaFile(this.extractUploaderFile(event), event, document);
  }

  /** (imageDelete) - only a pending CA upload can be removed. */
  async onCaImageDelete(event: any, document: any): Promise<void> {
    const itemId = this.getItemId(document);
    const pending = this.pendingUploads[itemId];

    if (pending) {
      if (pending.filePath) {
        try {
          await this.uploadService.delete(pending.filePath);
        } catch (error) {
          console.error("Failed to delete pending document:", error);
        }
      }

      delete this.pendingUploads[itemId];
      this.toastr.success("Document removed.");
    }

    // Restore the customer's document (or empty slot) in the uploader.
    this.resetCaUploader(itemId);
  }

  /** One pipeline for upload / replace / edit. */
  private async processCaFile(
    file: File | undefined,
    event: any,
    document: any,
  ): Promise<void> {
    if (!file) {
      console.warn("CA uploader event did not contain a File:", event);

      this.toastr.warning(
        "Unable to read the selected file. Please try again.",
        "Upload failed",
      );
      return;
    }

    const itemId = this.getItemId(document);

    if (!Number.isInteger(itemId) || itemId <= 0) {
      this.toastr.error(
        "Document request item ID is missing.",
        "Upload failed",
      );
      return;
    }

    if (this.uploadingDocuments[itemId]) {
      return;
    }

    if (!String(this.documentRequest?.requestCode || "").trim()) {
      this.toastr.error(
        "Request code is missing. Cannot upload document.",
        "Upload failed",
      );
      this.resetCaUploader(itemId);
      return;
    }

    if (!file.size) {
      this.toastr.warning("The selected file is empty.", "Invalid file");
      this.resetCaUploader(itemId);
      return;
    }

    // Validate document-specific file type and maximum size.
    const validation = this.validateCaDocumentFile(file, document);

    if (!validation.valid) {
      this.toastr.warning(
        validation.message || "Invalid document.",
        "Invalid file",
      );
      // The package already shows the picked file - roll it back.
      this.resetCaUploader(itemId);
      return;
    }

    // Upload only after validation succeeds.
    const uploaded = await this.uploadDocumentFile(file, document, itemId);

    if (!uploaded) {
      this.resetCaUploader(itemId);
    }
  }

  /** Same rules as the Client Portal: accepts extensions AND MIME types. */
  validateCaDocumentFile(
    file: File,
    document: any,
  ): { valid: boolean; message?: string } {
    // ---------------- FILE TYPE ----------------
    if (document?.allowedFileTypes) {
      const allowedTypes = String(document.allowedFileTypes)
        .split(",")
        .map((type: string) => type.trim().toLowerCase().replace(/^\./, ""))
        .filter((type: string) => !!type);

      const fileName = file.name.toLowerCase();

      const fileExtension = fileName.includes(".")
        ? fileName.split(".").pop() || ""
        : "";

      const mimeType = file.type?.toLowerCase() || "";

      const isExtensionAllowed = allowedTypes.includes(fileExtension);
      const isMimeAllowed = allowedTypes.includes(mimeType);

      if (!isExtensionAllowed && !isMimeAllowed) {
        return {
          valid: false,
          message: `Invalid file type. Allowed formats: ${this.getAllowedFileTypes(document)}`,
        };
      }
    }

    // ---------------- FILE SIZE ----------------
    if (
      document?.maxFileSize !== null &&
      document?.maxFileSize !== undefined &&
      document?.maxFileSize !== ""
    ) {
      const maxSizeMB = Number(document.maxFileSize);

      if (!Number.isNaN(maxSizeMB) && maxSizeMB > 0) {
        if (file.size > maxSizeMB * 1024 * 1024) {
          return {
            valid: false,
            message: `File size must not exceed ${maxSizeMB} MB.`,
          };
        }
      }
    }

    return { valid: true };
  }

  getAcceptedFileTypes(document: any): string {
    const types = String(document?.allowedFileTypes || "")
      .split(",")
      .map((type: string) => type.trim().toLowerCase())
      .filter(Boolean);

    return types
      .map((type: string) =>
        type.includes("/") ? type : `.${type.replace(/^\./, "")}`,
      )
      .join(",");
  }

  // =====================================================
  // SUBMIT ALL DOCUMENTS
  // =====================================================

  async submitAllDocuments(): Promise<void> {
    if (this.submittingAllDocuments) return;

    // Works in both modes (normal request page and embedded service view).
    const requestId = this.documentRequestId ?? this.serviceRequestId;

    if (!requestId) {
      this.toastr.error("Document request ID is missing.");
      return;
    }

    const documents = Object.entries(this.pendingUploads).map(
      ([itemId, file]) => ({
        documentRequestItemId: Number(itemId),
        fileName: file.fileName,
        filePath: file.filePath,
        fileType: file.fileType || "application/octet-stream",
        fileSize: file.fileSize,
      }),
    );

    if (!documents.length) {
      this.toastr.info("Upload at least one document before submitting.");
      return;
    }

    this.submittingAllDocuments = true;
    this.ngxLoader.start();

    this.documentRequestService
      .submitCaServiceRequestDocuments({
        documentRequestId: requestId,
        documents,
      })
      .subscribe({
        next: (response: any) => {
          if (!response?.success) {
            this.toastr.error(
              response?.message || "Unable to submit documents.",
            );
            return;
          }

          this.toastr.success("Documents submitted successfully.");
          this.pendingUploads = {};
          this.caDocumentImageUrls = {};
          this.reloadDocuments();
        },
        error: (error: any) => {
          console.error("CA SUBMIT DOCUMENTS ERROR:", error);
          this.toastr.error(
            error?.error?.message || "Unable to submit documents.",
          );
          this.submittingAllDocuments = false;
          this.ngxLoader.stop();
        },
        complete: () => {
          this.submittingAllDocuments = false;
          this.ngxLoader.stop();
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