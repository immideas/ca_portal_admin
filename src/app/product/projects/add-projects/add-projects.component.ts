import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ProjectService } from '../../../services/project.service';
import { UploadService } from '../../../services/upload.service';
import { UploadType } from '../../../shared/enums/uploadTypeEnums';
import { ImageUploaderLibComponent } from '@swiftlyme/image-uploader';

@Component({
  selector: 'app-add-projects',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ImageUploaderLibComponent],
  templateUrl: './add-projects.component.html',
  styleUrls: ['./add-projects.component.css']
})
export class AddProjectsComponent implements OnInit, OnDestroy {

  projectForm!: FormGroup;
  projectId: string | null = null;
  isEditMode = false;
  isViewMode = false;
  canEdit = false;
  errorMessage = '';

  // ── Real-time tracking arrays (Index-Aligned) ──
  imageUrls: string[] = [];
  imageS3Keys: string[] = [];
private newlyUploadedKeys: Set<string> = new Set<string>();
private pendingDeleteKeys: string[] = [];

  // ── Upload State (PER-SLOT — har image ka apna independent progress) ──
  maxImages = 1;

  // 👇 uploader wrapper ka reference, isi ke andar library apne slots render karti hai
  @ViewChild('uploaderHost') uploaderHost?: ElementRef<HTMLElement>;

  // slotIndex -> { progress, top, left, width, height }
  uploadingSlots = new Map<number, { progress: number; top: number; left: number; width: number; height: number }>();
  private slotTimers = new Map<number, ReturnType<typeof setInterval>>();

  get isUploading(): boolean {
    return this.uploadingSlots.size > 0;
  }

  // ── Image Preview Modal (complaint-type ke reference se) ──
  showImageModal = false;
  modalImageUrl: string | null = null;

  get uploadingSlotLabel(): string {
    const count = this.uploadingSlots.size;
    return count > 1 ? `Uploading ${count} images...` : 'Uploading image...';
  }
  get showCustomerCard(): boolean {
    return this.isViewMode && this.projectForm.get('accessType')?.value === 'closed';
  }

  constructor(
    private fb: FormBuilder,
    private service: ProjectService,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
    private uploadService: UploadService
  ) {
    const perms = (localStorage.getItem('permissions') || '').split(',');
    this.canEdit = perms.includes('edit_project');
  }

  ngOnInit(): void {
    this.createForm();
    this.projectId = this.route.snapshot.paramMap.get('id');

    this.route.queryParams.subscribe(params => {
      this.isViewMode = params['viewMode'] === 'true';

      if (this.projectId) {
        this.isEditMode = !this.isViewMode;
        this.fetchDetails();
      }

      if (this.isViewMode) {
        this.projectForm.disable();
      } else if (this.isEditMode && !this.canEdit) {
        this.projectForm.disable();
        this.isViewMode = true;
        this.toastr.error('You do not have permission to edit.');
      }
    });
  }

  ngOnDestroy(): void {
    this.slotTimers.forEach(timer => clearInterval(timer));
    this.slotTimers.clear();
  }

  createForm(): void {
    this.projectForm = this.fb.group({
      name:          ['', Validators.required],
      initials:      ['', Validators.required],
      accessType:    ['', Validators.required],
      locationParam: [''],
      status:        [1],
      host:          ['', Validators.required],
      port:          ['', Validators.required],
      secure:        ['', Validators.required],
      authUser:      ['', Validators.required],
      authPass:      ['', Validators.required],
      image:         [null],
      openTicketUrl: ['']
    });

    this.projectForm.get('accessType')?.valueChanges.subscribe(val => {
      const lp = this.projectForm.get('locationParam');
      if (val === 'open_location') {
        lp?.setValidators([Validators.required]);
      } else {
        lp?.clearValidators();
        lp?.setValue('');
      }
      lp?.updateValueAndValidity();
    });
  }

