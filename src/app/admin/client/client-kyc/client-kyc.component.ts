import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
} from "@angular/core";

import { CommonModule } from "@angular/common";

import { ActivatedRoute, Router } from "@angular/router";

import { ToastrService } from "ngx-toastr";

import { ClientService } from "../../../services/client.service";

import { UploadService } from "../../../services/upload.service";

import { UploadType } from "../../../shared/enums/uploadTypeEnums";

import { ImageUploaderLibComponent } from "@swiftlyme/image-uploader";

@Component({
  selector: "app-client-kyc",
  standalone: true,

  imports: [CommonModule, ImageUploaderLibComponent],

  templateUrl: "./client-kyc.component.html",
  styleUrls: ["./client-kyc.component.css"],
})
export class ClientKycComponent implements OnInit, OnDestroy {
  // =========================================================
  // CLIENT
  // =========================================================

  clientId: string | null = null;

  client: any = null;

  isLoading = false;

  errorMessage = "";

  // =========================================================
  // KYC DOCUMENTS
  // =========================================================

  kycDocuments: {
    [key: string]: {
      fileName: string;
      filePath: string;
      fileType: string;
      fileSize: number;
      previewUrl: string;
      id?: number;
    } | null;
  } = {
    PAN: null,
    AADHAAR_FRONT: null,
    AADHAAR_BACK: null,
    GST: null,
    TAN: null,
    INCORPORATION: null,
  };

  // =========================================================
  // CURRENT UPLOAD STATE
  // =========================================================

  @ViewChild("panUploaderHost")
  panUploaderHost?: ElementRef<HTMLElement>;

  @ViewChild("aadhaarFrontUploaderHost")
  aadhaarFrontUploaderHost?: ElementRef<HTMLElement>;

  @ViewChild("aadhaarBackUploaderHost")
  aadhaarBackUploaderHost?: ElementRef<HTMLElement>;

  @ViewChild("gstUploaderHost")
  gstUploaderHost?: ElementRef<HTMLElement>;

  @ViewChild("tanUploaderHost")
  tanUploaderHost?: ElementRef<HTMLElement>;

  @ViewChild("incorporationUploaderHost")
  incorporationUploaderHost?: ElementRef<HTMLElement>;

  // Each KYC document allows only one file
  maxImages = 1;

  // Aspect ratios are configured in HTML:
  // PAN               -> 1.59 (landscape)
  // AADHAAR FRONT     -> 1.8  (landscape)
  // AADHAAR BACK      -> 1.8  (landscape)
  // GST               -> 0.707 (A4 portrait)
  // TAN               -> 0.707 (A4 portrait)
  // INCORPORATION     -> 0.707 (A4 portrait)

  // =========================================================
  // IMAGE PREVIEW MODAL
  // =========================================================

  showImageModal = false;

  selectedImage = "";

  // =========================================================
  // PER DOCUMENT UPLOAD PROGRESS
  // =========================================================

  uploadingSlots = {
    PAN: new Map<
      number,
      {
        progress: number;
        top: number;
        left: number;
        width: number;
        height: number;
      }
    >(),

    AADHAAR_FRONT: new Map<
      number,
      {
        progress: number;
        top: number;
        left: number;
        width: number;
        height: number;
      }
    >(),

    AADHAAR_BACK: new Map<
      number,
      {
        progress: number;
        top: number;
        left: number;
        width: number;
        height: number;
      }
    >(),

    GST: new Map<
      number,
      {
        progress: number;
        top: number;
        left: number;
        width: number;
        height: number;
      }
    >(),

    TAN: new Map<
      number,
      {
        progress: number;
        top: number;
        left: number;
        width: number;
        height: number;
      }
    >(),

    INCORPORATION: new Map<
      number,
      {
        progress: number;
        top: number;
        left: number;
        width: number;
        height: number;
      }
    >(),
  };

  // =========================================================
  // SLOT TIMERS
  // =========================================================

  private slotTimers = new Map<string, ReturnType<typeof setInterval>>();

  // =========================================================
  // S3 SESSION TRACKING
  // =========================================================

  /**
   * Files uploaded during current session.
   *
   * These can safely be deleted immediately
   * if the user replaces/deletes them before
   * saving.
   */
  private newlyUploadedKycKeys: Set<string> = new Set<string>();

