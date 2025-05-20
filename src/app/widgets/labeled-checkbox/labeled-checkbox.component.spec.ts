import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LabeledCheckboxComponent } from './labeled-checkbox.component';

describe('LabeledCheckboxComponent', () => {
  let component: LabeledCheckboxComponent;
  let fixture: ComponentFixture<LabeledCheckboxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LabeledCheckboxComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(LabeledCheckboxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
