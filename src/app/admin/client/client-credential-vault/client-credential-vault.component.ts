import { Component, Input, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

import { CredentialVaultService } from "../../../services/credentail-vault.service";
import { PortalService } from "../../../services/portal.service";

// =====================================================
// INTERFACES
// =====================================================

interface Portal {
  id: number;
  name: string;
  url: string;
  description?: string;
  status?: number;
}

interface Credential {
  id: number;
  clientId: number;
  portalId: number;
  portalName: string;
  portalUrl: string;
  portalDescription?: string;
  username: string;
  hasPassword?: boolean;
  consentAccepted: boolean;
  passwordProvidedBy?: "ca" | "client";
  // NEW: request info returned by backend
  passwordRequestStatus?: "pending" | "fulfilled" | "rejected" | null;
  requestedAt?: string | null;
  respondedAt?: string | null;
}

interface CredentialPasswordRequest {
  id: number;
  clientId: number;
  portalId: number;
  status: "pending" | "fulfilled" | "rejected";
  requestedAt?: string;
  respondedAt?: string;
}

@Component({
  selector: "app-client-credential-vault",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./client-credential-vault.component.html",
  styleUrl: "./client-credential-vault.component.css",
})
export class ClientCredentialVaultComponent implements OnInit {
  @Input() clientIdInput!: number;
  @Input() isViewMode = false;
  @Input() embedded = false;

  credentials: Credential[] = [];
  portals: Portal[] = [];

  // Password request tracking
  passwordRequests: CredentialPasswordRequest[] = [];

  passwordRequestStatus: {
    [portalId: number]: "pending" | "fulfilled" | "rejected";
  } = {};

  requestLoading: {
    [portalId: number]: boolean;
  } = {};

  loading = false;
  submitting = false;
  savingPortal = false;

  showForm = false;
  showNewPortalForm = false;
  showRequestModal = false;

  isEditMode = false;
  editingId: number | null = null;

  visiblePasswords: { [key: number]: string } = {};
  passwordLoading: { [key: number]: boolean } = {};

  // =====================================================
  // CREDENTIAL FORM
  // =====================================================

  credentialForm = {
    portalId: null as number | null,
    username: "",
    password: "",
    consentAccepted: false,
  };

  // =====================================================
  // NEW PORTAL FORM
  // =====================================================

  newPortalForm = {
    name: "",
    url: "",
    description: "",
  };

  constructor(
    private credentialVaultService: CredentialVaultService,
    private portalService: PortalService,
  ) {}

  // =====================================================
  // INIT
  // =====================================================

  ngOnInit(): void {
    this.loadActivePortals();
    this.loadCredentials();
    this.loadPasswordRequests();
  }

  // =====================================================
  // STATE HELPERS (NEW)
  // =====================================================

  // Request sent, client has not replied yet
  isPending(c: Credential): boolean {
    return c.passwordRequestStatus === "pending";
  }

  // Client submitted the password -> CA cannot edit
  isClientSubmitted(c: Credential): boolean {
    return c.passwordProvidedBy === "client" && !!c.hasPassword;
  }

  canEdit(c: Credential): boolean {
    return !this.isViewMode && !this.isPending(c) && !this.isClientSubmitted(c);
  }

  canViewPassword(c: Credential): boolean {
    return !!c.hasPassword && !this.isPending(c);
  }

  // =====================================================
  // SELECTED PORTAL DETAILS
  // =====================================================

  get selectedPortal(): Portal | undefined {
    return this.portals.find(
      (portal) => Number(portal.id) === Number(this.credentialForm.portalId),
    );
  }

  // =====================================================
  // LOAD ACTIVE PORTALS
  // =====================================================

  loadActivePortals(): void {
    this.portalService.getActivePortals().subscribe({
      next: (response: any) => {
        console.log("Active portals response:", response);

        const portalData =
          response?.data?.portals ??
          response?.data?.data ??
          response?.data ??
          response?.portals ??
          [];

        this.portals = Array.isArray(portalData) ? portalData : [];
      },

      error: (error: any) => {
        console.error("Error loading active portals:", error);

        this.portals = [];
      },
    });
  }

  // =====================================================
  // LOAD CLIENT CREDENTIALS
  // =====================================================

  loadCredentials(): void {
    if (!this.clientIdInput) {
      return;
    }

    this.loading = true;

    this.credentialVaultService
      .getCredentialsByClient(this.clientIdInput)
      .subscribe({
        next: (response: any) => {
          console.log("Credential list response:", response);

          const credentialData =
            response?.data?.credentials ??
            response?.data?.data ??
            response?.data ??
            response?.credentials ??
            [];

          this.credentials = Array.isArray(credentialData)
            ? credentialData.map((credential: Credential) => ({
                ...credential,
                // CHANGED: default to 'ca' only when a password really exists
                passwordProvidedBy:
                  credential.passwordProvidedBy ||
                  (credential.hasPassword ? "ca" : undefined),
              }))
            : [];

          this.loading = false;
        },

        error: (error: any) => {
          console.error("Error loading credentials:", error);

          this.credentials = [];
          this.loading = false;
        },
      });
  }

  // =====================================================
  // LOAD PASSWORD REQUESTS
  // =====================================================

  loadPasswordRequests(): void {
    if (!this.clientIdInput) {
      return;
    }

    this.credentialVaultService
      .getPasswordRequestsByClient(this.clientIdInput)
      .subscribe({
        next: (response: any) => {
          const requests =
            response?.data?.requests ??
            response?.data ??
            response?.requests ??
            [];

          this.passwordRequests = Array.isArray(requests) ? requests : [];

          this.passwordRequestStatus = {};

          this.passwordRequests.forEach((request) => {
            this.passwordRequestStatus[request.portalId] = request.status;
          });
        },

        error: (error: any) => {
          console.error("Error loading password requests:", error);
        },
      });
  }

  // =====================================================
  // REQUEST PASSWORD FROM CLIENT
  // =====================================================

  requestPassword(portal: Portal): void {
    if (!this.clientIdInput || !portal?.id) {
      return;
    }

    if (this.requestLoading[portal.id]) {
      return;
    }

    if (this.passwordRequestStatus[portal.id] === "pending") {
      alert("A password request is already pending for this portal.");
      return;
    }

    const confirmed = confirm(
      `Do you want to request ${portal.name} credentials from this client?`,
    );

    if (!confirmed) {
      return;
    }

    this.requestLoading[portal.id] = true;

    this.credentialVaultService
      .requestCredentialPassword({
        clientId: this.clientIdInput,
        portalId: portal.id,
      })
      .subscribe({
        next: (response: any) => {
          this.requestLoading[portal.id] = false;

          alert(response?.message || "Password request sent successfully.");

          this.showRequestModal = false;
          this.credentialForm.portalId = null;

          // Reload from backend so the status remains correct
          this.loadPasswordRequests();
          // NEW: also reload cards so the "Awaiting Client" card appears
          this.loadCredentials();
        },

        error: (error: any) => {
          this.requestLoading[portal.id] = false;

          console.error("Password request error:", error);

          alert(error?.error?.message || "Unable to send password request.");

          this.loadPasswordRequests();
        },
      });
  }

  // =====================================================
  // OPEN ADD FORM
  // =====================================================

  openAddForm(): void {
    this.resetForm();

    this.showForm = true;
    this.showNewPortalForm = false;
    this.isEditMode = false;
  }

  // =====================================================
  // EDIT CREDENTIAL
  // =====================================================

  editCredential(credential: Credential): void {
    // NEW: CA cannot edit pending requests or client-submitted passwords
    if (!this.canEdit(credential)) {
      return;
    }

    this.resetForm();

    this.showForm = true;
    this.showNewPortalForm = false;
    this.isEditMode = true;

    this.editingId = credential.id;

    this.credentialForm = {
      portalId: credential.portalId,
      username: credential.username,
      password: "",
      consentAccepted: credential.consentAccepted,
    };
  }

  // =====================================================
  // ADD NEW PORTAL FORM
  // =====================================================

  openNewPortalForm(): void {
    if (this.isViewMode) {
      return;
    }

    this.showNewPortalForm = true;

    this.newPortalForm = {
      name: "",
      url: "",
      description: "",
    };
  }

  // =====================================================
  // CANCEL NEW PORTAL
  // =====================================================

  cancelNewPortal(): void {
    this.showNewPortalForm = false;

    this.newPortalForm = {
      name: "",
      url: "",
      description: "",
    };
  }

  // =====================================================
  // SAVE NEW PORTAL
  // =====================================================

  saveNewPortal(): void {
    const name = this.newPortalForm.name.trim();
    const url = this.newPortalForm.url.trim();
    const description = this.newPortalForm.description.trim();

    if (!name) {
      alert("Please enter portal name.");
      return;
    }

    if (!url) {
      alert("Please enter portal URL.");
      return;
    }

    // Validate URL
    try {
      const parsedUrl = new URL(url);

      if (parsedUrl.protocol !== "https:") {
        alert("Please enter a valid HTTPS portal URL.");
        return;
      }
    } catch {
      alert("Please enter a valid portal URL.");
      return;
    }

    // Check duplicate portal name
    const alreadyExists = this.portals.some(
      (portal) => portal.name?.trim().toLowerCase() === name.toLowerCase(),
    );

    if (alreadyExists) {
      alert("This portal already exists. Please select it from the list.");
      return;
    }

    this.savingPortal = true;

    this.portalService
      .create({
        name,
        url,
        description,
        status: 1,
      })
      .subscribe({
        next: (response: any) => {
          console.log("New portal response:", response);

          const createdPortal =
            response?.data?.portal ??
            response?.data ??
            response?.portal ??
            response;

          if (!createdPortal?.id) {
            this.savingPortal = false;

            alert(
              "Portal was created, but the portal ID was not returned. " +
                "Please refresh the portal list.",
            );

            this.loadActivePortals();

            return;
          }

          const portal: Portal = {
            id: Number(createdPortal.id),
            name: createdPortal.name || name,
            url: createdPortal.url || url,
            description: createdPortal.description || description,
            status: createdPortal.status ?? 1,
          };

          this.portals = [...this.portals, portal];

          // Automatically select the newly created portal
          this.credentialForm.portalId = portal.id;

          this.showNewPortalForm = false;
          this.savingPortal = false;

          this.newPortalForm = {
            name: "",
            url: "",
            description: "",
          };

          alert("Portal added successfully.");
        },

        error: (error: any) => {
          console.error("Create portal error:", error);

          this.savingPortal = false;

          alert(error?.error?.message || "Unable to add portal.");
        },
      });
  }

  // =====================================================
  // SAVE / UPDATE CREDENTIAL
  // =====================================================

  saveCredential(): void {
    if (!this.credentialForm.portalId) {
      alert("Please select a portal.");
      return;
    }

    if (!this.credentialForm.username.trim()) {
      alert("Please enter username.");
      return;
    }

    if (!this.isEditMode && !this.credentialForm.password.trim()) {
      alert("Please enter password.");
      return;
    }

    if (!this.credentialForm.consentAccepted) {
      alert("Please accept the consent before continuing.");
      return;
    }

    const payload: any = {
      portalId: this.credentialForm.portalId,

      username: this.credentialForm.username.trim(),

      consentAccepted: true,
    };

    if (this.credentialForm.password.trim()) {
      payload.password = this.credentialForm.password;
    }

    this.submitting = true;

    // UPDATE CREDENTIAL
    if (this.isEditMode && this.editingId !== null) {
      this.credentialVaultService
        .updateCredential(this.editingId, payload)
        .subscribe({
          next: (response: any) => {
            console.log("Credential updated:", response);

            alert("Credential updated successfully.");

            this.afterSave();
          },

          error: (error: any) => {
            console.error("Update credential error:", error);

            alert(error?.error?.message || "Unable to update credential.");

            this.submitting = false;
          },
        });
    }

    // CREATE CREDENTIAL
    else {
      payload.clientId = this.clientIdInput;

      this.credentialVaultService.createCredential(payload).subscribe({
        next: (response: any) => {
          console.log("Credential created:", response);

          alert("Credential saved successfully.");

          this.afterSave();
        },

        error: (error: any) => {
          console.error("Create credential error:", error);

          alert(error?.error?.message || "Unable to save credential.");

          this.submitting = false;
        },
      });
    }
  }

  // =====================================================
  // AFTER SAVE
  // =====================================================

  afterSave(): void {
    this.submitting = false;

    this.showForm = false;
    this.showNewPortalForm = false;

    this.resetForm();

    this.loadCredentials();
    this.loadPasswordRequests();
  }

  // =====================================================
  // VIEW / HIDE PASSWORD
  // =====================================================

  viewPassword(credential: Credential): void {
    const id = credential.id;

    // Hide password if already visible
    if (this.visiblePasswords[id]) {
      delete this.visiblePasswords[id];

      return;
    }

    // NEW: nothing to view while request is pending
    if (!this.canViewPassword(credential)) {
      return;
    }

    this.passwordLoading[id] = true;

    this.credentialVaultService.viewCredentialPassword(id).subscribe({
      next: (response: any) => {
        this.visiblePasswords[id] =
          response?.data?.password || response?.password || "";

        this.passwordLoading[id] = false;

        if (!this.visiblePasswords[id]) {
          alert("Password was not returned by the server.");
        }
      },

      error: (error: any) => {
        console.error("View password error:", error);

        alert(error?.error?.message || "Unable to view password.");

        this.passwordLoading[id] = false;
      },
    });
  }

  // =====================================================
  // DELETE CREDENTIAL
  // =====================================================

  deleteCredential(id: number): void {
    const confirmed = confirm(
      "Are you sure you want to delete this credential?",
    );

    if (!confirmed) {
      return;
    }

    this.credentialVaultService.deleteCredential(id).subscribe({
      next: (response: any) => {
        console.log("Credential deleted:", response);

        alert("Credential deleted successfully.");

        delete this.visiblePasswords[id];

        this.loadCredentials();
      },

      error: (error: any) => {
        console.error("Delete credential error:", error);

        alert(error?.error?.message || "Unable to delete credential.");
      },
    });
  }

  // =====================================================
  // OPEN PORTAL
  // =====================================================

  openPortal(url: string): void {
    if (!url) {
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  }

  // =====================================================
  // CANCEL FORM
  // =====================================================

  cancelForm(): void {
    this.showForm = false;
    this.showNewPortalForm = false;

    this.resetForm();
  }

  // =====================================================
  // RESET FORM
  // =====================================================

  resetForm(): void {
    this.credentialForm = {
      portalId: null,

      username: "",

      password: "",

      consentAccepted: false,
    };

    this.editingId = null;
    this.isEditMode = false;

    this.showNewPortalForm = false;

    this.newPortalForm = {
      name: "",
      url: "",
      description: "",
    };
  }
}
