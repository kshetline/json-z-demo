import { AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { addResizeListener, removeResizeListener } from 'detect-resize';
import { debounce } from 'lodash';

@Component({
  selector: 'ks-shrink-wrap',
  templateUrl: './shrink-wrap.component.html',
  styleUrls: ['./shrink-wrap.component.scss']
})
export class ShrinkWrapComponent implements AfterViewInit, OnDestroy, OnInit {
  private inner: HTMLDivElement;
  private sizer: HTMLDivElement;
  private lastWidth = 0;
  private lastHeight = 0;
  private lastSizerWidth = 0;
  private thresholdWidth: number;

  innerStyle = {};
  marginX = 0;
  marginY = 0;
  scale = 1;

  @ViewChild('inner', { static: true }) innerRef: ElementRef;
  @ViewChild('sizer', { static: true }) sizerRef: ElementRef;

  @Input() boundingElement: string | HTMLElement = document.documentElement;
  @Input() minScale = 0.75;

  constructor() { }

  ngOnInit(): void {
    this.inner = this.innerRef.nativeElement;
    this.sizer = this.sizerRef.nativeElement;

    addResizeListener(this.inner, this.onResize);
    addResizeListener(this.sizer, this.onResize);

    this.onResize();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.onResize());
  }

  ngOnDestroy(): void {
    removeResizeListener(this.sizer, this.onResize);
    removeResizeListener(this.inner, this.onResize);
  }

  onResize = debounce((): void => {
    const innerWidth = this.inner.getBoundingClientRect().width;
    const innerHeight = this.inner.getBoundingClientRect().height;
    const sizerWidth = Math.min(this.sizer.getBoundingClientRect().width, this.getBoundingWidth());
    const sizerHeight = sizerWidth * innerHeight / innerWidth;

    if (Math.abs(sizerWidth - this.lastSizerWidth) <= 1 &&
        Math.abs(innerWidth - this.lastWidth) <= 2 &&
        Math.abs(innerHeight - this.lastHeight) <= 2) {
      return;
    }

    const oldScale = this.scale;
    const oldMx = this.marginX;
    const oldMy = this.marginX;
    let scalingWidth = innerWidth;

    if (!this.thresholdWidth && scalingWidth > sizerWidth)
      this.thresholdWidth = scalingWidth;
    else if (this.thresholdWidth) {
      scalingWidth = this.thresholdWidth;
    }

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
  }, 50);

  getBoundingWidth(): number {
    let elem = (typeof this.boundingElement === 'string' ? document.getElementById(this.boundingElement) : this.boundingElement);

    if (!elem)
      elem = document.documentElement;

    const width = elem.clientWidth;
    const style = window.getComputedStyle(elem === document.documentElement ? document.body : elem, null);
    const margin = parseFloat(style.getPropertyValue('margin-left') || '0') +
                   parseFloat(style.getPropertyValue('margin-right') || '0') +
                   parseFloat(style.getPropertyValue('border-left-width') || '0') +
                   parseFloat(style.getPropertyValue('border-right-width') || '0');

    return width - margin;
  }
}
