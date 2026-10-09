
import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NgxUiLoaderModule, NgxUiLoaderService } from 'ngx-ui-loader';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';
import { PayoutSettingService } from '../../services/payout-setting.service';

@Component({
  selector: 'app-payout-setting',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    NgxUiLoaderModule
  ],
  templateUrl: './payout-setting.component.html',
  styleUrls: ['./payout-setting.component.css']
})
export class PayoutSettingComponent implements OnInit, OnDestroy {
  payoutForm: FormGroup;

  isEditMode = false;
  isLoading = false;
  isSaving = false;
  isRegistering = false;
  razorpayRegistered = false;

  settingId: number | null = null;
  existingAccountNumber = '';
  errorMessage = '';

  private subscriptions = new Subscription();

  readonly weekdays = [
    { label: 'Monday', value: 'monday' },
    { label: 'Tuesday', value: 'tuesday' },
    { label: 'Wednesday', value: 'wednesday' },
    { label: 'Thursday', value: 'thursday' },
    { label: 'Friday', value: 'friday' },
    { label: 'Saturday', value: 'saturday' },
    { label: 'Sunday', value: 'sunday' }
  ];

  readonly monthDays = Array.from(
    { length: 31 },
    (_, index) => index + 1
  );

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private payoutSettingService: PayoutSettingService,
    private loader: NgxUiLoaderService,
    private toastr: ToastrService
  ) {
    this.payoutForm = this.fb.group({
      account_holder_name: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(150)
        ]
      ],
      payout_account_type: ['bank', Validators.required],
      bank_account_number: [''],
      bank_ifsc: [''],
      upi_vpa: [''],
      payout_mode: ['NEFT', Validators.required],
      frequency: ['weekly', Validators.required],
      mode: ['manual', Validators.required],
      payout_day: ['monday'],
      min_payout_threshold: [
        0,
        [Validators.required, Validators.min(0)]
      ],
      auto_payout_enabled: [false],
      notes: ['', Validators.maxLength(1000)]
    });

    this.updateAccountValidators();
  }

  ngOnInit(): void {
    this.subscriptions.add(
      this.payoutForm.get('payout_account_type')!.valueChanges.subscribe(() => {
        this.updateAccountValidators();
      })
    );

    this.subscriptions.add(
      this.payoutForm.get('frequency')!.valueChanges.subscribe((frequency) => {
        this.updatePayoutDay(frequency);
      })
    );

    this.subscriptions.add(
      this.payoutForm.get('mode')!.valueChanges.subscribe((mode) => {
        if (mode === 'manual') {
          this.payoutForm.patchValue(
            { auto_payout_enabled: false },
            { emitEvent: false }
          );
        }
      })
    );

    this.loadPayoutSetting();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get f() {
    return this.payoutForm.controls;
  }

  get isBankAccount(): boolean {
    return this.payoutForm.get('payout_account_type')?.value === 'bank';
  }

  get isWeekly(): boolean {
    return this.payoutForm.get('frequency')?.value === 'weekly';
  }

  get isMonthly(): boolean {
    return this.payoutForm.get('frequency')?.value === 'monthly';
  }

  get isDaily(): boolean {
    return this.payoutForm.get('frequency')?.value === 'daily';
  }

  get maskedAccountNumber(): string {
    return this.existingAccountNumber || 'Saved account number';
  }

  get registrationComplete(): boolean {
    return this.razorpayRegistered;
  }

  private updateAccountValidators(): void {
    const accountNumber = this.payoutForm.get('bank_account_number');
    const ifsc = this.payoutForm.get('bank_ifsc');
    const upi = this.payoutForm.get('upi_vpa');

    if (this.isBankAccount) {
      // A new account requires the account number.
      // Existing accounts may retain their saved number if this field is blank.
      if (this.isEditMode) {
        accountNumber?.setValidators([
          Validators.pattern(/^[0-9]{6,30}$/)
        ]);
      } else {
        accountNumber?.setValidators([
          Validators.required,
          Validators.pattern(/^[0-9]{6,30}$/)
        ]);
      }

      ifsc?.setValidators([
        Validators.required,
        Validators.pattern(/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/)
      ]);

      upi?.clearValidators();
    } else {
      accountNumber?.clearValidators();
      ifsc?.clearValidators();

      upi?.setValidators([
        Validators.required,
        Validators.pattern(/^[\w.-]{2,256}@[A-Za-z0-9.-]{2,64}$/)
      ]);
    }

    accountNumber?.updateValueAndValidity({ emitEvent: false });
    ifsc?.updateValueAndValidity({ emitEvent: false });
    upi?.updateValueAndValidity({ emitEvent: false });
  }

  private updatePayoutDay(frequency: string): void {
    const day = this.payoutForm.get('payout_day');

    if (frequency === 'daily') {
      day?.setValue('', { emitEvent: false });
    } else if (frequency === 'weekly') {
      const current = String(day?.value || '').toLowerCase();

      if (!this.weekdays.some((item) => item.value === current)) {
        day?.setValue('monday', { emitEvent: false });
      }
    } else if (frequency === 'monthly') {
      const current = Number(day?.value);

      if (!current || current < 1 || current > 31) {
        day?.setValue('1', { emitEvent: false });
      } else {
        day?.setValue(String(current), { emitEvent: false });
      }
    }
  }

  loadPayoutSetting(): void {
    this.isLoading = true;
    this.loader.start();

    this.payoutSettingService.getPayoutSetting().subscribe({
      next: (response: any) => {
        this.isLoading = false;
        this.loader.stop();

        if (!response?.success || !response?.data) {
          this.isEditMode = false;
          this.settingId = null;
          this.existingAccountNumber = '';
          this.updateAccountValidators();
          return;
        }

        const data = response.data;

        this.isEditMode = true;
        this.settingId = Number(data.id);

        this.razorpayRegistered = Boolean(
          data.razorpay_contact_id &&
          data.razorpay_fund_account_id
        );

        const hasUpi = Boolean(data.upi_vpa);
        const hasBank = Boolean(data.bank_ifsc || data.bank_account_number);

        this.existingAccountNumber = data.bank_account_number || '';

        this.payoutForm.patchValue({
          account_holder_name: data.account_holder_name || '',
          payout_account_type: hasUpi && !hasBank ? 'upi' : 'bank',
          // Do not prefill a complete bank account number into the form.
          bank_account_number: '',
          bank_ifsc: data.bank_ifsc || '',
          upi_vpa: data.upi_vpa || '',
          payout_mode: data.payout_mode || (hasUpi ? 'UPI' : 'NEFT'),
          frequency: data.frequency || 'weekly',
          mode: data.mode || 'manual',
          payout_day: data.payout_day || 'monday',
          min_payout_threshold: Number(data.min_payout_threshold || 0),
          auto_payout_enabled: Boolean(data.auto_payout_enabled),
          notes: data.notes || ''
        });

        this.updateAccountValidators();
      },
      error: (error: any) => {
        this.isLoading = false;
        this.loader.stop();

        if (error?.status === 404) {
          this.isEditMode = false;
          this.settingId = null;
          this.updateAccountValidators();
          return;
        }

        this.toastr.error(
          error?.error?.message || 'Failed to load payout settings.',
          'Error'
        );
      }
    });
  }

  onAccountTypeChange(): void {
    if (!this.isBankAccount) {
      this.payoutForm.patchValue({
        payout_mode: 'UPI'
      });
    } else if (this.payoutForm.get('payout_mode')?.value === 'UPI') {
      this.payoutForm.patchValue({
        payout_mode: 'NEFT'
      });
    }

    this.updateAccountValidators();
  }

  savePayoutSetting(): void {
    if (this.isSaving) {
      return;
    }

    this.updateAccountValidators();

    if (this.payoutForm.invalid) {
      this.payoutForm.markAllAsTouched();
      this.toastr.error('Please complete all required fields correctly.');
      return;
    }

    const value = this.payoutForm.getRawValue();
    const accountNumber = String(value.bank_account_number || '').trim();

    const payload: any = {
      account_holder_name: String(value.account_holder_name).trim(),
      bank_ifsc: this.isBankAccount
        ? String(value.bank_ifsc || '').trim().toUpperCase()
        : null,
      upi_vpa: this.isBankAccount
        ? null
        : String(value.upi_vpa || '').trim(),
      payout_mode: this.isBankAccount ? value.payout_mode : 'UPI',
      frequency: value.frequency,
      mode: value.mode,
      payout_day: value.frequency === 'daily' ? null : String(value.payout_day),
      min_payout_threshold: Number(value.min_payout_threshold),
      auto_payout_enabled:
        value.mode === 'automatic' && Boolean(value.auto_payout_enabled),
      notes: String(value.notes || '').trim() || null
    };

    if (this.isBankAccount && accountNumber) {
      payload.bank_account_number = accountNumber;
    } else if (this.isBankAccount && !this.isEditMode) {
      this.toastr.error('Bank account number is required.');
      return;
    }

    if (this.isEditMode && this.settingId) {
      payload.id = this.settingId;
    }

    this.isSaving = true;
    this.loader.start();

    const request = this.isEditMode
      ? this.payoutSettingService.updatePayoutSetting(payload)
      : this.payoutSettingService.createPayoutSetting(payload);

    request.subscribe({
      next: (response: any) => {
        this.isSaving = false;
        this.loader.stop();

        if (!response?.success) {
          this.toastr.error(
            response?.message || 'Unable to save payout settings.',
            'Error'
          );
          return;
        }

        if (response?.data?.id) {
          this.settingId = Number(response.data.id);
        }

        this.toastr.success(
          response?.message ||
            (this.isEditMode
              ? 'Payout settings updated successfully.'
              : 'Payout settings created successfully.'),
          'Success'
        );

        this.loadPayoutSetting();
      },
      error: (error: any) => {
        this.isSaving = false;
        this.loader.stop();

        this.toastr.error(
          error?.error?.message ||
            error?.error?.error ||
            'Failed to save payout settings.',
          'Error'
        );
      }
    });
  }

  registerWithRazorpayX(): void {
    if (!this.isEditMode || !this.settingId) {
      this.toastr.warning('Save your payout settings before registering.');
      return;
    }

    if (this.isRegistering) {
      return;
    }

    this.isRegistering = true;
    this.loader.start();

    this.payoutSettingService
      .registerPayoutSetting(this.settingId)
      .subscribe({
        next: (response: any) => {
          this.isRegistering = false;
          this.loader.stop();

          if (!response?.success) {
            this.toastr.error(
              response?.message || 'RazorpayX registration failed.',
              'Error'
            );
            return;
          }

          this.razorpayRegistered = true;

          this.toastr.success(
            response?.message || 'Beneficiary registered successfully.',
            'Success'
          );

          this.loadPayoutSetting();
        },
        error: (error: any) => {
          this.isRegistering = false;
          this.loader.stop();

          this.toastr.error(
            error?.error?.message ||
              error?.error?.error ||
              'Failed to register beneficiary with RazorpayX.',
            'Error'
          );
        }
      });
  }

  cancel(): void {
    this.router.navigate(['/dashboard']);
  }
}
