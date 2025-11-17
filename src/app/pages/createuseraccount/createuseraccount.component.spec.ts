import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateuseraccountComponent } from './createuseraccount.component';

describe('CreateuseraccountComponent', () => {
  let component: CreateuseraccountComponent;
  let fixture: ComponentFixture<CreateuseraccountComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateuseraccountComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateuseraccountComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
