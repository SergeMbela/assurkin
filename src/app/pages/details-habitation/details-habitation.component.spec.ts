import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetailsHabitationComponent } from './details-habitation.component';

describe('DetailsHabitationComponent', () => {
  let component: DetailsHabitationComponent;
  let fixture: ComponentFixture<DetailsHabitationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetailsHabitationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DetailsHabitationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
