import { AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { addResizeListener, removeResizeListener } from 'detect-resize';
import { debounce } from 'lodash';

@Component({
  selector: 'ks-shrink-wrap',
  templateUrl: './shrink-wrap.component.html',
  styleUrls: ['./shrink-wrap.component.scss']
})
export class ShrinkWrapComponent implements AfterViewInit, OnDestroy, OnInit {
  private outer: HTMLDivElement;
  private sizer: HTMLDivElement;
  private lastWidth = 0;
  private lastHeight = 0;
  private lastSizerWidth = 0;
  private thresholdWidth: number;

  innerStyle = {};
  marginX = 0;
  marginY = 0;
  scale = 1;

  @ViewChild('outer', { static: true }) outerRef: ElementRef;
  @ViewChild('sizer', { static: true }) sizerRef: ElementRef;

  @Input() boundingElement: string | HTMLElement = document.documentElement;
  @Input() minScale = 0.75;

  constructor() { }

  ngOnInit(): void {
    this.outer = this.outerRef.nativeElement;
    this.sizer = this.sizerRef.nativeElement;

    addResizeListener(this.outer, this.onResize);
    addResizeListener(this.sizer, this.onResize);

    this.onResize();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.onResize());
  }

  ngOnDestroy(): void {
    removeResizeListener(this.sizer, this.onResize);
    removeResizeListener(this.outer, this.onResize);
  }

  onResize = debounce((): void => {
    const outerWidth = this.outer.getBoundingClientRect().width;
    const outerHeight = this.outer.getBoundingClientRect().height;
    const sizerWidth = Math.min(this.sizer.getBoundingClientRect().width, this.getBoundingWidth());
    const sizerHeight = sizerWidth * outerHeight / outerWidth;

    if (Math.abs(sizerWidth - this.lastSizerWidth) <= 1 &&
        Math.abs(outerWidth - this.lastWidth) <= 2 &&
        Math.abs(outerHeight - this.lastHeight) <= 2) {
      return;
    }

    const oldScale = this.scale;
    let scalingWidth = outerWidth;

    if (!this.thresholdWidth && scalingWidth > sizerWidth)
      this.thresholdWidth = scalingWidth;
    else if (this.thresholdWidth)
      scalingWidth = this.thresholdWidth;

    this.scale = Math.min(Math.max(sizerWidth / scalingWidth, this.minScale), 1);

    if (this.scale === this.minScale && oldScale === this.minScale)
      return;

    this.marginX = this.scale === 1 ? 0 : Math.ceil((sizerWidth - outerWidth / this.scale) / 2);
    this.marginY = this.scale === 1 ? 0 : Math.ceil((sizerHeight - outerHeight / this.scale) / 2);

    this.lastWidth = outerWidth;
    this.lastHeight = outerHeight;
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

    console.log('width:', width - margin);
    return width - margin;
  }
}
