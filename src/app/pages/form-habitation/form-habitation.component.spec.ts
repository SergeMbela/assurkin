import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormHabitationComponent } from './form-habitation.component';

describe('FormHabitationComponent', () => {
  let component: FormHabitationComponent;
  let fixture: ComponentFixture<FormHabitationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormHabitationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FormHabitationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
