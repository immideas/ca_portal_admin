import { Component, OnInit, HostListener } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router } from "@angular/router";
import { FormsModule } from "@angular/forms";
import {
  DomSanitizer,
  SafeResourceUrl,
} from "@angular/platform-browser";
import { ToastrService } from "ngx-toastr";

import { DocumentRequestService } from "../../../services/document-request.service";
import { UploadService } from "../../../services/upload.service";
import { UploadType } from "../../../shared/enums/uploadTypeEnums";

import { AddDocumentRequestComponent } from "../add-document-request/add-document-request.component";
import { SubmittedDocumentsComponent } from "../submitted-documents/submitted-documents.component";
import { ImageUploaderLibComponent } from "@swiftlyme/image-uploader";

@Component({
  selector: "app-service-view",
  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    AddDocumentRequestComponent,
    SubmittedDocumentsComponent,
    ImageUploaderLibComponent,
  ],

  templateUrl: "./service-view.component.html",
  styleUrl: "./service-view.component.css",
})
export class ServiceViewComponent implements OnInit {
  // =========================================================
  // VARIABLES
  // =========================================================

  documentRequestId!: number;

  serviceId!: number;

  requestData: any = null;

  loading = false;

  // UPDATED: added payment tab
  activeTab:
    | "request"
    | "submitted"
    | "final"
    | "payment" = "request";

  // =========================================================
  // PAYMENT
  // =========================================================

  // Payment information returned from backend
  serviceRequestPayment: any = null;

  // =========================================================
  // COMPLETE SERVICE REQUEST
  // =========================================================

  showCompleteModal = false;

  completionRemark = "";

  // Maximum final documents allowed
  maxFinalDocuments = 10;

  // Final documents uploaded to S3
  finalDocuments: {
    originalFileName: string;
    fileName: string;
    filePath: string;
    fileType: string;
    fileSize: number;
    previewUrl: string;
  }[] = [];

  // Final documents already saved after service completion
  savedFinalDocuments: {
    id: number;
    documentRequestId: number;
    originalFileName: string;
    fileName: string;
    filePath: string;
    fileType: string;
    fileSize: number;
    remark: string;
    uploadedBy: number;
    createdAt: string;
    fileUrl: string;
  }[] = [];

  // S3 keys uploaded during current completion session
  newlyUploadedFinalKeys: Set<string> = new Set<string>();

  // Upload state
  finalUploading = false;

  // =========================================================
  // FINAL DOCUMENT PREVIEW
  // Same preview behavior as Submitted Documents
  // =========================================================

  showFinalDocumentPreview = false;

  previewFinalDocument: any = null;

  previewFinalUrl = "";

  previewFinalSafeUrl: SafeResourceUrl | null = null;

  previewFinalType:
    | "image"
    | "pdf"
    | "file"
    | "" = "";

  previewFinalLoading = false;

