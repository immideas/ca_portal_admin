import { Component, OnDestroy, ElementRef, ViewChild, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RoleService } from '../../services/role.service';
import { UploadService } from '../../services/upload.service';
import { UploadType } from '../../shared/enums/uploadTypeEnums';
import { NgxUiLoaderModule, NgxUiLoaderService } from 'ngx-ui-loader';
import { ToastrService, ToastrModule } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { ImageUploaderLibComponent } from '@swiftlyme/image-uploader';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-add-roles',
  templateUrl: './add-roles.component.html',
  styleUrls: ['./add-roles.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgxUiLoaderModule,
    ToastrModule,
    NgSelectModule,
    ImageUploaderLibComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AddRolesComponent implements OnInit, OnDestroy {
  roleForm: FormGroup;
  errorMessage: string | null = null;
  submitted = false;
  isEditMode = false;
  isViewMode = false;
  roleId: string | null = null;
  roleImages: string[] = [];
  originalShortCode = '';
  canEdit = false;

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
    private roleService: RoleService,
    private uploadService: UploadService,
    private router: Router,
    private ngxLoader: NgxUiLoaderService,
    private toastr: ToastrService,
    private route: ActivatedRoute,
  ) {
    this.roleForm = this.fb.group({
      role_name: ['', [Validators.required, Validators.minLength(3), Validators.pattern('^[a-zA-Z ]+$')]],
      short_code: ['', [Validators.required, Validators.minLength(2), Validators.pattern('^[a-zA-Z_]+$')]],
      roleimage: [''],
      roleDescription: [''],
    });

    this.roleForm.get('role_name')?.valueChanges.subscribe((value: string) => {
      if (!this.isEditMode) {
        const generated = value
          ? value
              .trim()
              .toLowerCase()
              .replace(/[^a-zA-Z\s]/g, '')
              .replace(/\s+/g, '_')
          : '';
        this.roleForm.get('short_code')?.setValue(generated, { emitEvent: false });
      }
    });

    const perms = (localStorage.getItem('permissions') || '').split(',');
    this.canEdit = perms.includes('edit_role');
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.roleId = params.get('id');
      if (this.roleId) {
        this.isEditMode = true;
        this.loadRoleData(this.roleId);
      }
    });

    this.route.queryParamMap.subscribe((queryParams) => {
      this.isViewMode = queryParams.get('viewMode') === 'true';
      if (this.isViewMode) {
        this.roleForm.disable();
      } else {
        this.roleForm.enable();
        if (this.isEditMode) {
          this.roleForm.get('short_code')?.disable();
        }
      }
    });

    this.roleService.listRoleImages().subscribe({
      next: (res: any) => {
        this.roleImages = Array.isArray(res) ? res : res && Array.isArray(res.images) ? res.images : [];
      },
      error: () => {
        this.roleImages = [];
      },
    });
  }

  ngOnDestroy(): void {
    this.slotTimers.forEach((timer) => clearInterval(timer));
    this.slotTimers.clear();
  }

  private loadRoleData(id: string): void {
    this.ngxLoader.start();
    this.roleService.listRoleById(id).subscribe(
      (response) => {
        if (response) {
          this.originalShortCode = response.shortCode;
          this.roleForm.patchValue({
            role_name: response.roleName,
            short_code: response.shortCode,
            roleimage: response.roleimage || '',
            roleDescription: response.roleDescription || '',
          });
          this.roleForm.get('short_code')?.disable();
          void this.loadExistingImages(response.roleimage || '');
        } else {
          console.error('Unexpected response format:', response);
          this.toastr.error('Failed to load role data.');
        }
        this.ngxLoader.stop();
      },
      (error) => {
        console.error('Error loading role:', error);
        this.toastr.error('Failed to load role data.');
        this.ngxLoader.stop();
      },
    );
  }

  private async loadExistingImages(imageValue: string): Promise<void> {
    const imageList = imageValue ? imageValue.split(',').filter(Boolean) : [];

    this.imageS3Keys = imageList;
    this.imageUrls = [];

    for (const item of imageList) {
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

  async saveRole(): Promise<void> {
    this.submitted = true;

    if (this.isUploading) {
      this.toastr.error('Please wait until the image upload is complete.');
      return;
    }

    if (this.roleForm.invalid) {
      this.errorMessage = 'Please fill out all required fields.';
      this.toastr.error(this.errorMessage);
      return;
    }

    this.ngxLoader.start();
    const roleData = {
      roleName: this.roleForm.value.role_name,
      shortCode: this.isEditMode ? this.originalShortCode : this.roleForm.value.short_code,
      roleimage: this.imageS3Keys.length > 0 ? this.imageS3Keys.join(',') : null,
      roleDescription: this.roleForm.value.roleDescription || '',
    };

    const saveObservable = this.isEditMode
      ? this.roleService.updateRole({ id: this.roleId, ...roleData })
      : this.roleService.createRole(roleData);

    try {
      const response = await firstValueFrom(saveObservable);
      await this.flushPendingDeletes();

      this.ngxLoader.stop();
      const successMessage = this.isEditMode ? 'Role updated successfully' : 'Role added successfully';
      this.toastr.success(successMessage);

      if (this.isEditMode && response && response.role) {
        this.roleForm.patchValue({
          roleimage: response.role.roleimage || '',
          roleDescription: response.role.roleDescription || '',
        });
      }

      this.router.navigate(['/manage-roles']);
    } catch (error: any) {
      console.error('Error saving role:', error);
      this.errorMessage = error?.error?.message || 'Failed to save role';
      this.toastr.error(this.errorMessage ?? 'An unknown error occurred.');
      this.ngxLoader.stop();
    }
  }

  cancel(): void {
    this.router.navigate(['/manage-roles']);
  }

  enableEditMode(): void {
    this.isViewMode = false;
    this.roleForm.enable();
    this.roleForm.get('short_code')?.disable();
    this.roleForm.get('roleimage')?.enable();
    this.roleForm.get('roleDescription')?.enable();
  }

  selectImage(imageUrl: string): void {
    this.roleForm.patchValue({ roleimage: imageUrl });
  }

  clearSelection(): void {
    this.roleForm.patchValue({ roleimage: '' });
  }

  handleImagesChange(images: any[]): void {
    if (this.isViewMode) return;

    const incomingKeys = images
      .map((img: any) => img.key || this.extractS3KeyFromUrl(img.url || img.originalUrl || ''))
      .filter(Boolean);

    // Library kabhi-kabhi stale/empty imagesChange event bhejti hai.
    // Real deletion onImageDelete() handle karta hai, isliye yahan
    // aisे unreliable events ko ignore karo taaki state accidentally wipe na ho.
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
    this.roleForm.get('roleimage')?.setValue(this.imageS3Keys.length > 0 ? this.imageS3Keys.join(',') : null);
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
      const result = await this.uploadService.upload(image.file, UploadType.ROLE_IMAGE);
      image.key = result.key;

      this.imageS3Keys.push(result.key);
      this.newlyUploadedKeys.add(result.key);
      this.imageUrls = [...this.imageUrls, result.previewUrl || result.key];
      this.roleForm.get('roleimage')?.setValue(this.imageS3Keys.join(','));
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
      const result = await this.uploadService.upload(event.new.file, UploadType.ROLE_IMAGE);
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
      this.roleForm.get('roleimage')?.setValue(this.imageS3Keys.join(','));
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

    this.roleForm.get('roleimage')?.setValue(this.imageS3Keys.length > 0 ? this.imageS3Keys.join(',') : null);
  }

  onImageEdit(image: any): void {
    if (this.isViewMode) return;
    console.log('Image edited:', image);
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