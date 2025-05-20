import { Component, EventEmitter, forwardRef, Input, Output } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Checkbox, CheckboxChangeEvent } from 'primeng/checkbox';

let jzCheckboxAutoId = 0;

@Component({
    selector: 'jz-checkbox',
    imports: [Checkbox, FormsModule],
    templateUrl: './labeled-checkbox.component.html',
    styleUrl: './labeled-checkbox.component.scss',
    providers: [{
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => LabeledCheckboxComponent),
            multi: true
        }]
})
export class LabeledCheckboxComponent implements ControlValueAccessor {
  autoId = `jz-checkbox-${jzCheckboxAutoId++}`;
  ngOnChange: (value: boolean) => void = () => {};
  ngTouched: () => void = () => {};
  value: boolean;

  @Input() binary: any = true;
  @Input() label: string;
  @Input() disabled: boolean;

  @Output() onChange = new EventEmitter<CheckboxChangeEvent>();

  writeValue(value: boolean): void {
    this.value = value;
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.ngOnChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.ngTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onInputChange(value: CheckboxChangeEvent) {
    this.value = value.checked;
    this.ngOnChange(this.value);
    this.onChange.emit(value);
  }
}