  // =========================================================
  // CONSTRUCTOR
  // =========================================================

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private documentRequestService: DocumentRequestService,
    private toastr: ToastrService,
    private uploadService: UploadService,
    private sanitizer: DomSanitizer,
  ) {}

  // =========================================================
  // INIT
  // =========================================================

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get("id");

    if (!id) {
      console.error("Document Request ID not found");
      return;
    }

    this.documentRequestId = Number(id);

    console.log(
      "Document Request ID:",
      this.documentRequestId,
    );

    this.loadDocumentRequest();
  }

  // =========================================================
  // LOAD DOCUMENT REQUEST
  // =========================================================

  loadDocumentRequest(): void {
    if (!this.documentRequestId) {
      return;
    }

    this.loading = true;

    this.documentRequestService
      .getById(this.documentRequestId)
      .subscribe({
        next: (response: any) => {
          console.log(
            "Document Request Details:",
            response,
          );

          this.requestData =
            response?.data ||
            response?.result ||
            response;

          // =====================================================
          // LOAD SAVED FINAL DOCUMENTS
          // =====================================================

          this.savedFinalDocuments =
            this.requestData?.finalDocuments || [];

          // =====================================================
          // LOAD PAYMENT
          // =====================================================

          this.serviceRequestPayment =
            this.requestData?.payment || null;

          if (
            this.requestData?.documentRequest?.serviceId
          ) {
            this.serviceId = Number(
              this.requestData.documentRequest.serviceId,
            );
          }

          console.log(
            "Saved Final Documents:",
            this.savedFinalDocuments,
          );

          console.log(
            "Service ID:",
            this.serviceId,
          );

          console.log(
            "Service Request Payment:",
            this.serviceRequestPayment,
          );

          console.log(
            "Request Data:",
            this.requestData,
          );

          this.loading = false;
        },

        error: (error: any) => {
          console.error(
            "Error loading document request:",
            error,
          );

          this.loading = false;
        },
      });
  }

  // =========================================================
  // TAB
  // =========================================================

  setTab(
    tab:
      | "request"
      | "submitted"
      | "final"
      | "payment",
  ): void {
    this.activeTab = tab;
  }

  // =========================================================
  // EDIT SERVICE REQUEST
  // =========================================================

  editServiceRequest(): void {
    /*
     * Completed service request must not be edited.
     */

    if (
      this.requestData?.documentRequest?.status ===
      "COMPLETED"
    ) {
      this.toastr.info(
        "Completed service requests cannot be edited.",
      );

      return;
    }

    this.router.navigate([
      "/edit-service-request",
      this.documentRequestId,
    ]);
  }

  // =========================================================
  // OPEN COMPLETE MODAL
  // =========================================================

  openCompleteModal(): void {
    /*
     * Already completed = no further action.
     */

    if (
      this.requestData?.documentRequest?.status ===
      "COMPLETED"
    ) {
      return;
    }

    this.completionRemark = "";

    this.finalDocuments = [];

    this.newlyUploadedFinalKeys.clear();

    this.finalUploading = false;

    this.showCompleteModal = true;
  }

  // =========================================================
  // CLOSE COMPLETE MODAL
  // =========================================================

  closeCompleteModal(): void {
    /*
     * Don't allow closing while upload is running.
     */

    if (this.finalUploading) {
      return;
    }

    this.showCompleteModal = false;

    this.completionRemark = "";
  }

  // =========================================================
  // FINAL DOCUMENT UPLOAD
  // =========================================================

  async onFinalDocumentUpload(
    image: any,
  ): Promise<void> {
    if (!image?.file) {
      return;
    }

    /*
     * Maximum document check
     */

    if (
      this.finalDocuments.length >=
      this.maxFinalDocuments
    ) {
      this.toastr.warning(
        `Maximum ${this.maxFinalDocuments} final documents are allowed.`,
      );

      return;
    }

    const file = image.file;

    // =======================================================
    // ALLOWED FILE TYPES
    // =======================================================

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    const extension =
      file.name
        ?.split(".")
        .pop()
        ?.toLowerCase() || "";

    const allowedExtensions = [
      "pdf",
      "jpg",
      "jpeg",
      "png",
      "webp",
    ];

    if (
      !allowedTypes.includes(file.type) &&
      !allowedExtensions.includes(extension)
    ) {
      this.toastr.error(
        "Only PDF, JPG, JPEG, PNG and WEBP files are allowed.",
      );

      return;
    }

    this.finalUploading = true;

    try {
      // =====================================================
      // UPLOAD TO S3
      // SAME PATTERN AS KYC
      // =====================================================

      const requestCode =
        this.requestData?.documentRequest?.requestCode;

      if (!requestCode) {
        this.toastr.error(
          "Service request code is missing.",
          "Upload Failed",
        );

        return;
      }

      const customFolder =
        `service-request-final-documents/${requestCode}`;

      const extension =
        file.name
          ?.split(".")
          .pop()
          ?.toLowerCase() || "";

      const customFileName =
        `final-document-${Date.now()}.${extension}`;

      const result =
        await this.uploadService.upload(
          file,
          UploadType.SERVICE_REQUEST_FINAL_DOCUMENT,
          customFileName,
          customFolder,
        );

      console.log(
        "Final document uploaded:",
        result,
      );

      // =====================================================
      // STORE FINAL DOCUMENT INFORMATION
      // =====================================================

      this.finalDocuments.push({
        originalFileName: file.name,

        fileName: file.name,

        filePath: result.key,

        fileType: file.type || "",

        fileSize: file.size,

        previewUrl:
          result.previewUrl ||
          result.key,
      });

      // =====================================================
      // TRACK S3 KEY
      // =====================================================

      this.newlyUploadedFinalKeys.add(
        result.key,
      );

      // =====================================================
      // STORE KEY ON UPLOADER IMAGE
      // =====================================================

      image.key = result.key;

      this.toastr.success(
        `${file.name} uploaded successfully.`,
      );
    } catch (error: any) {
      console.error(
        "Final document S3 upload failed:",
        error,
      );

      this.toastr.error(
        error?.message ||
          "Final document upload failed.",
      );
    } finally {
      this.finalUploading = false;
    }
  }

  // =========================================================
  // FINAL DOCUMENT REPLACE
  // =========================================================

  async onFinalDocumentReplace(
    event: any,
  ): Promise<void> {
    if (!event?.new?.file) {
      return;
    }

    const newFile = event.new.file;

    // =======================================================
    // VALIDATE FILE
    // =======================================================

    const extension =
      newFile.name
        ?.split(".")
        .pop()
        ?.toLowerCase() || "";

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    const allowedExtensions = [
      "pdf",
      "jpg",
      "jpeg",
      "png",
      "webp",
    ];

    if (
      !allowedTypes.includes(newFile.type) &&
      !allowedExtensions.includes(extension)
    ) {
      this.toastr.error(
        "Only PDF, JPG, JPEG, PNG and WEBP files are allowed.",
      );

      return;
    }

    this.finalUploading = true;

    try {
      // =====================================================
      // REQUEST CODE
      // Same folder structure as normal upload
      // =====================================================

      const requestCode =
        this.requestData?.documentRequest?.requestCode;

      if (!requestCode) {
        this.toastr.error(
          "Service request code is missing.",
          "Upload Failed",
        );

        return;
      }

      const customFolder =
        `service-request-final-documents/${requestCode}`;

      const customExtension =
        newFile.name
          ?.split(".")
          .pop()
          ?.toLowerCase() || "";

      const customFileName =
        `final-document-${Date.now()}.${customExtension}`;

      // =====================================================
      // UPLOAD NEW FILE FIRST
      // =====================================================

      const result =
        await this.uploadService.upload(
          newFile,
          UploadType.SERVICE_REQUEST_FINAL_DOCUMENT,
          customFileName,
          customFolder,
        );

      const index =
        event.index ?? 0;

      // =====================================================
      // OLD DOCUMENT
      // =====================================================

      const oldDocument =
        this.finalDocuments[index];

      const oldKey =
        oldDocument?.filePath || "";

      // =====================================================
      // DELETE OLD NEWLY UPLOADED FILE
      // =====================================================

      if (
        oldKey &&
        this.newlyUploadedFinalKeys.has(
          oldKey,
        )
      ) {
        try {
          await this.uploadService.delete(
            oldKey,
          );
        } catch (error) {
          console.error(
            "Failed to delete old final document:",
            error,
          );
        }

        this.newlyUploadedFinalKeys.delete(
          oldKey,
        );
      }

      // =====================================================
      // UPDATE DOCUMENT
      // =====================================================

      this.finalDocuments[index] = {
        originalFileName:
          newFile.name,

        fileName:
          newFile.name,

        filePath:
          result.key,

        fileType:
          newFile.type || "",

        fileSize:
          newFile.size,

        previewUrl:
          result.previewUrl ||
          result.key,
      };

      // =====================================================
      // TRACK NEW KEY
      // =====================================================

      this.newlyUploadedFinalKeys.add(
        result.key,
      );

      event.new.key =
        result.key;

      this.toastr.success(
        `${newFile.name} uploaded successfully.`,
      );
    } catch (error: any) {
      console.error(
        "Final document replacement failed:",
        error,
      );

      this.toastr.error(
        error?.message ||
          "Final document replacement failed.",
      );
    } finally {
      this.finalUploading = false;
    }
  }

  // =========================================================
  // FINAL DOCUMENT DELETE
  // =========================================================

  onFinalDocumentDelete(
    image: any,
  ): void {
    /*
     * Get S3 key from uploader event.
     */

    const key =
      image?.key ||
      image?.filePath ||
      "";

    if (key) {
      /*
       * Only delete immediately if this file
       * was uploaded during this completion session.
       */

      if (
        this.newlyUploadedFinalKeys.has(
          key,
        )
      ) {
        this.uploadService
          .delete(key)
          .catch((error) =>
            console.error(
              "Failed to delete final document from S3:",
              error,
            ),
          );

        this.newlyUploadedFinalKeys.delete(
          key,
        );
      }
    }

    /*
     * Remove from local document array.
     */

    const index =
      this.finalDocuments.findIndex(
        (document) =>
          document.filePath === key,
      );

    if (index !== -1) {
      this.finalDocuments.splice(
        index,
        1,
      );
    }
  }

  // =========================================================
  // FINAL DOCUMENT IMAGE CHANGE
  // =========================================================

  handleFinalDocumentsChange(
    images: any[],
  ): void {
    if (!images) {
      return;
    }

    console.log(
      "Final documents changed:",
      images,
    );
  }

  // =========================================================
  // CHECK FINAL DOCUMENT UPLOAD
  // =========================================================

  hasFinalDocuments(): boolean {
    return (
      this.finalDocuments.length > 0
    );
  }

  // =========================================================
  // FINAL DOCUMENT FILE NAME
  // =========================================================

  getFinalDocumentFileName(
    document: any,
  ): string {
    return (
      document?.originalFileName ||
      document?.fileName ||
      "Document"
    );
  }

  // =========================================================
  // FINAL DOCUMENT IMAGE CHECK
  // =========================================================

  isFinalDocumentImage(
    document: any,
  ): boolean {
    const fileType = String(
      document?.fileType || "",
    ).toLowerCase();

    const fileName = String(
      document?.originalFileName ||
        document?.fileName ||
        "",
    ).toLowerCase();

    // MIME type check
    if (fileType.includes("image")) {
      return true;
    }

    // Extension check
    const imageExtensions = [
      "jpg",
      "jpeg",
      "png",
      "webp",
      "gif",
      "bmp",
      "svg",
    ];

    const extension =
      fileName.split(".").pop() || "";

    return imageExtensions.includes(
      extension,
    );
  }

  // =========================================================
  // FINAL DOCUMENT PDF CHECK
  // =========================================================

  isFinalDocumentPdf(
    document: any,
  ): boolean {
    const fileType = String(
      document?.fileType || "",
    ).toLowerCase();

    const fileName = String(
      document?.originalFileName ||
        document?.fileName ||
        "",
    ).toLowerCase();

    // MIME type check
    if (
      fileType.includes("pdf") ||
      fileType === "application/pdf"
    ) {
      return true;
    }

    // Extension check
    const extension =
      fileName.split(".").pop() || "";

    return extension === "pdf";
  }

  // =========================================================
  // FINAL DOCUMENT URL
  // =========================================================

  getFinalDocumentUrl(
    document: any,
  ): string {
    return document?.fileUrl || "";
  }

  // =========================================================
  // VIEW FINAL DOCUMENT
  // Same behavior as Submitted Documents
  // =========================================================

  viewFinalDocument(
    document: any,
  ): void {
    const url =
      this.getFinalDocumentUrl(
        document,
      );

    if (!url) {
      this.toastr.warning(
        "Document file is not available",
        "Warning",
      );

      return;
    }

    this.previewFinalDocument =
      document;

    this.previewFinalUrl = url;

    this.previewFinalSafeUrl =
      null;

    this.previewFinalLoading =
      true;

    // =====================================================
    // IMAGE
    // =====================================================

    if (
      this.isFinalDocumentImage(
        document,
      )
    ) {
      this.previewFinalType =
        "image";
    }

    // =====================================================
    // PDF
    // =====================================================

    else if (
      this.isFinalDocumentPdf(
        document,
      )
    ) {
      this.previewFinalType =
        "pdf";

      this.previewFinalSafeUrl =
        this.sanitizer.bypassSecurityTrustResourceUrl(
          url,
        );
    }

    // =====================================================
    // OTHER FILE
    // =====================================================

    else {
      this.previewFinalType =
        "file";
    }

    this.showFinalDocumentPreview =
      true;

    setTimeout(() => {
      this.previewFinalLoading =
        false;
    }, 200);
  }

  // =========================================================
  // CLOSE FINAL DOCUMENT PREVIEW
  // =========================================================

  closeFinalDocumentPreview(): void {
    this.showFinalDocumentPreview =
      false;

    this.previewFinalDocument =
      null;

    this.previewFinalUrl = "";

    this.previewFinalSafeUrl =
      null;

    this.previewFinalType = "";

    this.previewFinalLoading =
      false;
  }

  // =========================================================
  // ESCAPE KEY
  // Same behavior as Submitted Documents
  // =========================================================

  @HostListener(
    "document:keydown.escape",
  )
  onEscapeKey(): void {
    if (
      this.showFinalDocumentPreview
    ) {
      this.closeFinalDocumentPreview();
    }

    if (this.showCompleteModal) {
      if (!this.finalUploading) {
        this.closeCompleteModal();
      }
    }
  }

  // =========================================================
  // DOWNLOAD FINAL DOCUMENT
  // =========================================================

  async downloadFinalDocument(
    document: any,
  ): Promise<void> {
    const url =
      this.getFinalDocumentUrl(
        document,
      );

    if (!url) {
      this.toastr.warning(
        "Document file is not available",
        "Warning",
      );

      return;
    }

    const fileName =
      this.getFinalDocumentFileName(
        document,
      );

    try {
      this.loading = true;

      const response =
        await fetch(url, {
          mode: "cors",
        });

      if (!response.ok) {
        throw new Error(
          `Download failed: ${response.status}`,
        );
      }

      const blob =
        await response.blob();

      if (!blob || blob.size === 0) {
        throw new Error(
          "Downloaded file is empty",
        );
      }

      const blobUrl =
        window.URL.createObjectURL(
          blob,
        );

      const link =
        window.document.createElement(
          "a",
        );

      link.href = blobUrl;

      link.download =
        fileName;

      link.style.display =
        "none";

      window.document.body.appendChild(
        link,
      );

      link.click();

      window.document.body.removeChild(
        link,
      );

      setTimeout(() => {
        window.URL.revokeObjectURL(
          blobUrl,
        );
      }, 1000);

      this.toastr.success(
        "Document downloaded successfully",
        "Download",
      );
    } catch (error) {
      console.error(
        "DOWNLOAD FINAL DOCUMENT ERROR:",
        error,
      );

      this.toastr.error(
        "Unable to download document. Please check S3 CORS configuration.",
        "Download Failed",
      );
    } finally {
      this.loading = false;
    }
  }

  // =========================================================
  // FINAL DOCUMENT FILE SIZE
  // =========================================================

  formatFinalDocumentFileSize(
    bytes:
      | number
      | null
      | undefined,
  ): string {
    if (!bytes) {
      return "0 KB";
    }

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (
      bytes <
      1024 * 1024
    ) {
      return `${(
        bytes / 1024
      ).toFixed(1)} KB`;
    }

    return `${(
      bytes /
      (1024 * 1024)
    ).toFixed(1)} MB`;
  }

  // =========================================================
  // COMPLETE SERVICE REQUEST
  // =========================================================

  completeServiceRequest(): void {
    // =======================================================
    // COMPLETED CHECK
    // =======================================================

    if (
      this.requestData?.documentRequest?.status ===
      "COMPLETED"
    ) {
      this.toastr.info(
        "This service request has already been completed.",
      );

      return;
    }

    // =======================================================
    // UPLOAD CHECK
    // =======================================================

    if (this.finalUploading) {
      this.toastr.warning(
        "Please wait until all documents are uploaded.",
      );

      return;
    }

    // =======================================================
    // DOCUMENT CHECK
    // =======================================================

    if (
      !this.finalDocuments.length
    ) {
      this.toastr.error(
        "Please upload at least one final document.",
      );

      return;
    }

    // =======================================================
    // REMARK CHECK
    // =======================================================

    if (
      !this.completionRemark ||
      !this.completionRemark.trim()
    ) {
      this.toastr.error(
        "Please enter completion remark.",
      );

      return;
    }

    // =======================================================
    // PAYLOAD
    // =======================================================

    const payload = {
      documentRequestId:
        Number(
          this.documentRequestId,
        ),

      remark:
        this.completionRemark.trim(),

      documents:
        this.finalDocuments.map(
          (document) => ({
            originalFileName:
              document.originalFileName,

            fileName:
              document.fileName,

            filePath:
              document.filePath,

            fileType:
              document.fileType,

            fileSize:
              document.fileSize,
          }),
        ),
    };

    console.log(
      "Complete Service Request Payload:",
      payload,
    );

    // =======================================================
    // API
    // =======================================================

    this.finalUploading = true;

    this.documentRequestService
      .completeServiceRequest(
        payload,
      )
      .subscribe({
        next: (response: any) => {
          console.log(
            "Service request completed:",
            response,
          );

          this.finalUploading =
            false;

          this.toastr.success(
            response?.message ||
              "Service request completed successfully.",
          );

          // Close modal
          this.showCompleteModal =
            false;

          // Clear local state
          this.completionRemark =
            "";

          this.finalDocuments =
            [];

          this.newlyUploadedFinalKeys.clear();

          // Reload request
          this.loadDocumentRequest();
        },

        error: (error: any) => {
          console.error(
            "Complete service request failed:",
            error,
          );

          this.finalUploading =
            false;

          this.toastr.error(
            error?.error?.message ||
              "Failed to complete service request.",
          );
        },
      });
  }
