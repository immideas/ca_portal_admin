import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChangeUserThemeComponent } from './change-user-theme.component';

describe('ChangeUserThemeComponent', () => {
  let component: ChangeUserThemeComponent;
  let fixture: ComponentFixture<ChangeUserThemeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChangeUserThemeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChangeUserThemeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
