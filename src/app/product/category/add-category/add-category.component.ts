import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { NgSelectModule } from '@ng-select/ng-select';
import { CategoryService } from '../../../services/category.service';
import { ProjectService } from '../../../services/project.service';
import { UploadService } from '../../../services/upload.service';
import { UploadType } from '../../../shared/enums/uploadTypeEnums';
import { ImageUploaderLibComponent } from '@swiftlyme/image-uploader';

@Component({
  selector: 'app-add-category',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, NgSelectModule, ImageUploaderLibComponent],
  templateUrl: './add-category.component.html',
  styleUrls: ['./add-category.component.css'],
})
export class AddCategoryComponent implements OnInit, OnDestroy {
  categoryForm!: FormGroup;
  categoryId: string | null = null;
  isEditMode = false;
  isViewMode = false;
  errorMessage = '';
  projects: any[] = [];
  canEdit = false;

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

  get uploadingSlotLabel(): string {
    const count = this.uploadingSlots.size;
    return count > 1 ? `Uploading ${count} images...` : 'Uploading image...';
  }

  // ── Image Preview Modal (complaint-type ke reference se) ──
  showImageModal = false;
  modalImageUrl: string | null = null;

  constructor(
    private fb: FormBuilder,
    private service: CategoryService,
    private projectService: ProjectService,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
    private uploadService: UploadService,
  ) {
    const perms = (localStorage.getItem('permissions') || '').split(',');
    this.canEdit = perms.includes('edit_category');
  }

  ngOnInit(): void {
    this.categoryForm = this.fb.group({
      projectId:     [null, Validators.required],
      category_name: ['',   Validators.required],
    });

    this.loadProjects();

    this.route.paramMap.subscribe((params) => {
      this.categoryId = params.get('id');
      if (this.categoryId) {
        this.isEditMode = true;
        setTimeout(() => this.loadCategory(), 300);
      }
    });

    this.route.queryParamMap.subscribe((q) => {
      this.isViewMode = q.get('viewMode') === 'true';
      if (this.isViewMode) this.categoryForm.disable();
    });
  }

  ngOnDestroy(): void {
    this.slotTimers.forEach(timer => clearInterval(timer));
    this.slotTimers.clear();
  }

  loadProjects(): void {
    this.projectService.list({ status: 1 }).subscribe({
      next: (res: any) => {
        this.projects = (res.data || []).filter((p: any) => p.status === 1);

        if (this.isEditMode) {
          const selectedId = this.categoryForm.get('projectId')?.value;
          const isActive = this.projects.find(p => p.id == selectedId);
          if (selectedId && !isActive) {
            this.toastr.warning(
              "This category's project is currently inactive. Please select an active project.",
              'Project Inactive',
              { timeOut: 5000 }
            );
            this.categoryForm.get('projectId')?.setValue(null);
          }
        }
      },
      error: () => this.toastr.error('Failed to load projects')
    });
  }

