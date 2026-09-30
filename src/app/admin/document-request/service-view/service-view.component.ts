import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router } from "@angular/router";

import { DocumentRequestService } from "../../../services/document-request.service";
import { AddDocumentRequestComponent } from "../add-document-request/add-document-request.component";
import { SubmittedDocumentsComponent } from "../submitted-documents/submitted-documents.component";

@Component({
  selector: "app-service-view",
  standalone: true,
  imports: [
    CommonModule,
    AddDocumentRequestComponent,
    SubmittedDocumentsComponent,
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

  activeTab: "request" | "submitted" = "request";

  // =========================================================
  // CONSTRUCTOR
  // =========================================================

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private documentRequestService: DocumentRequestService,
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

    console.log("Document Request ID:", this.documentRequestId);

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

    this.documentRequestService.getById(this.documentRequestId).subscribe({
      next: (response: any) => {
        console.log("Document Request Details:", response);

        this.requestData = response?.data || response?.result || response;

        if (this.requestData?.serviceId) {
          this.serviceId = Number(this.requestData.serviceId);
        }

        console.log("Service ID:", this.serviceId);
        console.log("Request Data:", this.requestData);

        this.loading = false;
      },

      error: (error: any) => {
        console.error("Error loading document request:", error);

        this.loading = false;
      },
    });
  }

  // =========================================================
  // TAB
  // =========================================================

  setTab(tab: "request" | "submitted"): void {
    this.activeTab = tab;
  }
  // =========================================================
  // EDIT SERVICE REQUEST
  // =========================================================

  editServiceRequest(): void {
    this.router.navigate(["/edit-service-request", this.documentRequestId]);
  }

  // =========================================================
  // BACK
  // =========================================================

  goBack(): void {
    this.router.navigate(["/service-requests"]);
  }
}
