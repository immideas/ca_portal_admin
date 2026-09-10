import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-request-password-reset',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './request-password-reset.component.html',
})
export class RequestPasswordResetComponent {
  form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
  });
  submitted = false;
  loading = false;

  constructor(
    private http: HttpClient,
    private toastr: ToastrService,
    private router: Router,
  ) {}

  submit(): void {
    if (this.form.invalid) {
      this.toastr.warning('Please enter a valid email address.', 'Warning');
      return;
    }

    this.loading = true;
    const { email } = this.form.value;

    this.http.post<any>(`${environment.apiUrl}/auth/forgot-password`, { email }).subscribe({
      next: (res) => {
        this.loading = false;
        this.submitted = true;
        this.toastr.success(res.message || 'Request sent successfully.', 'Success');
      },
      error: () => {
        this.loading = false;
        this.toastr.error('Something went wrong. Please try again.', 'Error');
      },
    });
  }
}