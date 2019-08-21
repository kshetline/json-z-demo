import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { addResizeListener, removeResizeListener } from 'detect-resize';
import { debounce } from 'lodash';

const docElem = document.documentElement;
const DEFAULT_MIN = 0.75;

@Component({
  selector: 'ks-shrink-wrap',
  templateUrl: './shrink-wrap.component.html',
  styleUrls: ['./shrink-wrap.component.scss']
})
export class ShrinkWrapComponent implements AfterViewInit, OnDestroy, OnInit {
  private afterInit = false;
  private _boundingElement: HTMLElement = docElem;
  private _minScale = DEFAULT_MIN;
  private inner: HTMLDivElement;
  private sizer: HTMLDivElement;
  private thresholdSizer: HTMLDivElement;
  private lastWidth = 0;
  private lastHeight = 0;
  private lastSizerWidth = 0;
  private thresholdWidth: number;

  innerStyle = {};
  marginX = 0;
  marginY = 0;
  scale = 1;
  thresholdStyle: any = {};

  @ViewChild('inner', { static: true }) innerRef: ElementRef;
  @ViewChild('sizer', { static: true }) sizerRef: ElementRef;
  @ViewChild('thresholdSizer', { static: true }) thresholdSizerRef: ElementRef;

  @Input() get minScale(): number { return this._minScale; }
  set minScale(newValue: number) {
    if (typeof newValue as any === 'string') {
      const $ = /([\d.]+)(%)?/.exec(newValue as any as string);

      if ($) {
        newValue = Number($[1]);

        if ($[2])
          newValue /= 100;
      }
    }

    if (isNaN(newValue) || !newValue)
      this._minScale = DEFAULT_MIN;
    else
      this._minScale = Math.min(Math.max(newValue, 0.01), 1);
  }

  @Input() set boundingElement(newValue: string | HTMLElement) {
    if (!newValue)
      newValue = docElem;
    else if (typeof newValue === 'string')
      newValue = document.getElementById(newValue);

    if (this._boundingElement !== newValue) {
      this.removeResizeListener(this._boundingElement);
      this._boundingElement = newValue;
      this.addResizeListener(this._boundingElement);

      if (this.afterInit)
        setTimeout(() => this.onResize());
    }
  }

  @Input() set threshold(newValue: number | string) {
    let changed = false;

    if (typeof newValue === 'number' || !isNaN(Number(newValue))) {
      newValue = Number(newValue);

      if (this.thresholdWidth !== newValue) {
        this.thresholdWidth = newValue;
        this.thresholdStyle = {};
        changed = true;
      }
    }
    else if (this.thresholdStyle.width !== newValue) {
      this.thresholdStyle = { width: newValue };
      this.thresholdWidth = undefined;
      changed = true;
    }

    if (changed) {
      this.lastSizerWidth = 0;

      if (this.afterInit)
        setTimeout(() => this.onResize());
    }
  }

  @Output() scaleChange = new EventEmitter<number>();

  onResize = debounce((): void => {
    const innerWidth = this.inner.getBoundingClientRect().width;
    const innerHeight = this.inner.getBoundingClientRect().height;
    const sizerWidth = Math.min(this.sizer.getBoundingClientRect().width, this.getBoundingWidth());
    const sizerHeight = sizerWidth * innerHeight / innerWidth;

    if (Math.abs(sizerWidth - this.lastSizerWidth) <= 1 &&
        Math.abs(innerWidth - this.lastWidth) <= 1 &&
        Math.abs(innerHeight - this.lastHeight) <= 1) {
      return;
    }

    const oldScale = this.scale;
    const oldMx = this.marginX;
    const oldMy = this.marginX;
    let scalingWidth = innerWidth;

    if (this.thresholdStyle.width)
      scalingWidth = this.thresholdSizer.getBoundingClientRect().width;
    else if (!this.thresholdWidth && scalingWidth > sizerWidth)
      this.thresholdWidth = scalingWidth;
    else if (this.thresholdWidth)
      scalingWidth = this.thresholdWidth;

    this.scale = Math.min(Math.max(sizerWidth / scalingWidth, this.minScale), 1);
    this.marginX = this.scale === 1 ? 0 : Math.ceil((sizerWidth - innerWidth / this.scale) / 2);
    this.marginY = this.scale === 1 ? 0 : Math.ceil((sizerHeight - innerHeight / this.scale) / 2);

    if (this.scale === this.minScale && oldScale === this.minScale) {
      this.marginX = Math.max(this.marginX, oldMx);
      this.marginY = Math.max(this.marginY, oldMy);
    }

    this.lastWidth = innerWidth;
    this.lastHeight = innerHeight;
    this.lastSizerWidth = sizerWidth;

    if (this.scale === 1)
      this.innerStyle = {};
    else
      this.innerStyle = { transform: `scale(${this.scale})`, margin: `${this.marginY}px ${this.marginX}px` };

    this.scaleChange.emit(this.scale);
  }, 10);

  constructor() { }

  ngOnInit(): void {
    this.inner = this.innerRef.nativeElement;
    this.sizer = this.sizerRef.nativeElement;
    this.thresholdSizer = this.thresholdSizerRef.nativeElement;

    this.addResizeListener(this.inner);
    this.addResizeListener(this.sizer);
    this.addResizeListener(this.thresholdSizer);
    this.addResizeListener(this._boundingElement);
    window.addEventListener('resize', this.onResize);
  }

  ngAfterViewInit(): void {
    this.afterInit = true;
    setTimeout(() => this.onResize());
  }

  ngOnDestroy(): void {
    this.removeResizeListener(this.inner);
    this.removeResizeListener(this.sizer);
    this.removeResizeListener(this.thresholdSizer);
    this.removeResizeListener(this._boundingElement);
    window.removeEventListener('resize', this.onResize);
  }

  getBoundingWidth(): number {
    let elem = this._boundingElement;

    let width = elem.clientWidth;
    const isDocElem = (elem === docElem);

    if (isDocElem)
      elem = document.body;

    const style = window.getComputedStyle(elem, null);
    const contentBox = style.getPropertyValue('box-sizing') === 'content-box';

    if (isDocElem)
      width -= parseFloat(style.getPropertyValue('margin-left') || '0') +
               parseFloat(style.getPropertyValue('margin-right') || '0');

    if (contentBox)
      width -= parseFloat(style.getPropertyValue('border-left-width') || '0') +
               parseFloat(style.getPropertyValue('border-right-width') || '0');

    return width;
  }

  private addResizeListener(elem): void {
    if (elem !== docElem)
      addResizeListener(elem, this.onResize);
  }

  private removeResizeListener(elem): void {
    if (elem !== docElem)
      removeResizeListener(elem, this.onResize);
  }
}
