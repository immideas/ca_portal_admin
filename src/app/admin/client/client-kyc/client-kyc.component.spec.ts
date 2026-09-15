import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClientKycComponent } from './client-kyc.component';

describe('ClientKycComponent', () => {
  let component: ClientKycComponent;
  let fixture: ComponentFixture<ClientKycComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientKycComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClientKycComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
