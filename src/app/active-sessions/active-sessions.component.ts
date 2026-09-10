import { Component, OnInit } from '@angular/core';
import { UserSessionService } from '../services/user.session.service';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-active-sessions',
  templateUrl: './active-sessions.component.html',
  styleUrls: ['./active-sessions.component.css'],
  imports: [CommonModule]
})
export class ActiveSessionsComponent implements OnInit {
  sessions: any[] = [];
  loading: boolean = false;

  constructor(private userSessionService: UserSessionService, private toastr: ToastrService) {}

  ngOnInit(): void {
    this.fetchActiveSessions();
  }

  fetchActiveSessions(): void {
    this.loading = true;
    this.userSessionService.getUserSessions().subscribe({
      next: (sessions) => {
        this.sessions = sessions.filter((session: any) => session.session_ended === null);
        this.loading = false;
      },
      error: (err) => {
        this.toastr.error('Failed to fetch active sessions', 'Error');
        this.loading = false;
      }
    });
  }

  logoutFromSession(sessionId: string): void {
    this.userSessionService.endSpecificSession(sessionId).subscribe({
      next: () => {
        this.toastr.success('Logged out from the session', 'Success');
        this.fetchActiveSessions();
      },
      error: (err: any) => {
        this.toastr.error('Failed to log out from the session', 'Error');
      }
    });
  }
}
