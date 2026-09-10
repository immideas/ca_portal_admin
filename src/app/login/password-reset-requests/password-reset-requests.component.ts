import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders, HttpClientModule } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ToastrService, ToastrModule } from 'ngx-toastr';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-password-reset-requests',
  standalone: true,
  imports: [CommonModule, HttpClientModule, ToastrModule, MatDialogModule],
  templateUrl: './password-reset-requests.component.html',
})
export class PasswordResetRequestsComponent implements OnInit {
  requests: any[] = [];
  loading = false;
  token = localStorage.getItem('token');

  constructor(
    private http: HttpClient,
    private toastr: ToastrService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.fetchPending();
  }

  private get headers(): HttpHeaders {
    return new HttpHeaders().set('Authorization', `Bearer ${this.token}`);
  }

  fetchPending(): void {
    this.loading = true;
    this.http.post<any>(`${environment.apiUrl}/auth/forgot-password/pending`, {}, { headers: this.headers }).subscribe({
      next: (res) => {
        this.requests = res.data || [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toastr.error('Failed to load password reset requests', 'Error');
      },
    });
  }

  confirmApprove(req: any): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '450px',
      data: {
        message: `Approve password reset for ${req.name}? A new temporary password will be emailed to them.`,
      },
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;
      this.approve(req.historyId);
    });
  }

  private approve(historyId: number): void {
    this.http.post<any>(`${environment.apiUrl}/auth/forgot-password/approve`, { historyId }, { headers: this.headers }).subscribe({
      next: () => {
        this.toastr.success('Password reset and emailed to the user.', 'Success');
        this.fetchPending();
      },
      error: (err) => {
        this.toastr.error(err.error?.message || 'Failed to approve request', 'Error');
      },
    });
  }
}