import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClientGroupListComponent } from './client-group-list.component';

describe('ClientGroupListComponent', () => {
  let component: ClientGroupListComponent;
  let fixture: ComponentFixture<ClientGroupListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientGroupListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClientGroupListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
