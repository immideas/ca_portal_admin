import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { CategoryService } from '../../../services/category.service';
import { SubCategoryService } from '../../../services/subCategory.service';
import { ProjectService } from '../../../services/project.service';
import { UploadService } from '../../../services/upload.service';
import { UploadType } from '../../../shared/enums/uploadTypeEnums';
import { ImageUploaderLibComponent } from "@swiftlyme/image-uploader";

@Component({
  selector: 'app-add-sub-category',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, NgSelectModule, ImageUploaderLibComponent],
  templateUrl: './add-sub-category.component.html',
  styleUrls: ['./add-sub-category.component.css']
})
export class AddSubCategoryComponent implements OnInit, OnDestroy {
  subCategoryForm!: FormGroup;
  subCategoryId: string | null = null;
  isViewMode: boolean = false;
  isEditMode: boolean = false;
  canEdit: boolean = true;
  errorMessage: string = '';

  // Data arrays
  projects: any[] = [];
  categories: any[] = [];

  // Real-time tracking arrays
  imageUrls: string[] = [];
  imageS3Keys: string[] = [];

  // FIR Matching Upload Progress & Modal properties — ab PER-SLOT tracking
  maxImages: number = 1;
  showImageModal: boolean = false;
  selectedImage: string = '';

  // 👇 uploader wrapper ka reference, isi ke andar library apne slots render karti hai
  @ViewChild('uploaderHost') uploaderHost?: ElementRef<HTMLElement>;

  // slotIndex -> { progress, top, left, width, height }
  uploadingSlots = new Map<number, { progress: number; top: number; left: number; width: number; height: number }>();
  private slotTimers = new Map<number, ReturnType<typeof setInterval>>();

  get isUploading(): boolean {
    return this.uploadingSlots.size > 0;
  }

// Class me naya property add karo
private newlyUploadedKeys: Set<string> = new Set<string>();
private pendingDeleteKeys: string[] = [];

  get uploadingSlotLabel(): string {
    const count = this.uploadingSlots.size;
    return count > 1 ? `Uploading ${count} images...` : 'Uploading image...';
  }
  constructor(
    private fb: FormBuilder,
    private subCategoryService: SubCategoryService,
    private categoryService: CategoryService,
    private projectService: ProjectService,
    private router: Router,
    private route: ActivatedRoute,
    private toastr: ToastrService,
    private uploadService: UploadService,
  ) {
    const perms = (localStorage.getItem('permissions') || '').split(',');
    this.canEdit = perms.includes('edit_subcategory');
  }

  ngOnInit(): void {
    this.initForm();

    this.loadProjects();

    this.subCategoryForm.get('projectId')?.valueChanges.subscribe((projectId) => {
      this.categories = [];
      if (!this.isEditMode && this.subCategoryForm.get('projectId')?.dirty) {
        this.subCategoryForm.patchValue(
          { categoryId: null },
          { emitEvent: false }
        );
      }
      if (projectId) this.loadCategoriesByProject(projectId);
    });

    this.route.paramMap.subscribe(params => {
      this.subCategoryId = params.get('id');
      if (this.subCategoryId) {
        this.isEditMode = true;
        setTimeout(() => this.loadSubCategory(), 300);
      }
    });

    this.route.queryParamMap.subscribe(q => {
      this.isViewMode = q.get('viewMode') === 'true';
      if (this.isViewMode) {
        this.subCategoryForm.disable();
      } else if (this.isEditMode && !this.canEdit) {
        this.subCategoryForm.disable();
        this.isViewMode = true;
        this.isEditMode = false;
        this.toastr.error('You do not have permission to edit.');
      }
    });
  }

