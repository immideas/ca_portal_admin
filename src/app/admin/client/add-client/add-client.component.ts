import { Component, OnDestroy, OnInit } from "@angular/core";

import { Router, ActivatedRoute, RouterModule } from "@angular/router";

import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from "@angular/forms";

import { CommonModule } from "@angular/common";

import { HttpClientModule } from "@angular/common/http";

import { NgxUiLoaderModule, NgxUiLoaderService } from "ngx-ui-loader";

import { ToastrService, ToastrModule } from "ngx-toastr";

import { Observable } from "rxjs";

import { MatDialog, MatDialogModule } from "@angular/material/dialog";

import { ConfirmDialogComponent } from "../../../confirm-dialog/confirm-dialog.component";

import { ClientService } from "../../../services/client.service";

import { ClientGroupService } from "../../../services/client-group.service";
import { getLocationDetails,getAllCountries,} from "@swiftlyme/locationbycsc";

@Component({
  selector: "app-add-client",

  templateUrl: "./add-client.component.html",

  styleUrls: ["./add-client.component.css"],

  standalone: true,

  imports: [
    CommonModule,
    HttpClientModule,
    RouterModule,
    ReactiveFormsModule,
    NgxUiLoaderModule,
    ToastrModule,
    MatDialogModule,
  ],
})
export class AddClientComponent implements OnInit, OnDestroy {
  clientForm: FormGroup;

  token: string | null = localStorage.getItem("token");

  submitted = false;

  isEditMode = false;

  isViewMode = false;

  clientId: string | null = null;

  originalData: any = null;

  isSaving = false;

  clientGroups: any[] = [];
  countries: any[] = [];
states: any[] = [];
cities: any[] = [];

selectedCountry: any = null;
selectedState: any = null;

  isBusinessClient = false;

  constructor(
    private fb: FormBuilder,

    private router: Router,

    private route: ActivatedRoute,

    private ngxLoader: NgxUiLoaderService,

    private toastr: ToastrService,

    private dialog: MatDialog,

    private clientService: ClientService,

    private clientGroupService: ClientGroupService,
  ) {
    this.clientForm = this.fb.group({
      /*
       * File number is generated
       * automatically by backend.
       */
      fileNo: [
        {
          value: "",
          disabled: true,
        },
      ],

      clientName: [
        "",
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(150),
        ],
      ],

      clientType: [null, Validators.required],

      businessName: [""],

      businessType: [""],

      pan: ["", [Validators.maxLength(20)]],

      gstin: ["", [Validators.maxLength(20)]],

      tan: ["", [Validators.maxLength(20)]],

      clientGroupId: [null],

      phone: ["", [Validators.maxLength(20)]],

      email: ["", [Validators.email, Validators.maxLength(150)]],

      address: [""],

      city: ["", [Validators.maxLength(100)]],

      state: ["", [Validators.maxLength(100)]],

      pincode: ["", [Validators.maxLength(10)]],

      country: ["India", [Validators.maxLength(100)]],

      status: [1, Validators.required],
    });
  }

  // =====================================================
  // INIT
  // =====================================================

  ngOnInit(): void {
    /*
     * Load client groups for dropdown.
     */
    this.loadClientGroups();
     this.loadCountries();


    /*
     * Detect Individual / Business.
     */
    this.clientForm.get("clientType")?.valueChanges.subscribe((value) => {
      this.isBusinessClient = value === "Business";

      this.updateBusinessValidators();
    });

    /*
     * Check route ID.
     */
    this.route.paramMap.subscribe((params) => {
      this.clientId = params.get("id");

      if (this.clientId) {
        this.isEditMode = true;

        this.fetchClientData(this.clientId);
      }
    });

    /*
     * Check view mode.
     */
    this.route.queryParamMap.subscribe((queryParams) => {
      this.isViewMode = queryParams.get("viewMode") === "true";

      if (this.isViewMode) {
        this.clientForm.disable();
      }
    });
  }

  // =====================================================
  // BUSINESS VALIDATION
  // =====================================================

  updateBusinessValidators(): void {
    const businessNameControl = this.clientForm.get("businessName");

    const businessTypeControl = this.clientForm.get("businessType");

    if (this.isBusinessClient) {
      businessNameControl?.setValidators([
        Validators.required,
        Validators.maxLength(200),
      ]);

      businessTypeControl?.setValidators([
        Validators.required,
        Validators.maxLength(100),
      ]);
    } else {
      businessNameControl?.clearValidators();

      businessTypeControl?.clearValidators();

      businessNameControl?.setValue("", { emitEvent: false });

      businessTypeControl?.setValue("", { emitEvent: false });
    }

    businessNameControl?.updateValueAndValidity();

    businessTypeControl?.updateValueAndValidity();
  }
  // =====================================================
