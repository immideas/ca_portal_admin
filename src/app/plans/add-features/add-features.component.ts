// import { Component, OnInit } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
// import { ActivatedRoute, Router } from '@angular/router';
// import { NgxUiLoaderModule, NgxUiLoaderService } from 'ngx-ui-loader';
// import { ToastrService } from 'ngx-toastr';
// import { FeaturesService } from '../../services/features.service';

// @Component({
//   selector: 'app-add-features',
//   standalone: true,
//   imports: [CommonModule, ReactiveFormsModule, NgxUiLoaderModule],
//   templateUrl: './add-features.component.html',
//   styleUrls: ['./add-features.component.css']
// })
// export class AddFeaturesComponent implements OnInit {

//   featureForm: FormGroup;
//   isEditMode = false;
//   isViewMode = false;
//   id: string | null = null;

//   canEdit = true;
//   errorMessage: string = '';

//   // Feature "type" enum — must match backend model ENUM values
//   featureTypes = ['boolean', 'limit', 'quota', 'days', 'number', 'text'];

//   // Permission groups the feature can be tagged with (adjust to match your Permissions.group_code values)
//   availableGroups = [
//     'inventory', 'billing', 'reports', 'customer_management',
//     'inspection', 'communication', 'workflow', 'user_management'
//   ];

//   constructor(
//     private fb: FormBuilder,
//     private service: FeaturesService,
//     private router: Router,
//     private route: ActivatedRoute,
//     private loader: NgxUiLoaderService,
//     private toastr: ToastrService
//   ) {
//     this.featureForm = this.fb.group({
//       name: ['', [Validators.required, Validators.minLength(2)]],
//       feature_code: ['', [
//         Validators.required,
//         Validators.pattern(/^[a-z0-9_]+$/)
//       ]],
//       type: [null, Validators.required],
//       description: [''],
//       permission_group_codes: [[]],
//       status: [1],
//     });
//   }

//   ngOnInit(): void {
//     this.route.paramMap.subscribe(p => {
//       this.id = p.get('id');
//       if (this.id) {
//         this.isEditMode = true;
//         this.load();
//       }
//     });

//     this.route.queryParamMap.subscribe(q => {
//       this.isViewMode = q.get('viewMode') === 'true';
//       if (this.isViewMode) this.featureForm.disable();
//     });
//   }

//   load(): void {
//     this.loader.start();
//     this.service.getById(this.id!).subscribe({
//       next: (res: any) => {
//         const data = res.data?.details || res.data;
//         this.featureForm.patchValue(data);
//         this.loader.stop();
//       },
//       error: () => {
//         this.loader.stop();
//         this.toastr.error('Failed to load feature data');
//       }
//     });
//   }

//   toggleGroup(group: string) {
//     if (this.isViewMode) return;
//     const control = this.featureForm.get('permission_group_codes');
//     const current: string[] = control?.value || [];
//     if (current.includes(group)) {
//       control?.setValue(current.filter(g => g !== group));
//     } else {
//       control?.setValue([...current, group]);
//     }
//   }

//   isGroupSelected(group: string): boolean {
//     const current: string[] = this.featureForm.get('permission_group_codes')?.value || [];
//     return current.includes(group);
//   }

//   save(): void {
//     if (this.featureForm.invalid) {
//       this.featureForm.markAllAsTouched();
//       return;
//     }

//     const payload = this.featureForm.getRawValue();

//     const req = this.isEditMode
//       ? this.service.update({ feature_id: this.id, ...payload })
//       : this.service.create(payload);

//     this.loader.start();
//     req.subscribe({
//       next: () => {
//         this.loader.stop();
//         this.toastr.success(this.isEditMode ? 'Feature updated successfully' : 'Feature added successfully');
//         this.router.navigate(['/manage-features']);
//       },
//       error: (err) => {
//         this.loader.stop();
//         this.errorMessage = err.error?.message || 'Save failed';
//         this.toastr.error(this.errorMessage);
//       }
//     });
//   }

//   cancel(): void {
//     this.router.navigate(['/manage-features']);
//   }