generateInvoice(): void {
  if (
    this.requestData?.documentRequest?.status !== "COMPLETED" ||
    !this.serviceRequestPayment
  ) {
    return;
  }

  if (!this.documentRequestId) {
    this.toastr.error(
      "Service request ID is missing.",
      "Error"
    );
    return;
  }

  console.log(
    "Generating invoice for:",
    this.serviceRequestPayment.invoiceNumber
  );

  this.loading = true;

  this.documentRequestService
    .generateInvoice(this.documentRequestId)
    .subscribe({
      next: (response: any) => {
        this.loading = false;

        console.log(
          "Generate Invoice API Response:",
          response
        );

        if (!response?.success) {
          this.toastr.error(
            response?.message ||
              "Failed to generate invoice.",
            "Error"
          );
          return;
        }

        this.toastr.success(
          response?.message ||
            "Invoice generated successfully.",
          "Success"
        );

        // Reload existing service request data
        this.loadDocumentRequest();
      },

      error: (error: any) => {
        this.loading = false;

        console.error(
          "Generate Invoice API Error:",
          error
        );

        this.toastr.error(
          error?.error?.message ||
            "Failed to generate invoice.",
          "Error"
        );
      }
    });
}

  // =========================================================
  // BACK
  // =========================================================

  goBack(): void {
    this.router.navigate([
      "/service-requests",
    ]);
  }
}