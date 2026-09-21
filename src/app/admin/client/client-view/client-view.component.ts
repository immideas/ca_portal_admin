import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { AddClientComponent } from '../add-client/add-client.component';
import { ClientKycComponent } from '../client-kyc/client-kyc.component';
import { AddClientServicesComponent } from '../add-client-services/add-client-services.component';

@Component({
  selector: 'app-client-view',
  standalone: true,
  imports: [
    CommonModule,
    AddClientComponent,
    ClientKycComponent,
    AddClientServicesComponent
  ],
  templateUrl: './client-view.component.html',
  styleUrl: './client-view.component.css'
})
export class ClientViewComponent implements OnInit {

  clientId!: number;

  activeTab: 'basic' | 'kyc' | 'services' = 'basic';

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {

    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.clientId = Number(id);
    }

  }

  setTab(tab: 'basic' | 'kyc' | 'services'): void {
    this.activeTab = tab;
  }

  goBack(): void {
    this.router.navigate(['/clients']);
  }

editBasicDetails(): void {
  this.router.navigate([
    '/edit-client',
    this.clientId
  ]);
}

editKyc(): void {
  this.router.navigate([
    '/client-kyc',
    this.clientId
  ]);
}

editServices(): void {
  this.router.navigate([
    "/edit-client-services",
    this.clientId
  ]);
}

}