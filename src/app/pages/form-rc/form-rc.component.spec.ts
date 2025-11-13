import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormRcComponent } from './form-rc.component';

describe('FormRcComponent', () => {
  let component: FormRcComponent;
  let fixture: ComponentFixture<FormRcComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormRcComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FormRcComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
