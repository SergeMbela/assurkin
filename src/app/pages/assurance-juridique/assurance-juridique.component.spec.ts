import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssuranceJuridiqueComponent } from './assurance-juridique.component';

describe('AssuranceJuridiqueComponent', () => {
  let component: AssuranceJuridiqueComponent;
  let fixture: ComponentFixture<AssuranceJuridiqueComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssuranceJuridiqueComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssuranceJuridiqueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
