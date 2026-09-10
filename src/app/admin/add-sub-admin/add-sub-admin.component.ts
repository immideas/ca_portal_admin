import { Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { NgxUiLoaderModule, NgxUiLoaderService } from 'ngx-ui-loader';
import { ToastrService, ToastrModule } from 'ngx-toastr';
import { CanComponentDeactivate } from '../../can-deactivate.guard';
import { Observable, firstValueFrom } from 'rxjs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../confirm-dialog/confirm-dialog.component';
import { RoleService } from '../../services/role.service';
import { UploadService } from '../../services/upload.service';
import { UploadType } from '../../shared/enums/uploadTypeEnums';
import { ImageUploaderLibComponent } from '@swiftlyme/image-uploader';

@Component({
  selector: 'app-add-sub-admin',
  templateUrl: './add-sub-admin.component.html',
  styleUrls: ['./add-sub-admin.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    RouterModule,
    ReactiveFormsModule,
    NgxUiLoaderModule,
    ImageUploaderLibComponent,
    ToastrModule,
    MatDialogModule,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AddSubAdminComponent implements OnInit, OnDestroy, CanComponentDeactivate {
  showPassword = false;
  addSubAdminForm: FormGroup;
  token: string | null = localStorage.getItem('token');
  submitted = false;
  roles: any[] = [];
  isEditMode = false;
  isViewMode = false;
  subAdminId: string | null = null;
  originalData: any = null;

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
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private ngxLoader: NgxUiLoaderService,
    private toastr: ToastrService,
    private dialog: MatDialog,
    private roleService: RoleService,
    private uploadService: UploadService,
  ) {
    this.addSubAdminForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.pattern('^[a-zA-Z ]+$')]],
      phone: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      email: ['', [Validators.required, Validators.email]],
      // password: ['', Validators.required],
      role: ['', Validators.required],
      profileimage: [''],
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.subAdminId = params.get('id');
      if (this.subAdminId) {
        this.isEditMode = true;
        this.fetchSubAdminData(this.subAdminId);
      }
    });

    this.route.queryParamMap.subscribe((queryParams) => {
      this.isViewMode = queryParams.get('viewMode') === 'true';
      if (this.isViewMode) {
        this.addSubAdminForm.disable();
      }
      if (this.isEditMode) {
        this.addSubAdminForm.get('password')?.clearValidators();
        this.addSubAdminForm.get('password')?.updateValueAndValidity();
      }
    });

    this.roleService.listAllRoles().subscribe({
      next: (response: any) => {
        const rawRoles = response && response.data && Array.isArray(response.data) ? response.data : Array.isArray(response) ? response : [];
        this.roles = rawRoles.filter((role: any) => role.id !== 1 && role.id !== 2);
      },
      error: () => {
        this.toastr.error('Failed to load roles');
      },
    });

    // this.addSubAdminForm.get('phone')?.valueChanges.subscribe((phoneValue: string) => {
    //   if (!this.isEditMode) {
    //     this.addSubAdminForm.get('password')?.setValue(phoneValue);
    //   }
    // });

  }

  ngOnDestroy(): void {
    this.slotTimers.forEach((timer) => clearInterval(timer));
    this.slotTimers.clear();
  }

  fetchSubAdminData(id: string): void {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.token}`);
    this.http.post<any>(`${environment.apiUrl}/users/getUserById`, { id }, { headers }).subscribe(
      (response) => {
        const userData = response.data;
        this.originalData = userData;

        // 👇 sirf sub-admin ki apni image load karo — role ki image kabhi nahi dikhani
        void this.loadExistingImages(userData.profileimage || '');

        this.addSubAdminForm.patchValue({
          name: userData.name || '',
          email: userData.email || '',
          phone: userData.phone || '',
          password: '',
          role: userData.role || '',
          profileimage: userData.profileimage || '',
        });

        if (this.isViewMode) {
          this.addSubAdminForm.disable();
        }
      },
      () => {
        this.toastr.error('Failed to fetch sub-admin data', 'Error');
      },
    );
  }
private async loadExistingImages(imageValue: string): Promise<void> {
  const imageList = imageValue ? imageValue.split(',').filter(Boolean) : [];

 
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

  handleImagesChange(images: any[]): void {
    if (this.isViewMode || !Array.isArray(images)) return;

    const incomingKeys = images
      .map((img: any) => img.key || this.extractS3KeyFromUrl(img.url || img.originalUrl || ''))
      .filter(Boolean);

   
    if (this.imageS3Keys.length > 0 && incomingKeys.length === 0) {
      return;
    }

    const keepIndices: number[] = [];

    this.imageS3Keys.forEach((k, idx) => {
      if (incomingKeys.includes(k) || incomingKeys.includes(this.imageUrls[idx])) {
        keepIndices.push(idx);
      }
    });

   
    if (keepIndices.length === 0 && this.imageS3Keys.length > 0 && images.length > 0) {
      return;
    }

    this.imageS3Keys = keepIndices.map((i) => this.imageS3Keys[i]);
    this.imageUrls = keepIndices.map((i) => this.imageUrls[i]);
    this.addSubAdminForm.get('profileimage')?.setValue(this.imageS3Keys.length > 0 ? this.imageS3Keys.join(',') : '');
  }

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
      const result = await this.uploadService.upload(image.file, UploadType.SUB_ADMIN_IMAGE);
      image.key = result.key;

      this.imageS3Keys.push(result.key);
      this.newlyUploadedKeys.add(result.key);
      this.imageUrls = [...this.imageUrls, result.previewUrl || result.key];
      this.addSubAdminForm.get('profileimage')?.setValue(this.imageS3Keys.join(','));
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
      const result = await this.uploadService.upload(event.new.file, UploadType.SUB_ADMIN_IMAGE);
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
      this.addSubAdminForm.get('profileimage')?.setValue(this.imageS3Keys.join(','));
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

    this.addSubAdminForm.get('profileimage')?.setValue(this.imageS3Keys.length > 0 ? this.imageS3Keys.join(',') : '');
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

  saveSubAdmin(): void {
    this.submitted = true;
    if (this.addSubAdminForm.valid) {
      this.ngxLoader.start();
      const formValue = this.addSubAdminForm.getRawValue();
      const headers = new HttpHeaders().set('Authorization', `Bearer ${this.token}`);
      const finalImageKey = this.imageS3Keys.length > 0 ? this.imageS3Keys[0] : null;

      if (this.isEditMode && this.subAdminId) {
        const payload: any = {
          id: this.subAdminId,
          name: formValue.name,
          email: formValue.email,
          phone: formValue.phone,
          role: formValue.role,
          profileimage: finalImageKey,
        };
        if (formValue.password && formValue.password.trim() !== '') {
          payload.password = formValue.password;
        }
        this.http.post(`${environment.apiUrl}/users/updateUser`, payload, { headers }).subscribe(
          async () => {
            await this.flushPendingDeletes();
            this.ngxLoader.stop();
            this.toastr.success('Sub-admin updated successfully', 'Success');
            this.router.navigate(['/manage-users']);
          },
          (err: any) => {
            this.ngxLoader.stop();
            this.toastr.error(err?.error?.message || 'Failed to add sub-admin');
          },
        );
      } else {
        const payload = {
          name: formValue.name,
          email: formValue.email,
          // password: formValue.password,
          phone: formValue.phone,
          role: formValue.role,
          profileimage: finalImageKey,
        };
        this.http.post(`${environment.apiUrl}/users/createUser`, payload, { headers }).subscribe(
          async () => {
            await this.flushPendingDeletes();
            this.ngxLoader.stop();
            this.toastr.success('Sub-admin added successfully');
            this.router.navigate(['/manage-users']);
          },
         (err: any) => {                       // 👈 err parameter add karo
    this.ngxLoader.stop();
    this.toastr.error(err?.error?.message || 'Failed to add sub-admin');   // 👈 actual reason dikhao
  },
        );
      }
    } else {
      this.toastr.error('Please fill in all required fields correctly.');
    }
  }

  cancel(): void {
    this.router.navigate(['/manage-users']);
  }

  allowOnlyAlphabets(event: KeyboardEvent): void {
    const char = String.fromCharCode(event.which || event.keyCode);
    if (!/^[a-zA-Z ]$/.test(char)) {
      event.preventDefault();
    }
  }

  allowOnlyNumbers(event: KeyboardEvent): void {
    const char = String.fromCharCode(event.which || event.keyCode);
    if (!/^[0-9]$/.test(char)) {
      event.preventDefault();
    }
  }

  enableEditMode(): void {
    this.isViewMode = false;
    this.addSubAdminForm.enable();

    if (this.isEditMode) {
      this.addSubAdminForm.get('password')?.clearValidators();
      this.addSubAdminForm.get('password')?.updateValueAndValidity();
    }
  }

  canDeactivate(): Observable<boolean> | Promise<boolean> | boolean {
    if (this.addSubAdminForm.dirty && !this.submitted && !this.isViewMode) {
      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        width: '550px',
        disableClose: true,
        data: { message: 'You have unsaved changes. Do you really want to leave?' },
      });
      return dialogRef.afterClosed();
    }
    return true;
  }
}