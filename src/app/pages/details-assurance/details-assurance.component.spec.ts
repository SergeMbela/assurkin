import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetailsAssuranceComponent } from './details-assurance.component';

describe('DetailsAssuranceComponent', () => {
  let component: DetailsAssuranceComponent;
  let fixture: ComponentFixture<DetailsAssuranceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetailsAssuranceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DetailsAssuranceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
