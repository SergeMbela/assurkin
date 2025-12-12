import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EpargnePensionComponent } from './epargne-pension.component';

describe('EpargnePensionComponent', () => {
  let component: EpargnePensionComponent;
  let fixture: ComponentFixture<EpargnePensionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EpargnePensionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EpargnePensionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
