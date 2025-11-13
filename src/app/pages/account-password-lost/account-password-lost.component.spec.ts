import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountPasswordLostComponent } from './account-password-lost.component';

describe('AccountPasswordLostComponent', () => {
  let component: AccountPasswordLostComponent;
  let fixture: ComponentFixture<AccountPasswordLostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountPasswordLostComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountPasswordLostComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
