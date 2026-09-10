
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SessionActivityService } from '../../services/session.activity.service';
import { CommonModule } from '@angular/common';
import { Location } from '@angular/common';

@Component({
  selector: 'app-activity-line',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './activity-line.component.html',
  styleUrl: './activity-line.component.css'
})
export class ActivityLineComponent implements OnInit {
  activityId: string = '';
  activity: any = null;
  loading = false;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sessionActivityService: SessionActivityService,
  private location: Location
  ) {}

  ngOnInit(): void {
    this.activityId = this.route.snapshot.paramMap.get('id') || '';
    if (this.activityId) {
      this.loading = true;
      this.sessionActivityService.getSessionActivityDetailsById(this.activityId).subscribe({
        next: (res) => {
          this.activity = res;
          this.loading = false;
        },
        error: () => {
          this.error = 'Failed to load activity details.';
          this.loading = false;
        }
      });
    }
  }
  goBack(): void {
  this.location.back();
}
}
