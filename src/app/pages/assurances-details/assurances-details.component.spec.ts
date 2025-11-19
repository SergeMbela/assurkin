import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssurancesDetailsComponent } from './assurances-details.component';

describe('AssurancesDetailsComponent', () => {
  let component: AssurancesDetailsComponent;
  let fixture: ComponentFixture<AssurancesDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssurancesDetailsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssurancesDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
