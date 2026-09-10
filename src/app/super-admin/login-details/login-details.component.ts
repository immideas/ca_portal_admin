import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UserSessionService } from '../../services/user.session.service';
import { CommonModule, DatePipe } from '@angular/common';
import { PublicIpService } from '../../services/public-ip.service';

@Component({
  selector: 'app-login-details',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './login-details.component.html',
  styleUrl: './login-details.component.css',
  providers: [PublicIpService]
})
export class LoginDetailsComponent implements OnInit {
  sessionId: string = '';
  sessionDetails: any = null;
  loading = false;
  error: string = '';
  locationAddress: string = '';
  locationLoading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private userSessionService: UserSessionService,
    private publicIpService: PublicIpService
  ) {}

  ngOnInit(): void {
    this.sessionId = this.route.snapshot.paramMap.get('sessionId') || '';
    if (this.sessionId) {
      this.loading = true;
      this.userSessionService.getUserSessionBySessionId(this.sessionId).subscribe({
        next: (res) => {
          this.sessionDetails = res;
          this.loading = false;
          this.resolveLocation();
        },
        error: () => {
          this.error = 'Failed to load session details.';
          this.loading = false;
        }
      });
    }
  }

  private resolveLocation(): void {
    const location = this.sessionDetails?.location;
    if (location && location.includes(',')) {
      const [lat, lon] = location.split(',').map((v: string) => parseFloat(v.trim()));
      if (!isNaN(lat) && !isNaN(lon)) {
        this.locationLoading = true;
        this.publicIpService.reverseGeocode(lat, lon).subscribe({
          next: (address) => {
            this.locationAddress = address;
            this.locationLoading = false;
          },
          error: () => {
            this.locationAddress = location;
            this.locationLoading = false;
          }
        });
        return;
      }
    }
    this.locationAddress = location || '';
  }

  goBack(): void {
    this.router.navigate(['/user-sessions']);
  }
}
