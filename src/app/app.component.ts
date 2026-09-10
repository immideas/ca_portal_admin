import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SessionActivityService } from './session-activity.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {

  title = 'base-frontend';
  notifications: any[] = [];

  constructor(private sessionActivity: SessionActivityService) { }
  ngOnInit() {
    const token = localStorage.getItem('token');
    if (token) {
      this.sessionActivity.initRouteTracking();
    }
  }
}