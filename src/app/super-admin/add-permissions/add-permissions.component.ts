import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PermissionService } from '../../services/permission.service';
import { NgxUiLoaderModule, NgxUiLoaderService } from 'ngx-ui-loader';
import { ToastrService, ToastrModule } from 'ngx-toastr';

@Component({
  selector: 'app-add-permissions',
  templateUrl: './add-permissions.component.html',
  styleUrls: ['./add-permissions.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgxUiLoaderModule,
    ToastrModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AddPermissionsComponent {
  permissionForm: FormGroup;
  errorMessage: string | null = null;
  submitted = false;
  isEditMode = false;
  isViewMode = false;
  permissionId: string | null = null;
  groupNames: string[] = []; 
  nameValueChangeSub?: any;
  groupNameValueChangeSub?: any;

  constructor(
    private fb: FormBuilder,
    private permissionService: PermissionService,
    private router: Router,
    private ngxLoader: NgxUiLoaderService,
    private toastr: ToastrService,
    private route: ActivatedRoute
  ) {
    this.permissionForm = this.fb.group({
      name: ['', [Validators.required, Validators.pattern(/^(?!\s*$).+/)]],
      permission: ['', [Validators.required, Validators.pattern(/^(?!\s*$).+/)]],
      groupName: ['', [Validators.required, Validators.pattern(/^(?!\s*$).+/)]],
      groupCode: ['', [Validators.required, Validators.pattern(/^(?!\s*$).+/)]],
      description: ['', [Validators.maxLength(500)]]
    });

    this.permissionService.listUniqueGroupNames().subscribe(
      (response) => {
        this.groupNames = response || [];
      },
      (error) => {
        console.error('Error fetching unique group names:', error);
      }
    );

    this.route.paramMap.subscribe((params) => {
      this.permissionId = params.get('id');
      if (this.permissionId) {
        this.isEditMode = true;
        this.loadPermissionData(this.permissionId);
      } else {
        this.setupAutoGeneration();
      }
    });

    this.route.queryParamMap.subscribe((queryParams) => {
      this.isViewMode = queryParams.get('viewMode') === 'true';
      if (this.isViewMode) {
        this.permissionForm.disable();
      }
    });
  }

  private setupAutoGeneration(): void {
    this.nameValueChangeSub = this.permissionForm.get('name')?.valueChanges.subscribe((name: string) => {
      const formattedPermission = name
        ? name.trim().toLowerCase().replace(/\s+/g, '_')
        : '';
      this.permissionForm.get('permission')?.setValue(formattedPermission, { emitEvent: false });
    });

    this.groupNameValueChangeSub = this.permissionForm.get('groupName')?.valueChanges.subscribe((groupName: string) => {
      const formattedGroupCode = groupName
        ? groupName.trim().toLowerCase().replace(/\s+/g, '_')
        : '';
      this.permissionForm.get('groupCode')?.setValue(formattedGroupCode, { emitEvent: false });
    });
  }

  private loadPermissionData(id: string): void {
    this.ngxLoader.start();
    this.permissionService.listPermissionById({ id }).subscribe(
      (response) => {
        if (response) {
          this.permissionForm.patchValue({
            ...response,
            groupName: response.groupName || '',
            groupCode: response.groupCode || '',
            description: response.description || ''
          });
          if (this.nameValueChangeSub) { this.nameValueChangeSub.unsubscribe(); }
          if (this.groupNameValueChangeSub) { this.groupNameValueChangeSub.unsubscribe(); }
        } else {
          console.error('Unexpected response format:', response);
          this.toastr.error('Failed to load permission data.');
        }
        this.ngxLoader.stop();
      },
      (error) => {
        console.error('Error loading permission:', error);
        this.toastr.error('Failed to load permission data.');
        this.ngxLoader.stop();
      }
    );
  }

  savePermission(): void {
    this.submitted = true;
    if (this.permissionForm.valid) {
      this.ngxLoader.start();
      const formValue = {
        ...this.permissionForm.value
      };
      const saveObservable = this.isEditMode
        ? this.permissionService.updatePermission({ id: this.permissionId, ...formValue })
        : this.permissionService.createPermission(formValue);

      saveObservable.subscribe(
        () => {
          this.ngxLoader.stop();
          const successMessage = this.isEditMode
            ? 'Permission updated successfully'
            : 'Permission added successfully';
          this.toastr.success(successMessage);
          this.router.navigate(['/manage-permissions']);
        },
        (error) => {
          console.error('Error saving permission:', error);
          this.errorMessage = error.error.message || 'Failed to save permission';
          this.toastr.error(this.errorMessage ?? 'An unknown error occurred.');
          this.ngxLoader.stop();
        }
      );
    } else {
      this.errorMessage = 'Please fill out all required fields.';
      this.toastr.error(this.errorMessage);
    }
  }

  cancel(): void {
    this.router.navigate(['/manage-permissions']);
  }

  enableEditMode(): void {
    this.isViewMode = false;
    this.permissionForm.enable();
  }
}