  /**
   * Existing S3 files are deleted only after
   * the database operation succeeds.
   */
  private pendingDeleteKeys: string[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
    private clientService: ClientService,
    private uploadService: UploadService,
  ) {}

  // =========================================================
  // INIT
  // =========================================================

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.clientId = params.get("id");

      if (!this.clientId) {
        this.toastr.error("Client ID is required.");

        this.cancel();

        return;
      }

      this.loadClient();

      this.loadClientKycDocuments();
    });
  }

  // =========================================================
  // DESTROY
  // =========================================================

  ngOnDestroy(): void {
    this.slotTimers.forEach((timer) => clearInterval(timer));

    this.slotTimers.clear();
  }

  // =========================================================
  // LOAD CLIENT
  // =========================================================

  loadClient(): void {
    if (!this.clientId) {
      return;
    }

    this.isLoading = true;

    this.clientService.listClientById(this.clientId).subscribe({
      next: (res: any) => {
        this.client = res?.data || res;

        this.isLoading = false;
      },

      error: (err: any) => {
        console.error("Failed to load client:", err);

        this.isLoading = false;

        this.errorMessage = err?.error?.message || "Failed to load client.";

        this.toastr.error(this.errorMessage);
      },
    });
  }

  // =========================================================
  // KYC DOCUMENT TYPES
  // =========================================================

  getKycDocumentTypes(): string[] {
    const clientType = String(this.client?.clientType || "")
      .trim()
      .toLowerCase();

    if (clientType === "individual") {
      return ["PAN", "AADHAAR_FRONT", "AADHAAR_BACK"];
    }

    if (clientType === "business") {
      return ["PAN", "GST", "TAN", "INCORPORATION"];
    }

    return [];
  }

  // =========================================================
  // KYC LABEL
  // =========================================================

  getKycDocumentLabel(documentType: string): string {
    const labels: {
      [key: string]: string;
    } = {
      PAN: "PAN Card",

      AADHAAR_FRONT: "Aadhaar Card - Front",

      AADHAAR_BACK: "Aadhaar Card - Back",

      GST: "GST Certificate",

      TAN: "TAN Certificate",

      INCORPORATION: "Incorporation Certificate",
    };

    return labels[documentType] || documentType;
  }

  // =========================================================
  // GET IMAGE URLS
  // =========================================================

  getKycImageUrls(documentType: string): string[] {
    const document = this.kycDocuments[documentType];

    if (!document || !document.previewUrl) {
      return [];
    }

    return [document.previewUrl];
  }

  // =========================================================
  // IS UPLOADING
  // =========================================================

  isKycUploading(documentType: string): boolean {
    return (
      this.uploadingSlots[documentType as keyof typeof this.uploadingSlots]
        .size > 0
    );
  }

  // =========================================================
  // UPLOAD KYC DOCUMENT
  // =========================================================

  async onKycImageUpload(image: any, documentType: string): Promise<void> {
    if (!image?.file || !this.clientId) {
      return;
    }

    const slotIndex = 0;

    this.startSlotUpload(documentType, slotIndex);

    try {
      /*
       * IMPORTANT:
       *
       * Same UploadService used by
       * SubCategory.
       *
       * Only UploadType is different.
       */
      const result = await this.uploadService.upload(
        image.file,
        UploadType.CLIENT_KYC,
      );

      /*
       * Keep S3 key.
       */
      image.key = result.key;

      /*
       * Track new S3 file.
       */
      this.newlyUploadedKycKeys.add(result.key);

      /*
       * Store KYC information locally.
       *
       * Database record will be created
       * after Save KYC.
       */
      this.kycDocuments[documentType] = {
        fileName: image.file.name,

        filePath: result.key,

        fileType: image.file.type || "",

        fileSize: image.file.size,

        previewUrl: result.previewUrl || result.key,
      };

      this.completeSlotUpload(documentType, slotIndex);
    } catch (err: any) {
      console.error("KYC S3 upload failed:", err);

      this.toastr.error(`KYC upload failed: ${err?.message || err}`);

      this.endSlotUpload(documentType, slotIndex);
    } finally {
      setTimeout(() => {
        this.endSlotUpload(documentType, slotIndex);
      }, 400);
    }
  }

  // =========================================================
  // REPLACE KYC DOCUMENT
  // =========================================================

  async onKycImageReplace(event: any, documentType: string): Promise<void> {
    if (!event?.new?.file || !this.clientId) {
      return;
    }

    const slotIndex = event.index ?? 0;

    this.startSlotUpload(documentType, slotIndex);

    try {
      /*
       * Upload new file first.
       */
      const result = await this.uploadService.upload(
        event.new.file,
        UploadType.CLIENT_KYC,
      );

      event.new.key = result.key;

      const oldDocument = this.kycDocuments[documentType];

      const oldKey = oldDocument?.filePath || "";

      /*
       * Old file handling.
       */
      if (
        oldKey &&
        typeof oldKey === "string" &&
        !oldKey.startsWith("http://") &&
        !oldKey.startsWith("https://")
      ) {
        /*
         * If old file was uploaded
         * during current session,
         * delete immediately.
         */
        if (this.newlyUploadedKycKeys.has(oldKey)) {
          this.uploadService
            .delete(oldKey)
            .catch((err) =>
              console.error("Failed to delete old KYC S3 file:", err),
            );

          this.newlyUploadedKycKeys.delete(oldKey);
        } else {
          /*
           * Existing DB file:
           * delete after save succeeds.
           */
          this.pendingDeleteKeys.push(oldKey);
        }
      }

      /*
       * Preserve DB ID if replacing
       * an existing KYC document.
       */
      this.kycDocuments[documentType] = {
        id: oldDocument?.id,

        fileName: event.new.file.name,

        filePath: result.key,

        fileType: event.new.file.type || "",

        fileSize: event.new.file.size,

        previewUrl: result.previewUrl || result.key,
      };

      /*
       * New key belongs to current session.
       */
      this.newlyUploadedKycKeys.add(result.key);

      this.completeSlotUpload(documentType, slotIndex);
    } catch (err: any) {
      console.error("KYC S3 replacement failed:", err);

      this.toastr.error(`KYC replacement failed: ${err?.message || err}`);

      this.endSlotUpload(documentType, slotIndex);
    } finally {
      setTimeout(() => {
        this.endSlotUpload(documentType, slotIndex);
      }, 400);
    }
  }

  // =========================================================
  // DELETE KYC DOCUMENT
  // =========================================================

  onKycImageDelete(image: any, documentType: string): void {
    const document = this.kycDocuments[documentType];

    if (!document) {
      return;
    }

    const key = document.filePath;

    /*
     * If newly uploaded in current session,
     * delete S3 immediately.
     */
    if (key && this.newlyUploadedKycKeys.has(key)) {
      this.uploadService
        .delete(key)
        .catch((err) => console.error("Failed to delete KYC S3 file:", err));

      this.newlyUploadedKycKeys.delete(key);
    }

    /*
     * If existing DB document,
     * delete database record.
     */
    if (document.id) {
      this.clientService.deleteClientKycDocument(document.id).subscribe({
        next: () => {
          this.toastr.success("KYC document deleted successfully.");
        },

        error: (err: any) => {
          console.error("Failed to delete KYC document:", err);

          this.toastr.error(
            err?.error?.message || "Failed to delete KYC document.",
          );
        },
      });
    }

    this.kycDocuments[documentType] = null;
  }

  // =========================================================
  // IMAGE CHANGE
  // =========================================================

  handleKycImagesChange(images: any[], documentType: string): void {
    /*
     * Same safety logic as SubCategory.
     *
     * ImageUploader library may sometimes
     * send an empty/stale imagesChange event.
     */
    if (!images) {
      return;
    }

    const document = this.kycDocuments[documentType];

    if (document && images.length === 0) {
      return;
    }
  }

  // =========================================================
  // IMAGE EDIT
  // =========================================================

  onKycImageEdit(image: any, documentType: string): void {
    console.log(`KYC ${documentType} image edited:`, image);
  }

  // =========================================================
  // IMAGE MODAL
  // =========================================================

  openImageModal(imageUrl: string): void {
    this.selectedImage = imageUrl;

    this.showImageModal = true;
  }

  closeImageModal(): void {
    this.showImageModal = false;

    this.selectedImage = "";
  }

  // =========================================================
  // EXTRACT S3 KEY
  // =========================================================

  private extractS3KeyFromUrl(url: string): string {
    if (!url) {
      return "";
    }

    try {
      const parsed = new URL(url);

      return decodeURIComponent(parsed.pathname.replace(/^\//, ""));
    } catch {
      return url.split("?")[0];
    }
  }

  // =========================================================
  // START SLOT UPLOAD
  // =========================================================

  private startSlotUpload(documentType: string, index: number): void {
    const slots = this.getUploadingSlots(documentType);

    slots.set(index, {
      progress: 0,
      ...this.getSlotRect(documentType, index),
    });

    this.clearSlotTimer(documentType, index);

    const timer = setInterval(() => {
      const slot = slots.get(index);

      if (!slot) {
        return;
      }

      let progress = slot.progress;

      if (progress < 90) {
        const step =
          progress < 60 ? Math.random() * 8 + 4 : Math.random() * 3 + 1;

        progress = Math.min(90, progress + step);
      }

      slots.set(index, {
        progress,
        ...this.getSlotRect(documentType, index),
      });
    }, 200);

    this.slotTimers.set(this.getTimerKey(documentType, index), timer);
  }

  // =========================================================
  // COMPLETE SLOT
  // =========================================================

  private completeSlotUpload(documentType: string, index: number): void {
    this.clearSlotTimer(documentType, index);

    const slots = this.getUploadingSlots(documentType);

    const slot = slots.get(index);

    if (slot) {
      slots.set(index, {
        ...slot,
        progress: 100,
      });
    }
  }

  // =========================================================
  // END SLOT
  // =========================================================

  private endSlotUpload(documentType: string, index: number): void {
    this.clearSlotTimer(documentType, index);

    const slots = this.getUploadingSlots(documentType);

    slots.delete(index);
  }

  // =========================================================
  // CLEAR TIMER
  // =========================================================

  private clearSlotTimer(documentType: string, index: number): void {
    const key = this.getTimerKey(documentType, index);

    const timer = this.slotTimers.get(key);

    if (timer) {
      clearInterval(timer);

      this.slotTimers.delete(key);
    }
  }

  // =========================================================
  // TIMER KEY
  // =========================================================

  private getTimerKey(documentType: string, index: number): string {
    return `${documentType}_${index}`;
  }

  // =========================================================
  // GET UPLOADING SLOTS
  // =========================================================

  private getUploadingSlots(documentType: string): Map<
    number,
    {
      progress: number;
      top: number;
      left: number;
      width: number;
      height: number;
    }
  > {
    return this.uploadingSlots[
      documentType as keyof typeof this.uploadingSlots
    ];
  }

  // =========================================================
  // GET SLOT RECT
  // =========================================================

  private getSlotRect(
    documentType: string,
    index: number,
  ): {
    top: number;
    left: number;
    width: number;
    height: number;
  } {
    let wrapper: ElementRef<HTMLElement> | undefined;

    switch (documentType) {
      case "PAN":
        wrapper = this.panUploaderHost;
        break;

      case "AADHAAR_FRONT":
        wrapper = this.aadhaarFrontUploaderHost;
        break;

      case "AADHAAR_BACK":
        wrapper = this.aadhaarBackUploaderHost;
        break;

      case "GST":
        wrapper = this.gstUploaderHost;
        break;

      case "TAN":
        wrapper = this.tanUploaderHost;
        break;

      case "INCORPORATION":
        wrapper = this.incorporationUploaderHost;
        break;
    }

    if (!wrapper) {
      return {
        top: 0,
        left: 0,
        width: 0,
        height: 0,
      };
    }

    const slotEls = wrapper.nativeElement.querySelectorAll(".cdk-drag");

    const el = slotEls[index] as HTMLElement | undefined;

    if (!el) {
      return {
        top: 0,
        left: 0,
        width: 0,
        height: 0,
      };
    }

    const elRect = el.getBoundingClientRect();

    const wrapperRect = wrapper.nativeElement.getBoundingClientRect();

    return {
      top: elRect.top - wrapperRect.top,

      left: elRect.left - wrapperRect.left,

      width: elRect.width,

      height: elRect.height,
    };
  }

  // =========================================================
  // SAVE KYC
  // =========================================================

  async saveKyc(): Promise<void> {
    if (!this.clientId) {
      this.toastr.error("Client ID is required.");
      return;
    }

    if (this.isAnyKycUploading()) {
      this.toastr.error("Please wait until all uploads are complete.");
      return;
    }

    const documentTypes = this.getKycDocumentTypes();

    console.log("========== SAVE KYC ==========");
    console.log("Client:", this.client);
    console.log("Client ID:", this.clientId);
    console.log("Client Type:", this.client?.clientType);
    console.log("Document Types:", documentTypes);
    console.log("KYC Documents:", this.kycDocuments);

    if (!documentTypes.length) {
      this.toastr.error(
        `No KYC document types found for client type: ${
          this.client?.clientType || "Unknown"
        }`,
      );
      return;
    }

    const documentsToSave = documentTypes.filter(
      (documentType) => !!this.kycDocuments[documentType]?.filePath,
    );

    console.log("Documents To Save:", documentsToSave);

    if (!documentsToSave.length) {
      this.toastr.error("Please upload at least one KYC document.");
      return;
    }

    try {
      for (const documentType of documentsToSave) {
        console.log("Calling saveKycDocument:", documentType);

        await this.saveKycDocument(documentType);
      }

      for (const key of this.pendingDeleteKeys) {
        try {
          await this.uploadService.delete(key);
        } catch (err) {
          console.error("Failed to delete old KYC S3 file:", key, err);
        }
      }

      this.pendingDeleteKeys = [];

      this.toastr.success("KYC documents saved successfully.");

      await this.loadClientKycDocuments();
    } catch (err: any) {
      console.error("Failed to save KYC:", err);

      this.errorMessage =
        err?.error?.message || "Failed to save KYC documents.";

      this.toastr.error(this.errorMessage);
    }
  }

  // =========================================================
  // SAVE SINGLE KYC DOCUMENT
  // =========================================================

  private async saveKycDocument(documentType: string): Promise<void> {
    if (!this.clientId) {
      return;
    }

    const document = this.kycDocuments[documentType];

    if (!document) {
      return;
    }

    const payload = {
      id: document.id, // IMPORTANT FOR EDIT
      clientId: Number(this.clientId),
      documentType: documentType,
      fileName: document.fileName,
      filePath: document.filePath,
      fileType: document.fileType,
      fileSize: document.fileSize,
    };

    console.log("Saving KYC document:", payload);

    await new Promise<void>((resolve, reject) => {
      this.clientService.uploadClientKycDocument(payload).subscribe({
        next: () => {
          resolve();
        },
        error: (err) => {
          reject(err);
        },
      });
    });
  }

  // =========================================================
  // LOAD KYC DOCUMENTS
  // =========================================================

  loadClientKycDocuments(): void {
    if (!this.clientId) {
      return;
    }

    this.clientService.getClientKycDocuments(this.clientId).subscribe({
      next: async (res: any) => {
        const documents = res?.data || res || [];

        this.kycDocuments = {
          PAN: null,

          AADHAAR_FRONT: null,

          AADHAAR_BACK: null,

          GST: null,

          TAN: null,

          INCORPORATION: null,
        };

        for (const document of documents) {
          if (!this.kycDocuments.hasOwnProperty(document.documentType)) {
            continue;
          }

          let previewUrl = document.filePath;

          /*
           * Generate signed S3 URL.
           */
          if (document.filePath) {
            try {
              previewUrl = await this.uploadService.getPreviewUrl(
                document.filePath,
              );
            } catch (err) {
              console.error("Failed to generate KYC preview URL:", err);
            }
          }

          this.kycDocuments[document.documentType] = {
            id: document.id,

            fileName: document.fileName,

            filePath: document.filePath,

            fileType: document.fileType || "",

            fileSize: document.fileSize || 0,

            previewUrl: previewUrl || document.filePath,
          };
        }
      },

      error: (err: any) => {
        console.error("Failed to load KYC documents:", err);

        this.toastr.error(
          err?.error?.message || "Failed to load KYC documents.",
        );
      },
    });
  }

  // =========================================================
  // CHECK ALL UPLOADS
  // =========================================================

  isAnyKycUploading(): boolean {
    return (
      this.uploadingSlots.PAN.size > 0 ||
      this.uploadingSlots.AADHAAR_FRONT.size > 0 ||
      this.uploadingSlots.AADHAAR_BACK.size > 0 ||
      this.uploadingSlots.GST.size > 0 ||
      this.uploadingSlots.TAN.size > 0 ||
      this.uploadingSlots.INCORPORATION.size > 0
    );
  }

  // =========================================================
  // CANCEL / BACK
  // =========================================================

  cancel(): void {
    this.router.navigate(["/manage-client"]);
  }
}
