import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-force-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './force-change-password.component.html',
})
export class ForceChangePasswordComponent {

  showNew = false;
  showConfirm = false;
  loading = false;

 form: FormGroup = new FormGroup({
  newPassword: new FormControl('', [
    Validators.required,
    Validators.minLength(8)
  ]),
  confirmNewPassword: new FormControl('', [
    Validators.required
  ]),
});

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService,
  ) {}

 submit() {
  if (this.form.invalid) {
    this.toastr.warning(
      'Please fill all fields correctly.',
      'Warning'
    );
    return;
  }

  const {
    newPassword,
    confirmNewPassword
  } = this.form.value;

  if (newPassword !== confirmNewPassword) {
    this.toastr.error(
      'New password and confirm password do not match.',
      'Error'
    );
    return;
  }

  this.loading = true;

  this.authService.changeTemporaryPassword({
    newPassword,
    confirmNewPassword
  }).subscribe({
    next: () => {
      this.loading = false;

      // Local flag clear
      this.authService.clearMustChangePassword();

      this.toastr.success(
        'Password changed successfully!',
        'Success'
      );

      this.router.navigate(['/loading-redirect']);
    },

    error: (err) => {
      this.loading = false;

      const message =
        err.error?.message ||
        'Failed to change password. Please try again.';

      this.toastr.error(message, 'Error');
    }
  });
}
}