 fetchDetails(): void {
  if (!this.projectId) return;

  this.service.getById(this.projectId).subscribe({
    next: (res: any) => {
      if (res.success) {
        const project = res.data;
        const smtp = project.smtpEmail || {};

        this.projectForm.patchValue({
          name: project.name,
          initials: project.initials,
          accessType: project.accessType,
          locationParam: project.locationParam || '',
          status: project.status !== undefined ? String(project.status) : '1',
          host: smtp.host,
          port: smtp.port,
          secure: String(smtp.secure),
          authUser: smtp.authUser,
          authPass: smtp.authPass,
          openTicketUrl: project.openTicketUrl || '',
          image: project.image || null
        });

        // ✅ Existing images load
        if (Array.isArray(project.imageUrls) && project.imageUrls.length > 0) {
          this.imageUrls = project.imageUrls.map((d: any) => d.url);
          this.imageS3Keys = project.imageUrls.map((d: any) => d.key);
        } else if (project.image) {
          this.imageUrls = [project.image];
          this.imageS3Keys = [project.image];
        }
      }
    },
    error: () => this.toastr.error('Failed to load project details')
  });
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
    if (
      incomingKeys.includes(k) ||
      incomingKeys.includes(this.imageUrls[idx])
    ) {
      keepIndices.push(idx);
    }
  });

  // Safety: agar filter se sab kuch hi hat jata hai jabki incoming me items the,
  // to bhi state ko cautious rakho.
  if (keepIndices.length === 0 && this.imageS3Keys.length > 0 && images.length > 0) {
    return;
  }

  this.imageS3Keys = keepIndices.map(i => this.imageS3Keys[i]);
  this.imageUrls = keepIndices.map(i => this.imageUrls[i]);

  this.projectForm
    .get('image')
    ?.setValue(this.imageS3Keys.length > 0 ? this.imageS3Keys[0] : null);
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

  // naya upload hamesha next empty slot mein jaata hai
  const slotIndex = this.imageUrls.length;
  this.startSlotUpload(slotIndex);

  try {
    const result = await this.uploadService.upload(
      image.file,
      UploadType.PROJECT_IMAGE || 'project'
    );

    image.key = result.key;

    // ✅ Add new image
    this.imageS3Keys.push(result.key);
    this.newlyUploadedKeys.add(result.key);

    this.imageUrls = [
      ...this.imageUrls,
      result.previewUrl || result.key
    ];

    this.projectForm.get('image')?.setValue(result.key);
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
    const result = await this.uploadService.upload(
      event.new.file,
      UploadType.PROJECT_IMAGE || 'project'
    );

    event.new.key = result.key;

    const oldKey = this.imageS3Keys[event.index];

    // ✅ Safe delete logic
    if (
      oldKey &&
      typeof oldKey === 'string' &&
      !oldKey.startsWith('http://') &&
      !oldKey.startsWith('https://')
    ) {

      if (this.newlyUploadedKeys.has(oldKey)) {

        // New image → delete immediately
        this.uploadService.delete(oldKey).catch(err =>
          console.error('Failed to delete old image from S3', err)
        );

        this.newlyUploadedKeys.delete(oldKey);

      } else {

        // Existing image → delete after save
        this.pendingDeleteKeys.push(oldKey);

      }
    }

    // ✅ Replace arrays
    this.imageS3Keys[event.index] = result.key;
    this.newlyUploadedKeys.add(result.key);

    this.imageUrls[event.index] =
      result.previewUrl || result.key;

    this.imageUrls = [...this.imageUrls];

    this.projectForm.get('image')?.setValue(result.key);
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
    k => k === incomingKey || incomingKey.endsWith(k) || k.endsWith(incomingKey)
  );

  const key =
    idx >= 0 && idx < this.imageS3Keys.length
      ? this.imageS3Keys[idx]
      : (image?.key || '');

  // ✅ Safe delete logic
  if (
    key &&
    typeof key === 'string' &&
    !key.startsWith('http://') &&
    !key.startsWith('https://')
  ) {

    if (this.newlyUploadedKeys.has(key)) {

      // New image → delete immediately
      this.uploadService.delete(key).catch(err =>
        console.error('Failed to delete image from S3', err)
      );

      this.newlyUploadedKeys.delete(key);

    } else {

      // Existing image → delete after save
      this.pendingDeleteKeys.push(key);

    }
  }

  // Remove from arrays
  if (idx >= 0) {
    this.imageUrls = this.imageUrls.filter((_, i) => i !== idx);
    this.imageS3Keys = this.imageS3Keys.filter((_, i) => i !== idx);
  }

  this.projectForm
    .get('image')
    ?.setValue(this.imageS3Keys.length > 0 ? this.imageS3Keys[0] : null);
}

  onImageEdit(image: any): void {
    if (this.isViewMode) return;
    console.log('Image edited:', image);
  }

  // ================= IMAGE PREVIEW & ACTIONS =================

  openImagePreview(url: string): void {
    this.modalImageUrl = url;
    this.showImageModal = true;
  }

  closeImagePreview(): void {
    this.showImageModal = false;
    this.modalImageUrl = null;
  }

  // ================= PER-SLOT PROGRESS HELPERS =================

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
      height: elRect.height
    };
  }

  async save(): Promise<void> {
    if (this.isUploading) {
      this.toastr.error('Please wait until the image upload is complete.');
      return;
    }

    if (this.projectForm.invalid) {
      this.projectForm.markAllAsTouched();
      this.toastr.error('Please fill required fields');
      return;
    }

    const formData = this.projectForm.getRawValue();

    const payload: any = {
      name:          formData.name,
      initials:      formData.initials,
      accessType:    formData.accessType,
      locationParam: formData.locationParam || null,
      status:        formData.status !== undefined ? Number(formData.status) : 1,
      host:          formData.host,
      port:          formData.port,
      secure:        formData.secure === 'true',
      authUser:      formData.authUser,
      authPass:      formData.authPass,
      image:         this.imageS3Keys.length > 0 ? this.imageS3Keys[0] : null
    };

    if (formData.openTicketUrl) {
      payload.openTicketUrl = formData.openTicketUrl;
    }

    if (this.isEditMode && this.projectId) {
      payload.id = this.projectId;
    }

    const request = this.isEditMode
      ? this.service.update(payload)
      : this.service.create(payload);

    request.subscribe({
     next: async (res: any) => {

  // ✅ Delete deferred images only after successful save
  for (const key of this.pendingDeleteKeys) {
    try {
      await this.uploadService.delete(key);
    } catch (err) {
      console.error('Failed to delete image from S3:', key, err);
    }
  }

  this.pendingDeleteKeys = [];

  this.toastr.success(
    res.message ||
    `Project ${this.isEditMode ? 'updated' : 'created'} successfully`
  );

  const savedId = res.data?.id || res.data?._id || this.projectId;

  if (this.isEditMode) {
    this.router.navigate(['/manage-projects']);

  } else if (savedId) {

    this.router.navigate(['/add-projects', savedId], {
      queryParams: { viewMode: true }
    });

  } else {

    this.router.navigate(['/manage-projects']);

  }
},
      error: (err: any) => {
        this.errorMessage = err.error?.message || `${this.isEditMode ? 'Update' : 'Create'} failed`;
        this.toastr.error(this.errorMessage);
      }
    });
  }

  enableEditMode(): void {
    if (this.canEdit) {
      this.isViewMode = false;
      this.isEditMode = true;
      this.projectForm.enable();
    } else {
      this.toastr.error('Access Denied: You cannot edit projects.');
    }
  }

  cancel(): void {
    this.router.navigate(['/manage-projects']);
  }

  goToCustomerList(): void {
    this.router.navigate(['/manage-customer'], { queryParams: { projectId: this.projectId } });
  }

  goToAddCustomer(): void {
    this.router.navigate(['/add-customer'], { queryParams: { projectId: this.projectId } });
  }
}