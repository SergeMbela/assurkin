import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssuranceVoyageComponent } from './assurance-voyage.component';

describe('AssuranceVoyageComponent', () => {
  let component: AssuranceVoyageComponent;
  let fixture: ComponentFixture<AssuranceVoyageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssuranceVoyageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssuranceVoyageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
