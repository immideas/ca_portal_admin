import { Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { RoleService } from '../../services/role.service';
import { NgxUiLoaderModule, NgxUiLoaderService } from 'ngx-ui-loader';
import { ToastrService, ToastrModule } from 'ngx-toastr';
import { HttpClient, HttpHeaders, HttpClientModule } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ImageUploaderLibComponent } from '@swiftlyme/image-uploader';
import { PlansService } from '../../services/plans.service';
import { ThemeConfigurationService } from '../../services/theme-configuration.service';
import { UploadService } from '../../services/upload.service';
import { UploadType } from '../../shared/enums/uploadTypeEnums';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-add-admin',
  templateUrl: './add-admin.component.html',
  styleUrls: ['./add-admin.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    NgxUiLoaderModule,
    ToastrModule,
    HttpClientModule,
    ImageUploaderLibComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AddAdminComponent implements OnInit, OnDestroy {
  adminForm: FormGroup;
  plans: any[] = [];
  plansList: any[] = [];
  selectedPlan: any = null;
  selectedPlanDetails: any = null;

  themesList: any[] = [];
  selectedTheme: any = null;

  submitted = false;
  isEditMode = false;
  isViewMode = false;
  adminId: string | null = null;
  token: string | null = localStorage.getItem('token');
  canEdit = true;
  errorMessage: string | null = null;
  trialLocked = false;
  trialLockedReason: string | null = null;

  imageUrls: string[] = [];
  imageS3Keys: string[] = [];
  private newlyUploadedKeys: Set<string> = new Set<string>();
  private pendingDeleteKeys: string[] = [];
  maxImages = 1;

  @ViewChild('uploaderHost') uploaderHost?: ElementRef<HTMLElement>;
  uploadingSlots = new Map<number, { progress: number; top: number; left: number; width: number; height: number }>();
  private slotTimers = new Map<number, ReturnType<typeof setInterval>>();

  showImageModal = false;
  modalImageUrl: string | null = null;

  get isUploading(): boolean {
    return this.uploadingSlots.size > 0;
  }

  get uploadingSlotLabel(): string {
    const count = this.uploadingSlots.size;
    return count > 1 ? `Uploading ${count} images...` : 'Uploading image...';
  }

  constructor(
    private fb: FormBuilder,
    private adminService: AdminService,
    private plansService: PlansService,
    private router: Router,
    private ngxLoader: NgxUiLoaderService,
    private toastr: ToastrService,
    private route: ActivatedRoute,
    private http: HttpClient,
    private roleService: RoleService,
    private uploadService: UploadService,
    private themeConfigurationService: ThemeConfigurationService,
  ) {
    this.adminForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.pattern('^[a-zA-Z ]+$')]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
        firmName: [
    '',
    [
      Validators.maxLength(150),
    ],
  ],

  firmType: [
    '',
    [
      Validators.required,
    ],
  ],
      role: ['', Validators.required],
      // password: [''],
      plan: [null, Validators.required],
      allow_trial: [false],
      autopay: [false],
      profileimage: [''],
      theme_id: [null],
    });
  }

  ngOnInit(): void {
    this.fetchRoles();
    this.fetchPlans();
    this.fetchThemes();

    this.route.paramMap.subscribe((params) => {
      this.adminId = params.get('id');
      if (this.adminId) {
        this.isEditMode = true;
        this.loadAdminData(this.adminId);
      }
    });

    this.route.queryParamMap.subscribe((queryParams) => {
      this.isViewMode = queryParams.get('viewMode') === 'true';
      if (this.isViewMode) {
        this.adminForm.disable();
      } else {
        this.adminForm.get('role')?.disable();
      }
    });

    // this.adminForm.get('phone')?.valueChanges.subscribe((phoneValue: string) => {
    //   if (!this.isEditMode) {
    //     this.adminForm.get('password')?.setValue(phoneValue);
    //   }
    // });

    // Dropdown se theme id badalne par swatch preview (selectedTheme) bhi sync rakho.
    this.adminForm.get('theme_id')?.valueChanges.subscribe((themeId: any) => {
      this.selectedTheme = this.themesList.find((t: any) => t.id === themeId) || null;
    });
  }

  ngOnDestroy(): void {
    this.slotTimers.forEach((timer) => clearInterval(timer));
    this.slotTimers.clear();
  }

  private fetchRoles(): void {
    this.roleService.getRoleByShortCode('admin').subscribe({
      next: (response: any) => {
        const adminRole = response?.data;
        if (adminRole?.id) {
          this.plans = [adminRole];
          this.adminForm.get('role')?.setValue(adminRole.id);
        } else {
          this.toastr.error('Admin role not configured in system.');
        }
      },
      error: () => this.toastr.error('Failed to load admin role'),
    });
  }

  private fetchPlans(): void {
    this.plansService.list({ status: '1', page: 1, limit: 100 }).subscribe({
      next: (res: any) => {
        const all = res.data || [];
        this.plansList = all
          .filter((p: any) => !p.is_trial)
          .map((p: any) => this.normalizePlanFeatures(p));
      },
      error: () => this.toastr.error('Failed to load plans'),
    });
  }

  private fetchThemes(): void {
    this.themeConfigurationService.listAllThemes({ status: 1, page: 1, limit: 100,scope: 'global'  }).subscribe({
      next: (res: any) => {
        this.themesList = res?.data || [];

        // Agar edit mode nahi hai aur form me abhi tak koi theme selected nahi hai,
        // to default theme (ya list ka pehla active theme) select kar do.
        if (!this.isEditMode && !this.adminForm.get('theme_id')?.value && this.themesList.length > 0) {
          const defaultTheme = this.themesList.find((t: any) => t.id === 1) || this.themesList[0];
          this.selectTheme(defaultTheme);
        } else if (this.adminForm.get('theme_id')?.value) {
          this.selectedTheme = this.themesList.find((t: any) => t.id === this.adminForm.get('theme_id')?.value) || null;
        }
      },
      error: () => this.toastr.error('Failed to load themes'),
    });
  }

  selectTheme(theme: any): void {
    if (this.isViewMode) return;
    this.adminForm.get('theme_id')?.setValue(theme.id);
    this.selectedTheme = theme;
  }

  // 👇 NAYA — backend ab plan.PlanFeatures (dynamic Feature/PlanFeature rows) bhejta hai,
  // purane static columns (p.reports_analytics, p.no_of_users, ...) kabhi set nahi hote.
  // Isliye PlanFeatures array se ek flat `features` map bana rahe hain, jaisa authController.js
  // login response mein karta hai — taaki template `p.features.xxx` se seedha padh sake.
  private normalizePlanFeatures(plan: any): any {
    const featuresFlat: Record<string, any> = {};

    (plan.PlanFeatures || []).forEach((pf: any) => {
      const code = pf.feature?.feature_code;
      if (!code) return;

      if (pf.feature?.type === 'boolean') {
        featuresFlat[code] = pf.enabled === true || pf.value === '1' || pf.value === 1;
      } else if (pf.value_type === 'unlimited') {
        featuresFlat[code] = -1;
      } else {
        featuresFlat[code] = pf.value;
      }
    });

    return { ...plan, features: featuresFlat };
  }

  onTrialToggle(): void {
    if (this.isViewMode || this.trialLocked) return;
    const ctrl = this.adminForm.get('allow_trial');
    ctrl?.setValue(!ctrl.value);
  }

  private loadAdminData(id: string): void {
    this.ngxLoader.start();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.token}`);
    this.http.post<any>(`${environment.apiUrl}/users/getUserById`, { id }, { headers }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const admin = res.data;
          this.adminForm.patchValue({
            name: admin.name,
            email: admin.email,
            phone: admin.phone,
           firmName: admin.firmName || '',
           firmType: admin.firmType || '',
            role: admin.role || this.adminForm.get('role')?.value,
            plan: admin.assigned_plan_id,
            allow_trial: admin.allow_trial,
            autopay: admin.autopay,
            profileimage: admin.profileimage || '',
            theme_id: admin.theme_id || null,
          });
          this.selectedPlanDetails = this.plansList.find((x) => x.id == admin.assigned_plan_id);
          this.selectedTheme = this.themesList.find((x) => x.id == admin.theme_id) || null;
          void this.loadExistingImages(admin.profileimage || '');

          const trialAlreadyUsed = !!admin.trial_used;
          const paymentAlreadyMade = !!admin.payment_made;

          if (trialAlreadyUsed || paymentAlreadyMade) {
            this.trialLocked = true;
            this.trialLockedReason = paymentAlreadyMade
              ? 'This admin has already made a payment, so the trial can no longer be toggled.'
              : 'This admin has already used their trial period, so it cannot be re-enabled.';
            this.adminForm.get('allow_trial')?.disable();
          } else {
            this.trialLocked = false;
            this.trialLockedReason = null;
          }
        }
        this.ngxLoader.stop();
      },
      error: () => {
        this.ngxLoader.stop();
        this.toastr.error('Failed to load admin details');
      },
    });
  }

  private async loadExistingImages(imageValue: string): Promise<void> {
    const imageList = imageValue ? imageValue.split(',').filter(Boolean) : [];

    // 👇 FIX: legacy corrupted URL ko turant S3 key me convert karo,
    // taaki delete/save dono operations sahi key ke saath kaam karein.
    this.imageS3Keys = imageList.map((item) =>
      /^https?:\/\//i.test(item) ? this.extractS3KeyFromUrl(item) : item
    );
    this.imageUrls = [];

    for (const item of this.imageS3Keys) {
      if (/^https?:\/\//i.test(item)) {
        this.imageUrls.push(item);
      } else {
        try {
          const previewUrl = await this.uploadService.getPreviewUrl(item);
          this.imageUrls.push(previewUrl || item);
        } catch {
          this.imageUrls.push(item);
        }
      }
    }
  }

  async saveAdmin(): Promise<void> {
    this.submitted = true;

    if (this.isUploading) {
      this.toastr.error('Please wait until the image upload is complete.');
      return;
    }

    if (this.adminForm.valid) {
      this.ngxLoader.start();
      const formValue = this.adminForm.getRawValue();
      const headers = new HttpHeaders().set('Authorization', `Bearer ${this.token}`);

      const payload: any = {
        name: formValue.name,
        email: formValue.email,
        phone: formValue.phone,
          firmName: formValue.firmName?.trim() || null,
  firmType: formValue.firmType?.trim() || null,
        role: formValue.role,
        // backend stores the user's plan in `assigned_plan_id`.
        // Keep `plan` as well for backwards compatibility.
        plan: formValue.plan,
        assigned_plan_id: formValue.plan,
        allow_trial: formValue.allow_trial,
        autopay: formValue.autopay,
        profileimage: this.imageS3Keys.length > 0 ? this.imageS3Keys.join(',') : '',
        theme_id: formValue.theme_id || null,
      };

      try {
        if (this.isEditMode) {
          payload.id = this.adminId;
          if (formValue.password) 
            // payload.password = formValue.password;
          

          console.debug('saveAdmin payload (update):', payload);
          await firstValueFrom(this.http.post(`${environment.apiUrl}/users/updateUser`, payload, { headers }));
          await this.flushPendingDeletes();
          this.ngxLoader.stop();
          this.toastr.success('Admin updated successfully');
          this.router.navigate(['/manage-admins']);
        } else {
          // payload.password = formValue.password;
          console.debug('saveAdmin payload (create):', payload);
          await firstValueFrom(this.adminService.createAdmin(payload));
          await this.flushPendingDeletes();
          this.ngxLoader.stop();
          this.toastr.success('Admin added successfully');
          this.router.navigate(['/manage-admins']);
        }
      } catch (err: any) {
        this.ngxLoader.stop();
        this.toastr.error(err?.error?.message || 'Save failed');
      }
    } else {
      this.toastr.error('Please fill in all required fields correctly.');
      this.adminForm.markAllAsTouched();
    }
  }

  cancel(): void {
    this.router.navigate(['/manage-admins']);
  }

  enableEditMode(): void {
    this.isViewMode = false;
    this.adminForm.enable();
  }

  allowOnlyAlphabets(event: KeyboardEvent): void {
    const charCode = event.which || event.keyCode;
    const char = String.fromCharCode(charCode);

    if (!/^[a-zA-Z ]$/.test(char)) {
      event.preventDefault();
    }
  }

  allowOnlyNumbers(event: KeyboardEvent): void {
    const charCode = event.which || event.keyCode;
    const char = String.fromCharCode(charCode);

    if (!/[0-9]/.test(char)) {
      event.preventDefault();
    }
  }

  selectPlan(plan: any): void {
    if (this.isViewMode) return;
    this.adminForm.get('plan')?.setValue(plan.id);
    this.adminForm.get('plan')?.markAsTouched();
    this.selectedPlan = plan;
    this.selectedPlanDetails = plan;
  }

  handleImagesChange(images: any[]): void {
    if (this.isViewMode) return;

    const incomingKeys = images
      .map((img: any) => img.key || this.extractS3KeyFromUrl(img.url || img.originalUrl || ''))
      .filter(Boolean);

    // Library kabhi-kabhi stale/empty imagesChange event bhejti hai.
    // Real deletion onImageDelete() handle karta hai, isliye yahan
    // aise unreliable events ko ignore karo taaki state accidentally wipe na ho.
    if (this.imageS3Keys.length > 0 && incomingKeys.length === 0) {
      return;
    }

    const keepIndices: number[] = [];

    this.imageS3Keys.forEach((k, idx) => {
      if (incomingKeys.includes(k) || incomingKeys.includes(this.imageUrls[idx])) {
        keepIndices.push(idx);
      }
    });

    // Safety: agar filter se sab kuch hi hat jata hai jabki incoming me items the,
    // to bhi state ko cautious rakho.
    if (keepIndices.length === 0 && this.imageS3Keys.length > 0 && images.length > 0) {
      return;
    }

    this.imageS3Keys = keepIndices.map((i) => this.imageS3Keys[i]);
    this.imageUrls = keepIndices.map((i) => this.imageUrls[i]);
    this.adminForm.get('profileimage')?.setValue(this.imageS3Keys.length > 0 ? this.imageS3Keys.join(',') : '');
  }

  // 👇 Signed/plain URL se stable S3 key (path) nikaalta hai
  private extractS3KeyFromUrl(url: string): string {
    if (!url) return '';
    try {
      const parsed = new URL(url);
      return decodeURIComponent(parsed.pathname.replace(/^\//, ''));
    } catch {
      return url.split('?')[0];
    }
  }

  async onImageUpload(image: any): Promise<void> {
    if (this.isViewMode || !image?.file) return;

    const slotIndex = this.imageUrls.length;
    this.startSlotUpload(slotIndex);

    try {
      const result = await this.uploadService.upload(image.file, UploadType.ADMIN_IMAGE);
      image.key = result.key;

      this.imageS3Keys.push(result.key);
      this.newlyUploadedKeys.add(result.key);
      this.imageUrls = [...this.imageUrls, result.previewUrl || result.key];
      this.adminForm.get('profileimage')?.setValue(this.imageS3Keys.join(','));
      this.completeSlotUpload(slotIndex);
    } catch (err: any) {
      console.error('S3 upload failed', err);
      this.toastr.error(`Image upload failed: ${err?.message || err}`);
      this.endSlotUpload(slotIndex);
    } finally {
      setTimeout(() => this.endSlotUpload(slotIndex), 400);
    }
  }

  async onImageReplace(event: any): Promise<void> {
    if (this.isViewMode || !event?.new?.file) return;

    const slotIndex = event.index;
    this.startSlotUpload(slotIndex);

    try {
      const result = await this.uploadService.upload(event.new.file, UploadType.ADMIN_IMAGE);
      event.new.key = result.key;

      const oldKey = this.imageS3Keys[event.index];
      if (oldKey && typeof oldKey === 'string' && !oldKey.startsWith('http://') && !oldKey.startsWith('https://')) {
        if (this.newlyUploadedKeys.has(oldKey)) {
          this.uploadService.delete(oldKey).catch((err) => console.error('Failed to delete old image from S3', err));
          this.newlyUploadedKeys.delete(oldKey);
        } else {
          this.pendingDeleteKeys.push(oldKey);
        }
      }

      this.imageS3Keys[event.index] = result.key;
      this.newlyUploadedKeys.add(result.key);
      this.imageUrls[event.index] = result.previewUrl || result.key;
      this.imageUrls = [...this.imageUrls];
      this.adminForm.get('profileimage')?.setValue(this.imageS3Keys.join(','));
      this.completeSlotUpload(slotIndex);
    } catch (err: any) {
      console.error('S3 replace failed', err);
      this.toastr.error(`Image replacement failed: ${err?.message || err}`);
      this.endSlotUpload(slotIndex);
    } finally {
      setTimeout(() => this.endSlotUpload(slotIndex), 400);
    }
  }

  onImageDelete(image: any): void {
    if (this.isViewMode) return;

    const url = image?.url || image?.originalUrl || image?.croppedUrl || '';
    const incomingKey = this.extractS3KeyFromUrl(url);

    let idx = this.imageS3Keys.findIndex(
      (k) => k === incomingKey || incomingKey.endsWith(k) || k.endsWith(incomingKey),
    );

    const key = idx >= 0 && idx < this.imageS3Keys.length ? this.imageS3Keys[idx] : image?.key || '';

    if (key && typeof key === 'string' && !key.startsWith('http://') && !key.startsWith('https://')) {
      if (this.newlyUploadedKeys.has(key)) {
        this.uploadService.delete(key).catch((err) => console.error('Failed to delete image from S3', err));
        this.newlyUploadedKeys.delete(key);
      } else {
        this.pendingDeleteKeys.push(key);
      }
    }

    if (idx >= 0) {
      this.imageUrls = this.imageUrls.filter((_, i) => i !== idx);
      this.imageS3Keys = this.imageS3Keys.filter((_, i) => i !== idx);
    }

    this.adminForm.get('profileimage')?.setValue(this.imageS3Keys.length > 0 ? this.imageS3Keys.join(',') : '');
  }

  onImageEdit(image: any): void {
    if (this.isViewMode) return;
  }

  openImagePreview(url: string): void {
    this.modalImageUrl = url;
    this.showImageModal = true;
  }

  closeImagePreview(): void {
    this.showImageModal = false;
    this.modalImageUrl = null;
  }

  private startSlotUpload(index: number): void {
    this.uploadingSlots.set(index, { progress: 0, ...this.getSlotRect(index) });
    this.clearSlotTimer(index);

    const timer = setInterval(() => {
      const slot = this.uploadingSlots.get(index);
      if (!slot) return;

      let progress = slot.progress;
      if (progress < 90) {
        const step = progress < 60 ? Math.random() * 8 + 4 : Math.random() * 3 + 1;
        progress = Math.min(90, progress + step);
      }

      this.uploadingSlots.set(index, { progress, ...this.getSlotRect(index) });
    }, 200);

    this.slotTimers.set(index, timer);
  }

  private completeSlotUpload(index: number): void {
    this.clearSlotTimer(index);
    const slot = this.uploadingSlots.get(index);
    if (slot) this.uploadingSlots.set(index, { ...slot, progress: 100 });
  }

  private endSlotUpload(index: number): void {
    this.clearSlotTimer(index);
    this.uploadingSlots.delete(index);
  }

  private clearSlotTimer(index: number): void {
    const timer = this.slotTimers.get(index);
    if (timer) {
      clearInterval(timer);
      this.slotTimers.delete(index);
    }
  }

  private getSlotRect(index: number): { top: number; left: number; width: number; height: number } {
    const wrapper = this.uploaderHost?.nativeElement;
    if (!wrapper) return { top: 0, left: 0, width: 0, height: 0 };

    const slotEls = wrapper.querySelectorAll('.cdk-drag');
    const el = slotEls[index] as HTMLElement | undefined;
    if (!el) return { top: 0, left: 0, width: 0, height: 0 };

    const elRect = el.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();

    return {
      top: elRect.top - wrapperRect.top,
      left: elRect.left - wrapperRect.left,
      width: elRect.width,
      height: elRect.height,
    };
  }

  private async flushPendingDeletes(): Promise<void> {
    if (!this.pendingDeleteKeys.length) return;

    const uniqueKeys = [...new Set(this.pendingDeleteKeys)];
    this.pendingDeleteKeys = [];

    await Promise.allSettled(uniqueKeys.map((key) => this.uploadService.delete(key)));
  }
}