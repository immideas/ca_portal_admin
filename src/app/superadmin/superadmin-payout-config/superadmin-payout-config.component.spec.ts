import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SuperadminPayoutConfigComponent } from './superadmin-payout-config.component';

describe('SuperadminPayoutConfigComponent', () => {
  let component: SuperadminPayoutConfigComponent;
  let fixture: ComponentFixture<SuperadminPayoutConfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuperadminPayoutConfigComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SuperadminPayoutConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
