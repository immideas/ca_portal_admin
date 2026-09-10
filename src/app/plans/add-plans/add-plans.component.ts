import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgxUiLoaderModule, NgxUiLoaderService } from 'ngx-ui-loader';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';
import { PlansService } from '../../services/plans.service';
import { FeaturesService } from '../../services/features.service';

@Component({
  selector: 'app-add-plans',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgxUiLoaderModule],
  templateUrl: './add-plans.component.html',
  styleUrls: ['./add-plans.component.css']
})
export class AddPlansComponent implements OnInit, OnDestroy {

  planForm: FormGroup;
  isEditMode = false;
  isViewMode = false;
  id: string | null = null;

  canEdit = true;
  errorMessage: string = '';

  featuresLoading = false;
  planGroups: string[] = [];   // 👈 NEW — datalist ke suggestions ke liye

  private gstSub!: Subscription;

  // feature types that render as a plain number input on the plan form
  numericTypes = ['limit', 'quota', 'number', 'days'];

  constructor(
    private fb: FormBuilder,
    private service: PlansService,
    private featuresService: FeaturesService,   // 👈 NEW
    private router: Router,
    private route: ActivatedRoute,
    private loader: NgxUiLoaderService,
    private toastr: ToastrService
  ) {
    this.planForm = this.fb.group({
      plan_name:     ['', Validators.required],
      plan_price:    [null, [Validators.required, Validators.min(0)]],
      setup_cost:    [0],
      status:        ['1'],
      currency:      ['INR'],
      billing_cycle: [null],

      gst_percentage:      [18.00],
      plan_price_subtotal: [{ value: null, disabled: true }],
      plan_price_cgst:     [{ value: null, disabled: true }],
      plan_price_sgst:     [{ value: null, disabled: true }],

      setup_cost_subtotal: [{ value: null, disabled: true }],
      setup_cost_cgst:     [{ value: null, disabled: true }],
      setup_cost_sgst:     [{ value: null, disabled: true }],

      trial_days: [0],
      is_trial:   [false],
is_default: [false],   // 👈 NEW — hamesha false se shuru, user chahe to Yes select kare
plan_group: [''],
      buffer_days: [7],
      purge_days:  [30],

      // 👈 NEW — replaces no_of_users / no_of_customers / no_of_projects /
      // tickets_per_month / open_tickets / reports_analytics / session_activities /
      // email_communication / sms_communication / whatsapp_communication /
      // customer_portal / e2e_encryption / backend_encryption.
      // Those are now driven by the dynamic Feature list instead of hardcoded columns.
      features: this.fb.array([]),
    });
    this.service.listUniquePlanGroups().subscribe({
  next: (response: any) => {
    this.planGroups = response.data || [];
  },
  error: (error: any) => {
    console.error('Error fetching unique plan groups:', error);
  }
});
  
  }

  get featuresArray(): FormArray {
    return this.planForm.get('features') as FormArray;
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(p => {
      this.id = p.get('id');
      if (this.id) {
        this.isEditMode = true;
      }
    });

    this.route.queryParamMap.subscribe(q => {
      this.isViewMode = q.get('viewMode') === 'true';
    });

    this.loadFeatures();

    this.gstSub = this.planForm.get('plan_price')!.valueChanges.subscribe(() => this.calculateGST());
    this.planForm.get('setup_cost')!.valueChanges.subscribe(() => this.calculateGST());
    this.planForm.get('gst_percentage')!.valueChanges.subscribe(() => this.calculateGST());
  }

  ngOnDestroy(): void {
    this.gstSub?.unsubscribe();
  }

  // ================= DYNAMIC FEATURES =================

  loadFeatures(): void {
    this.featuresLoading = true;
    this.loader.start();

    this.featuresService.list({ status: 1, limit: 100 }).subscribe({
      next: (res: any) => {
        const activeFeatures = res.data || [];

        activeFeatures.forEach((f: any) => {
          this.featuresArray.push(this.fb.group({
            feature_id:   [f.id],
            feature_code: [f.feature_code],
            name:         [f.name],
            type:         [f.type],
            enabled:      [f.type === 'boolean' ? false : true],
            value:        [f.type === 'boolean' ? '0' : (f.type === 'text' ? '' : 0)],
          }));
        });

        this.featuresLoading = false;

        if (this.id) {
          this.load();          // plan (and its feature values) load ab karo, controls ban chuke hain
        } else {
          this.loader.stop();
        }
      },
      error: () => {
        this.featuresLoading = false;
        this.loader.stop();
        this.toastr.error('Failed to load plan features');
      }
    });
  }