// LOAD COUNTRIES
// =====================================================

// =====================================================
// LOAD COUNTRIES
// =====================================================

loadCountries(): void {
  try {
    this.countries = getAllCountries();

    console.log("Countries loaded:", this.countries);
  } catch (error) {
    console.error("Failed to load countries:", error);

    this.toastr.error(
      "Failed to load countries",
      "Error"
    );
  }
}

// =====================================================
// COUNTRY CHANGE
// =====================================================

onCountryChange(event: Event): void {
  const countryName = (event.target as HTMLSelectElement).value;

  this.states = [];
  this.cities = [];

  this.selectedCountry = null;
  this.selectedState = null;

  this.clientForm.patchValue(
    {
      state: "",
      city: "",
    },
    { emitEvent: false }
  );

  if (!countryName) {
    return;
  }

  try {
    const results = getLocationDetails(countryName);

    const countryResult = results.find(
      (location: any) =>
        location.type === "Country" &&
        location.data?.name?.toLowerCase() ===
          countryName.toLowerCase()
    );

    if (!countryResult) {
      console.warn("Country not found:", countryName);
      return;
    }

    this.selectedCountry = countryResult;

    /*
     * Country result contains its child states.
     */
  this.states =
  (countryResult as any).children_states ||
  (countryResult as any).childrenStates ||
  [];

    console.log(
      "Selected country:",
      countryResult
    );

    console.log(
      "States:",
      this.states
    );
  } catch (error) {
    console.error(
      "Failed to load states:",
      error
    );

    this.states = [];
  }
}

// =====================================================
// STATE CHANGE
// =====================================================

