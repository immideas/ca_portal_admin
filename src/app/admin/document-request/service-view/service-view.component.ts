import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DocumentRequestListComponent } from '../document-request-list/document-request-list.component';
import { SubmittedDocumentsComponent } from '../submitted-documents/submitted-documents.component';

@Component({
  selector: 'app-service-view',
  standalone: true,
  imports: [
    CommonModule,
    DocumentRequestListComponent,
    SubmittedDocumentsComponent
  ],
  templateUrl: './service-view.component.html',
  styleUrl: './service-view.component.css'
})
export class ServiceViewComponent implements OnInit {

  serviceId!: number;

  activeTab: 'request' | 'submitted' = 'request';

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.serviceId = Number(id);
    }

    console.log('Service ID:', this.serviceId);
  }

  setTab(tab: 'request' | 'submitted'): void {
    this.activeTab = tab;
  }

  goBack(): void {
    this.router.navigate(['/document-request']);
  }
}