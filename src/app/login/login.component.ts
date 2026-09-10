import { CommonModule } from '@angular/common';
import { Component, NgZone, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../auth.service';
import { environment } from '../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { UserSessionService } from '../services/user.session.service';
import { PublicIpService } from '../services/public-ip.service';
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  showPassword: boolean = false;
  loginForm: FormGroup = new FormGroup({
    identifier: new FormControl('', [Validators.required]), 
    password: new FormControl('', [Validators.required, Validators.minLength(6)]),
  });

  errorMessage: string | null = null;
  showSessionModal: boolean = false;
  activeSessions: any[] = [];
  sessionLogoutLoading: boolean = false;
  locationMap: { [key: string]: string } = {}; 
  initialSessionCount: number = 0; 

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private toastr: ToastrService,
    private userSessionService: UserSessionService,
    private publicIpService: PublicIpService, 
    private ngZone: NgZone, 
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['message']) {
        this.toastr.info(params['message'], 'Session Status');
        this.router.navigate(['/login'], { replaceUrl: true });
      }
    });
  }

  setActiveSessionsWithLocation(sessions: any[]) {
    this.activeSessions = sessions;
    this.initialSessionCount = sessions.length; 
    sessions.forEach(session => {
      if (session.location && session.location.includes(',')) {
        const [lat, lon] = session.location.split(',');
        const key = session.location;
        if (!this.locationMap[key]) {
          this.publicIpService.reverseGeocode(parseFloat(lat), parseFloat(lon)).subscribe(
            (address: string) => {
              this.locationMap[key] = address;
            },
            () => {
              this.locationMap[key] = session.location;
            }
          );
        }
      }
    });
  }

  submitForm() {
    if (this.loginForm.valid) {
      const { identifier, password } = this.loginForm.value;
      const loginUrl = `${environment.apiUrl}/auth/login`;
      const userIp = localStorage.getItem('user_ip') || '';
      const geoLocation = localStorage.getItem('geo_location') || '';
      const httpOptions = {
        headers: {
          'x-user-ip': userIp,
          'x-geo-location': geoLocation
        }
      };

      this.authService.login(identifier, password, loginUrl, httpOptions).subscribe({
        next: (response) => {
          if (response && response.sessionLimitExceeded && response.sessions && response.sessions.length > 0) {
            this.setActiveSessionsWithLocation(response.sessions);
            this.showSessionModal = true;
            return;
          } else if (response && response.sessionLimitExceeded) {
            this.toastr.warning(response.message || 'Session limit reached. Please logout from other sessions to continue.', 'Session Limit');
            this.router.navigate(['/active-sessions']);
            return;
          }

          console.log('Login successful:', response);
          console.log('Role:', response.role);
          console.log('Status:', response.status); 

          this.toastr.success('Login successful!', 'Success');

          if (response && response.user) {
            localStorage.setItem('user', JSON.stringify(response.user));
          }


if (response?.plan) {
  localStorage.setItem('plan', JSON.stringify(response.plan));
} else {
  localStorage.removeItem('plan');
}

  // 👇 YE NAYA CHECK — sabse pehle
  if (response?.mustChangePassword) {
    this.router.navigate(['/set-password']);
    return;
  }
      
          this.router.navigate(['/loading-redirect']);
        },
        error: (err) => {
  if (err.error && err.error.sessionLimitExceeded && err.error.sessions && err.error.sessions.length > 0) {
    this.setActiveSessionsWithLocation(err.error.sessions);
    this.showSessionModal = true;
    return;
  }
  if (err.error && err.error.sessionLimitExceeded) {
    this.toastr.warning(err.error.message || 'Session limit reached. Please logout from other sessions to continue.', 'Session Limit');
    this.router.navigate(['/active-sessions']);
    return;
  }
  console.error('Error logging in:', err);

  let message: string;
  if (err.status === 403) {
    message = err.error?.message || 'Access denied. Please contact support.';
  } else if (err.status === 400) {
    message = 'Invalid email or password. Please try again.';
  } else {
    message = 'An unexpected error occurred. Please try again later.';
  }

  this.errorMessage = message;
  this.toastr.error(message, 'Error');
},
      
      });
    } else {
      this.errorMessage = 'Please fill in all required fields correctly.';
      this.toastr.warning(this.errorMessage, 'Warning');
    }
  
  }

 
logoutFromSession(sessionId: string): void {
    this.sessionLogoutLoading = true;
    this.userSessionService.endSpecificSession(sessionId).subscribe({
      next: () => {
        this.toastr.success('Logged out from the session', 'Success');
        this.activeSessions = this.activeSessions.filter(s => s.id !== sessionId);
        this.sessionLogoutLoading = false;
        
      },
      error: () => {
        this.toastr.error('Failed to log out from the session', 'Error');
        this.sessionLogoutLoading = false;
      }
    });
  }
  retryLoginAfterSessionLogout() {
    this.showSessionModal = false;
    this.submitForm();
  }
}