onStateChange(event: Event): void {
  const stateName = (event.target as HTMLSelectElement).value;

  this.cities = [];
  this.selectedState = null;

  this.clientForm.patchValue(
    {
      city: "",
    },
    { emitEvent: false }
  );

  if (!stateName) {
    return;
  }

  try {
    const results = getLocationDetails(stateName);

    const stateResult = results.find(
      (location: any) =>
        location.type === "State" &&
        location.data?.name?.toLowerCase() ===
          stateName.toLowerCase()
    );

    if (!stateResult) {
      console.warn("State not found:", stateName);
      return;
    }

    this.selectedState = stateResult;

    /*
     * State result contains its child cities.
     */
  this.cities =
  (stateResult as any).children_cities ||
  (stateResult as any).childrenCities ||
  [];

    console.log(
      "Selected state:",
      stateResult
    );

    console.log(
      "Cities:",
      this.cities
    );
  } catch (error) {
    console.error(
      "Failed to load cities:",
      error
    );

    this.cities = [];
  }
}

  // =====================================================
  // LOAD CLIENT GROUPS
  // =====================================================

  loadClientGroups(): void {
    this.clientGroupService.listAllClientGroups({}).subscribe({
      next: (response: any) => {
        /*
         * Depending on your API response,
         * support both:
         *
         * response.data
         * response
         */
        this.clientGroups = response?.data || response || [];
      },

      error: (err: any) => {
        console.error("Failed to fetch client groups:", err);

        this.toastr.error(
          err?.error?.message || "Failed to fetch client groups",
          "Error",
        );
      },
    });
  }

  // =====================================================
  // FETCH CLIENT
  // =====================================================

  fetchClientData(id: string): void {
    this.ngxLoader.start();

    this.clientService.listClientById(id).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();

        const clientData = response?.data || response;

        this.originalData = clientData;

        this.clientForm.patchValue({
          fileNo: clientData.fileNo || "",

          clientName: clientData.clientName || "",

          clientType: clientData.clientType || null,

          businessName: clientData.businessName || "",

          businessType: clientData.businessType || "",

          pan: clientData.pan || "",

          gstin: clientData.gstin || "",

          tan: clientData.tan || "",

          clientGroupId: clientData.clientGroupId ?? null,

          phone: clientData.phone || "",

          email: clientData.email || "",

          address: clientData.address || "",

          city: clientData.city || "",

          state: clientData.state || "",

          pincode: clientData.pincode || "",

          country: clientData.country || "India",

          status: clientData.status ?? 1,
        });

        this.isBusinessClient = clientData.clientType === "Business";

        this.updateBusinessValidators();

        if (this.isViewMode) {
          this.clientForm.disable();
        }
      },

      error: (err: any) => {
        this.ngxLoader.stop();

        console.error("Failed to fetch client:", err);

        this.toastr.error(
          err?.error?.message || "Failed to fetch client",
          "Error",
        );
      },
    });
  }

  // =====================================================
  // SAVE CLIENT
  // =====================================================

  saveClient(): void {
    this.submitted = true;

    if (this.clientForm.invalid) {
      this.clientForm.markAllAsTouched();

      this.toastr.error("Please fill in all required fields correctly.");

      return;
    }

    this.isSaving = true;

    this.ngxLoader.start();

    /*
     * getRawValue() is used because
     * fileNo is disabled.
     */
    const formValue = this.clientForm.getRawValue();

    const payload: any = {
      clientName: formValue.clientName?.trim(),

      clientType: formValue.clientType,

      businessName: formValue.businessName?.trim() || null,

      businessType: formValue.businessType?.trim() || null,

      pan: formValue.pan?.trim() || null,

      gstin: formValue.gstin?.trim() || null,

      tan: formValue.tan?.trim() || null,

      clientGroupId: formValue.clientGroupId || null,

      phone: formValue.phone?.trim() || null,

      email: formValue.email?.trim() || null,

      address: formValue.address?.trim() || null,

      city: formValue.city?.trim() || null,

      state: formValue.state?.trim() || null,

      pincode: formValue.pincode?.trim() || null,

      country: formValue.country?.trim() || "India",

      status: formValue.status,
    };

    // =================================================
    // UPDATE
    // =================================================

    if (this.isEditMode && this.clientId) {
      payload.id = this.clientId;

      this.clientService.updateClient(payload).subscribe({
        next: () => {
          this.ngxLoader.stop();

          this.isSaving = false;

          this.toastr.success("Client updated successfully", "Success");

          this.router.navigate(["/clients"]);
        },

        error: (err: any) => {
          this.ngxLoader.stop();

          this.isSaving = false;

          console.error("Update client failed:", err);

          this.toastr.error(
            err?.error?.message || "Failed to update client",
            "Error",
          );
        },
      });
    }

    // =================================================
    // CREATE
    // =================================================
    else {
      this.clientService.createClient(payload).subscribe({
        next: () => {
          this.ngxLoader.stop();

          this.isSaving = false;

          this.toastr.success("Client added successfully", "Success");

          this.router.navigate(["/clients"]);
        },

        error: (err: any) => {
          this.ngxLoader.stop();

          this.isSaving = false;

          console.error("Create client failed:", err);

          this.toastr.error(
            err?.error?.message || "Failed to add client",
            "Error",
          );
        },
      });
    }
  }

  // =====================================================
  // CANCEL
  // =====================================================

  cancel(): void {
    this.router.navigate(["/clients"]);
  }

  // =====================================================
  // ENABLE EDIT MODE
  // =====================================================

  enableEditMode(): void {
    this.isViewMode = false;

    this.clientForm.enable();

    /*
     * File number should always remain readonly.
     */
    this.clientForm.get("fileNo")?.disable();
  }

  // =====================================================
  // CAN DEACTIVATE
  // =====================================================

  canDeactivate(): Observable<boolean> | Promise<boolean> | boolean {
    if (this.clientForm.dirty && !this.submitted && !this.isViewMode) {
      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        width: "550px",

        disableClose: true,

        data: {
          message: "You have unsaved changes. Do you really want to leave?",
        },
      });

      return dialogRef.afterClosed();
    }

    return true;
  }

  // =====================================================
  // DESTROY
  // =====================================================

  ngOnDestroy(): void {}
}