  toggleFeature(index: number): void {
    if (this.isViewMode) return;
    const group = this.featuresArray.at(index);
    group.patchValue({ enabled: !group.get('enabled')?.value });
  }

  // ================= GST =================

  calculateGST(): void {
    const price     = parseFloat(this.planForm.get('plan_price')?.value) || 0;
    const setupCost = parseFloat(this.planForm.get('setup_cost')?.value) || 0;
    const gst       = parseFloat(this.planForm.get('gst_percentage')?.value) || 0;

    if (price > 0 && gst >= 0) {
      const subtotal = price / (1 + gst / 100);
      const cgst     = subtotal * (gst / 2) / 100;
      const sgst     = subtotal * (gst / 2) / 100;

      this.planForm.patchValue({
        plan_price_subtotal: parseFloat(subtotal.toFixed(2)),
        plan_price_cgst:     parseFloat(cgst.toFixed(2)),
        plan_price_sgst:     parseFloat(sgst.toFixed(2)),
      }, { emitEvent: false });
    } else {
      this.planForm.patchValue({
        plan_price_subtotal: null,
        plan_price_cgst:     null,
        plan_price_sgst:     null,
      }, { emitEvent: false });
    }

    if (setupCost > 0 && gst >= 0) {
      const subtotal = setupCost / (1 + gst / 100);
      const cgst     = subtotal * (gst / 2) / 100;
      const sgst     = subtotal * (gst / 2) / 100;

      this.planForm.patchValue({
        setup_cost_subtotal: parseFloat(subtotal.toFixed(2)),
        setup_cost_cgst:     parseFloat(cgst.toFixed(2)),
        setup_cost_sgst:     parseFloat(sgst.toFixed(2)),
      }, { emitEvent: false });
    } else {
      this.planForm.patchValue({
        setup_cost_subtotal: null,
        setup_cost_cgst:     null,
        setup_cost_sgst:     null,
      }, { emitEvent: false });
    }
  }

  load(): void {
    this.service.getById(this.id!).subscribe({
      next: (res: any) => {
        const data = res.data || res;
        this.planForm.patchValue(data);
        this.calculateGST();

        // dynamic feature values ko patch karo (backend PlanFeature rows se)
        const planFeatures: any[] = data.PlanFeatures || [];
        planFeatures.forEach((pf: any) => {
          const idx = this.featuresArray.controls.findIndex(
            c => c.get('feature_id')?.value === pf.feature_id
          );
          if (idx > -1) {
            this.featuresArray.at(idx).patchValue({
              enabled: !!pf.enabled,
              value: pf.value,
            });
          }
        });

        if (this.isViewMode) this.planForm.disable();

        this.loader.stop();
      },
      error: () => {
        this.loader.stop();
        this.toastr.error('Failed to load plan data');
      }
    });
  }

  save(): void {
    if (this.planForm.invalid) return;

    const raw = this.planForm.getRawValue();

    const payload = {
      ...raw,
      features: raw.features.map((f: any) => ({
        feature_id: f.feature_id,
        enabled: f.enabled,
        value: f.value,
      })),
    };

    const req = this.isEditMode
      ? this.service.update({ id: this.id, ...payload })
      : this.service.create(payload);

    this.loader.start();
    req.subscribe({
      next: () => {
        this.loader.stop();
        this.toastr.success('Plan saved successfully');
        this.router.navigate(['/manage-plans']);
      },
      error: (err) => {
        this.loader.stop();
        this.errorMessage = err.error?.message || 'Save failed';
        this.toastr.error(this.errorMessage);
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/manage-plans']);
  }

  enableEdit(): void {
    this.isViewMode = false;
    this.planForm.enable();
    this.planForm.get('plan_price_subtotal')?.disable();
    this.planForm.get('plan_price_cgst')?.disable();
    this.planForm.get('plan_price_sgst')?.disable();
    this.planForm.get('setup_cost_subtotal')?.disable();
    this.planForm.get('setup_cost_cgst')?.disable();
    this.planForm.get('setup_cost_sgst')?.disable();
  }
}
