import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormAutoComponent } from './form-auto.component';

describe('FormAutoComponent', () => {
  let component: FormAutoComponent;
  let fixture: ComponentFixture<FormAutoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormAutoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FormAutoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
