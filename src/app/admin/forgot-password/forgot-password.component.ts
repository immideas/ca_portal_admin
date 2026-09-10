import { Component } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { UserSessionService } from '../../services/user.session.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent {
  resetPasswordForm: FormGroup = new FormGroup({
    oldPassword: new FormControl('', [Validators.required, Validators.minLength(6)]),
    newPassword: new FormControl('', [Validators.required, Validators.minLength(6)]),
    confirmNewPassword: new FormControl('', [Validators.required, Validators.minLength(6)])
  }, { validators: passwordMatchValidator });

  errorMessage: string | null = null;
  successMessage: string | null = null;
  logoutAllLoading: boolean = false;
  private logoutAllSessionsChoice: boolean = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private toastr: ToastrService,
    private userSessionService: UserSessionService
  ) {}

  onResetPasswordSubmit() {
    if (this.resetPasswordForm.valid) {
      const modal = document.getElementById('logoutAllModal');
      if (modal) {
        // Bootstrap 5 modal
        // @ts-ignore
        const bsModal = new window.bootstrap.Modal(modal);
        bsModal.show();
      }
    } else {
      this.errorMessage = 'Please fill in all required fields correctly.';
      this.toastr.warning(this.errorMessage || '', 'Warning');
    }
  }

  // Called from modal buttons
  proceedResetPassword(logoutAll: boolean) {
    this.logoutAllSessionsChoice = logoutAll;
    this.submitFormWithLogoutChoice();
  }

  // Main API call logic
  private submitFormWithLogoutChoice() {
    const token = localStorage.getItem('token');
    const { oldPassword, newPassword, confirmNewPassword } = this.resetPasswordForm.value;
    const url = `${environment.apiUrl}/auth/reset-password`;
    const body = { oldPassword, newPassword, confirmNewPassword, logoutAllSessions: this.logoutAllSessionsChoice };
    const headers = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    this.http.post<any>(url, body, headers).subscribe({
      next: (res) => {
        this.successMessage = res.message || 'Password has been reset successfully.';
        this.errorMessage = null;
        this.toastr.success(this.successMessage || '', 'Success');
        this.resetPasswordForm.reset();
      },
      error: (err) => {
        this.successMessage = null;
        if (err.error && err.error.message) {
          this.errorMessage = err.error.message;
        } else {
          this.errorMessage = 'An unexpected error occurred. Please try again later.';
        }
        this.toastr.error(this.errorMessage || '', 'Error');
      }
    });
  }
}

// Custom validator for matching newPassword and confirmNewPassword
function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const newPassword = control.get('newPassword')?.value;
  const confirmNewPassword = control.get('confirmNewPassword')?.value;
  if (newPassword && confirmNewPassword && newPassword !== confirmNewPassword) {
    return { passwordMismatch: true };
  }
  return null;
}