  loadCategory(): void {
    if (!this.categoryId) return;
    this.service.getCategoryById(this.categoryId).subscribe((res: any) => {
      const data = res?.data;
      if (data) {
        this.categoryForm.patchValue({
          category_name: data.name,
          projectId:     data.projectId || data.project?.id,
        });

        // 👇 backend se aaya imageUrls (array of {key,url}) directly use karo
        if (Array.isArray(data.imageUrls) && data.imageUrls.length > 0) {
          this.imageUrls = data.imageUrls.map((d: any) => d.url);
          this.imageS3Keys = data.imageUrls.map((d: any) => d.key);
        }
      }
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
      if (incomingKeys.includes(k) || incomingKeys.includes(this.imageUrls[idx])) {
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
  }

  async onImageUpload(image: any): Promise<void> {
    if (this.isViewMode || !image?.file) return;

    const slotIndex = this.imageUrls.length;
    this.startSlotUpload(slotIndex);

    try {
      const result = await this.uploadService.upload(image.file, UploadType.CATEGORY_IMAGE || 'category');
      image.key = result.key;
      this.imageS3Keys.push(result.key);
      this.newlyUploadedKeys.add(result.key);

      this.imageUrls = [...this.imageUrls, result.previewUrl || result.key];
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
      const result = await this.uploadService.upload(event.new.file, UploadType.CATEGORY_IMAGE || 'category');
      event.new.key = result.key;

      const oldKey = this.imageS3Keys[event.index];

      if (oldKey && typeof oldKey === 'string' && !oldKey.startsWith('http://') && !oldKey.startsWith('https://')) {
        if (this.newlyUploadedKeys.has(oldKey)) {
          this.uploadService.delete(oldKey).catch(err => console.error('Failed to delete old image from S3', err));
          this.newlyUploadedKeys.delete(oldKey);
        } else {
          this.pendingDeleteKeys.push(oldKey);
        }
      }

      this.imageS3Keys[event.index] = result.key;
      this.newlyUploadedKeys.add(result.key);
      this.imageUrls[event.index] = result.previewUrl || result.key;
      this.imageUrls = [...this.imageUrls];
      this.completeSlotUpload(slotIndex);
    } catch (err: any) {
      console.error('S3 replace failed', err);
      this.toastr.error(`Image replacement failed: ${err?.message || err}`);
      this.endSlotUpload(slotIndex);
    } finally {
      setTimeout(() => this.endSlotUpload(slotIndex), 400);
    }
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

  onImageDelete(image: any): void {
    if (this.isViewMode) return;

    const url = image?.url || image?.originalUrl || image?.croppedUrl || '';
    const incomingKey = this.extractS3KeyFromUrl(url);

    let idx = this.imageS3Keys.findIndex(
      k => k === incomingKey || incomingKey.endsWith(k) || k.endsWith(incomingKey)
    );

    const key = (idx >= 0 && idx < this.imageS3Keys.length) ? this.imageS3Keys[idx] : (image?.key || '');

    if (key && typeof key === 'string' && !key.startsWith('http://') && !key.startsWith('https://')) {
      if (this.newlyUploadedKeys.has(key)) {
        this.uploadService.delete(key).catch(err => console.error('Failed to delete image from S3', err));
        this.newlyUploadedKeys.delete(key);
      } else {
        this.pendingDeleteKeys.push(key);
      }
    }

    if (idx >= 0) {
      this.imageUrls = this.imageUrls.filter((_, i) => i !== idx);
      this.imageS3Keys = this.imageS3Keys.filter((_, i) => i !== idx);
    }
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

  async saveCategory(): Promise<void> {
    if (this.isUploading) {
      this.errorMessage = 'Please wait until the image upload is complete.';
      this.toastr.error(this.errorMessage);
      return;
    }

    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }

    const payload = {
      name:      this.categoryForm.value.category_name.trim(),
      projectId: this.categoryForm.value.projectId,
      image:     this.imageS3Keys.length > 0 ? this.imageS3Keys.join(',') : null,
    };

    const request = this.isEditMode && this.categoryId
      ? this.service.updateCategory({ ...payload, id: this.categoryId })
      : this.service.createCategory(payload);

    request.subscribe({
      next: async () => {
        for (const key of this.pendingDeleteKeys) {
          try {
            await this.uploadService.delete(key);
          } catch (err) {
            console.error('Failed to delete image from S3:', key, err);
          }
        }
        this.pendingDeleteKeys = [];

        this.toastr.success(`Category ${this.isEditMode ? 'updated' : 'created'} successfully`);
        this.router.navigate(['/manage-categories']);
      },
      error: (err) => this.toastr.error(err.error?.message || 'Server error'),
    });
  }

  enableEditMode(): void {
    if (this.canEdit) {
      this.isEditMode = true;
      this.isViewMode = false;
      this.categoryForm.enable();
    } else {
      this.toastr.error('Access Denied: You cannot edit categories.');
    }
  }

  cancel(): void { this.router.navigate(['/manage-categories']); }
}