//   enableEdit(): void {
//     this.isViewMode = false;
//     this.featureForm.enable();
//   }
// }

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgxUiLoaderModule, NgxUiLoaderService } from 'ngx-ui-loader';
import { ToastrService } from 'ngx-toastr';
import { FeaturesService } from '../../services/features.service';

interface PermissionGroup {
  groupCode: string;
  groupName: string;
}

@Component({
  selector: 'app-add-features',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgxUiLoaderModule],
  templateUrl: './add-features.component.html',
  styleUrls: ['./add-features.component.css']
})
export class AddFeaturesComponent implements OnInit {

  featureForm: FormGroup;
  isEditMode = false;
  isViewMode = false;
  id: string | null = null;

  canEdit = true;
  errorMessage: string = '';

  // Feature "type" enum — must match backend model ENUM values
  featureTypes = ['boolean', 'limit', 'quota', 'days', 'number', 'text'];

  // Permission groups the feature can be tagged with — now loaded dynamically
  // from the Permissions table (groupCode / groupName) instead of being hardcoded.
  availableGroups: PermissionGroup[] = [];
  groupsLoading = false;

  constructor(
    private fb: FormBuilder,
    private service: FeaturesService,
    private router: Router,
    private route: ActivatedRoute,
    private loader: NgxUiLoaderService,
    private toastr: ToastrService
  ) {
    this.featureForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      feature_code: ['', [
        Validators.required,
        Validators.pattern(/^[a-z0-9_]+$/)
      ]],
      type: [null, Validators.required],
      description: [''],
      permission_group_codes: [[]],
      status: [1],
    });
  }

  ngOnInit(): void {
    this.loadPermissionGroups(); // 👈 NEW — replaces hardcoded availableGroups array

    this.route.paramMap.subscribe(p => {
      this.id = p.get('id');
      if (this.id) {
        this.isEditMode = true;
        this.load();
      }
    });

    this.route.queryParamMap.subscribe(q => {
      this.isViewMode = q.get('viewMode') === 'true';
      if (this.isViewMode) this.featureForm.disable();
    });
  }

  loadPermissionGroups(): void {
    this.groupsLoading = true;
    this.service.getPermissionGroups().subscribe({
      next: (res: any) => {
        this.availableGroups = res.data || [];
        this.groupsLoading = false;
      },
      error: () => {
        this.groupsLoading = false;
        this.toastr.error('Failed to load permission groups');
      }
    });
  }

  load(): void {
    this.loader.start();
    this.service.getById(this.id!).subscribe({
      next: (res: any) => {
        const data = res.data?.details || res.data;
        this.featureForm.patchValue(data);
        this.loader.stop();
      },
      error: () => {
        this.loader.stop();
        this.toastr.error('Failed to load feature data');
      }
    });
  }

  toggleGroup(group: PermissionGroup) {
    if (this.isViewMode) return;
    const control = this.featureForm.get('permission_group_codes');
    const current: string[] = control?.value || [];
    if (current.includes(group.groupCode)) {
      control?.setValue(current.filter(g => g !== group.groupCode));
    } else {
      control?.setValue([...current, group.groupCode]);
    }
  }

  isGroupSelected(group: PermissionGroup): boolean {
    const current: string[] = this.featureForm.get('permission_group_codes')?.value || [];
    return current.includes(group.groupCode);
  }

  save(): void {
    if (this.featureForm.invalid) {
      this.featureForm.markAllAsTouched();
      return;
    }

    const payload = this.featureForm.getRawValue();

    const req = this.isEditMode
      ? this.service.update({ feature_id: this.id, ...payload })
      : this.service.create(payload);

    this.loader.start();
    req.subscribe({
      next: () => {
        this.loader.stop();
        this.toastr.success(this.isEditMode ? 'Feature updated successfully' : 'Feature added successfully');
        this.router.navigate(['/manage-features']);
      },
      error: (err) => {
        this.loader.stop();
        this.errorMessage = err.error?.message || 'Save failed';
        this.toastr.error(this.errorMessage);
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/manage-features']);
  }

  enableEdit(): void {
    this.isViewMode = false;
    this.featureForm.enable();
  }
}