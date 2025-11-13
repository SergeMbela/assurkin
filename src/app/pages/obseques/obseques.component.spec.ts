import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ObsequesComponent } from './obseques.component';

describe('ObsequesComponent', () => {
  let component: ObsequesComponent;
  let fixture: ComponentFixture<ObsequesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ObsequesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ObsequesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