  initForm(): void {
    this.subCategoryForm = this.fb.group({
      projectId: [null, Validators.required],
      categoryId: [null, Validators.required],
      name: ['', Validators.required],
      image: [null]
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
      },
      error: () => this.toastr.error('Failed to load projects')
    });
  }

  loadCategoriesByProject(projectId: number, callback?: () => void): void {
    this.categoryService.listCategories().subscribe((res: any) => {
      const all = res.data || [];
      this.categories = all.filter((c: any) => String(c.projectId) === String(projectId));
      if (callback) callback();
    });
  }

 loadSubCategory(): void {
  this.subCategoryService.getSubCategoryById(this.subCategoryId!).subscribe((res: any) => {
    const data = res?.data;
    if (data) {
      this.subCategoryForm.patchValue({ projectId: data.projectId });
      this.loadCategoriesByProject(data.projectId, () => {
        this.subCategoryForm.patchValue({
          categoryId: data.categoryId,
          name: data.name,
        });

        // 👇 FIX: backend se aaya imageUrls (array of {key,url}) directly use karo
        if (Array.isArray(data.imageUrls) && data.imageUrls.length > 0) {
          this.imageUrls = data.imageUrls.map((d: any) => d.url);
          this.imageS3Keys = data.imageUrls.map((d: any) => d.key);
        }
      });
    }
  });
}

  // FIR Image Modal logic
  openImageModal(imageUrl: string): void {
    this.selectedImage = imageUrl;
    this.showImageModal = true;
  }

  closeImageModal(): void {
    this.showImageModal = false;
    this.selectedImage = '';
  }

 handleImagesChange(images: any[]): void {
  if (this.isViewMode) return;
  const incomingKeys = images.map((img: any) => img.key || img.url || '').filter(Boolean);
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
    const result = await this.uploadService.upload(
      image.file,
      UploadType.SUB_CATEGORY_IMAGE || 'subcategory'
    );

    image.key = result.key;
    this.imageS3Keys.push(result.key);
    this.newlyUploadedKeys.add(result.key);   // 👈 naya

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
    const result = await this.uploadService.upload(
      event.new.file,
      UploadType.SUB_CATEGORY_IMAGE || 'subcategory'
    );
    event.new.key = result.key;

    const oldKey = this.imageS3Keys[event.index];
    if (oldKey && typeof oldKey === 'string' && !oldKey.startsWith('http://') && !oldKey.startsWith('https://')) {
      if (this.newlyUploadedKeys.has(oldKey)) {
        this.uploadService.delete(oldKey).catch(err => console.error('Failed to delete old image from S3', err));
        this.newlyUploadedKeys.delete(oldKey);
      } else {
        this.pendingDeleteKeys.push(oldKey);   // 👈 defer karo
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
// onImageDelete(image: any): void {
//   if (this.isViewMode) return;
//   const url = image?.url || '';
//   let idx = url ? this.imageUrls.indexOf(url) : -1;
//   if (idx < 0 && url) {
//     idx = this.imageUrls.findIndex(u => u.includes(url) || url.includes(u));
//   }

//   const key = (idx >= 0 && idx < this.imageS3Keys.length) ? this.imageS3Keys[idx] : (image?.key || '');

//   if (key && typeof key === 'string' && !key.startsWith('http://') && !key.startsWith('https://')) {
//     if (this.newlyUploadedKeys.has(key)) {
//       this.uploadService.delete(key).catch(err => console.error('Failed to delete image from S3', err));
//       this.newlyUploadedKeys.delete(key);
//     } else {
//       this.pendingDeleteKeys.push(key);   // 👈 defer karo
//     }
//   }

//   if (idx >= 0) {
//     this.imageUrls = this.imageUrls.filter((_, i) => i !== idx);
//     this.imageS3Keys = this.imageS3Keys.filter((_, i) => i !== idx);
//   }
// }
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

 async saveSubCategory(): Promise<void> {
  if (this.isUploading) {
    this.errorMessage = 'Please wait until the image upload is complete.';
    this.toastr.error(this.errorMessage);
    return;
  }

  if (this.subCategoryForm.invalid) {
    this.subCategoryForm.markAllAsTouched();
    this.toastr.error('Please fill in all required fields correctly.');
    return;
  }

  const payload: any = {
    name: this.subCategoryForm.value.name,
    categoryId: this.subCategoryForm.value.categoryId,
    projectId: this.subCategoryForm.value.projectId,
    image: this.imageS3Keys.length > 0 ? this.imageS3Keys.join(',') : null
  };
  if (this.isEditMode && this.subCategoryId) payload.id = this.subCategoryId;

  const request = this.isEditMode
    ? this.subCategoryService.updateSubCategory(payload)
    : this.subCategoryService.createSubCategory(payload);

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

      this.toastr.success(`Sub Category ${this.isEditMode ? 'updated' : 'created'} successfully`);
      this.router.navigate(['/manage-sub-category']);
    },
    error: err => {
      this.errorMessage = err.error?.message || 'Server error';
      this.toastr.error(this.errorMessage);
    }
  });
}

  enableEditMode(): void {
    if (this.canEdit) {
      this.isViewMode = false;
      this.isEditMode = true;
      this.subCategoryForm.enable();
    } else {
      this.toastr.error('Access Denied: You cannot edit sub-categories.');
    }
  }

  cancel(): void {
    this.router.navigate(['/manage-sub-category']);
  }
}
