import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClientCredentialVaultComponent } from './client-credential-vault.component';

describe('ClientCredentialVaultComponent', () => {
  let component: ClientCredentialVaultComponent;
  let fixture: ComponentFixture<ClientCredentialVaultComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientCredentialVaultComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClientCredentialVaultComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
