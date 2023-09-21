import { jsPDF } from 'jspdf';
import { Align, Box, Content, ContentBase, ContentGroup, ContentTable, ContentText, TableRow } from '@/public/types';
const EP = 0.000001;


function cmp(a: number, b: number) {

  const res = a - b;
  if (Math.abs(res) < EP) {
    return 0;
  }
  else return res;
}

function xFromAlign(box: Omit<Box, 'y'>, align: Align): number {
  switch (align) {
    case 'left':
      return box.x
    case 'center':
      return box.x + box.w / 2
    case 'right':
      return box.x + box.w
  }
};

function tableWidths(ct: ContentTable, maxW: number): number[] {
  let widths: number[];
  if (Array.isArray(ct.widths)) {
    const colStats = ct.widths.reduce((stat, col) => {
      if (col == '*') {
        stat.dynamicCount++;
      }
      else {
        stat.staticTotal += col;
      }
      return stat;
    }, { dynamicCount: 0, staticTotal: 0 });
    const dynamicWidth = (maxW - colStats.staticTotal) / colStats.dynamicCount;
    widths = ct.widths.map(wid => wid == '*' ? dynamicWidth : wid);
  } else {
    const maxColsCount = ct.rows.reduce((max, row) => {
      return Math.max(max, row.length);
    }, 0);
    if (ct.widths == '*') {
      const dynamicWidth = maxW / maxColsCount;
      widths = new Array(maxColsCount).fill(dynamicWidth);
    } else {
      widths = new Array(maxColsCount).fill(ct.widths);
    }
  }

  return widths;
}




export function applyPlugin(jspdf: jsPDF) {

  jspdf.withStyle = function withStyle(cb, $ = {}) {
    const oldFont = this.getFont();
    const oldFontSize = this.getFontSize();
    const oldTextColor = this.getTextColor();


    if ($.fontSize) {
      this.setFontSize($.fontSize)
    }

    if ($.font || $.fontStyle) {
      this.setFont($.font ?? oldFont.fontName, $.fontStyle);
    }

    if ($.textColor != null) {
      if (Array.isArray($.textColor)) {
        this.setTextColor(...$.textColor);
      }
      else {
        this.setTextColor($.textColor as any);
      }
    }

    const ret = cb();

    if ($.fontSize) {
      this.setFontSize(oldFontSize);
    }

    if ($.font || $.fontStyle) {
      this.setFont(oldFont.fontName, oldFont.fontStyle);
    }
    if ($.textColor != null) {
      this.setTextColor(oldTextColor)
    }

    return ret;
  }

  jspdf.drawFromContent = function drawFromContent(content: Content) {


    let oldScale = this.internal.scaleFactor;
    this.internal.scaleFactor = 1;
    /**
     * @returns last y position
     */
    const $ = (ct: Content, box: Box, defaults: ContentBase = {}): number => {
      let yPos = box.y;
      if (Array.isArray(ct)) {
        return ct.reduce((t, $ct) => {
          return $($ct, {
            ...box,
            y: t // top
          }, defaults);
        }, yPos);
      }

      if (!ct) {
        return 0;
      }

      if (typeof ct == 'string') {
        ct = {
          el: 'text',
          text: ct
        } satisfies ContentText;
      }
      ct = {
        ...defaults,
        ...ct
      }
      let {
        ml = ct.ml ?? ct.m ?? 0,
        mt = ct.mt ?? ct.m ?? 0,
        mr = ct.mr ?? ct.m ?? 0,
        mb = ct.mb ?? ct.m ?? 0,
        align = 'left'
      } = ct;

      let w = box.w - ml - mr;
      let x = box.x + ml;

      if (ct.el == null) {
        ct.el = 'group';
      }

      yPos += mt;

      return this.withStyle(() => {
        if (Array.isArray(ct) || typeof ct == 'string' || !ct) {
          throw "types error"
        }
        switch (ct.el) {

          case 'group': {
            let def: Partial<ContentGroup> = {};
            def.align = ct.align;
            yPos = $(ct.content, {
              x,
              y: box.y + mt,
              w
            }, def);
            break
          }
          case 'page': {
            mb = 0;
            this.addPage(ct.format, ct.orientation);
            yPos = this.getMt();
            break
          }
          case 'line': {
            const oldLineWidth = this.getLineWidth();
            if (ct.dashing || ct.dashPhase != null) {
              this.setLineDashPattern(ct.dashing ?? [], ct.dashPhase ?? 0);
            }
            if (ct.lineWidth != null) {
              this.setLineWidth(ct.lineWidth);
            }
            const y = yPos + this.getLineWidth() / 2;
            this.line(box.x, y, box.x + box.w, y);
            if (ct.dashing || ct.dashPhase != null) {
              this.setLineDashPattern([], 0);
            }
            if (ct.lineWidth != null) {
              this.setLineWidth(oldLineWidth);
            }
            break
          }
          case 'text': {
            const textLines = this.splitTextToSize(this.processArabic(ct.text), w, {
            }) as string[];
            yPos = textLines.reduce((yPos, line) => {
              if (cmp(yPos + this.getLineHeight(), this.internal.pageSize.height - this.getMb()) > 0) {
                yPos = this.getMt();
                this.addPage();
              }
              this.text(line, xFromAlign({ x, w }, align), yPos, {
                baseline: 'hanging',
                align: align,
              });
              yPos += this.getLineHeight();
              return yPos;
            }, box.y);
            break;
          }
          case 'table': {

            let defaultLineWidth = this.getLineWidth();
            const {
              layout: {
                borders = true,
                p = 2,
                hLineFn = () => defaultLineWidth,
                vLineFn = () => defaultLineWidth
              } = {}
            } = ct;

            let widths: number[] = tableWidths(ct, w);

            const xMax = widths.reduce((sum, wid) => sum + wid, x);

            const drawHLine = (yPos: number, no: number) => {
              if (borders) {
                let lineWid = hLineFn(no);
                if (lineWid === true) {
                  lineWid = defaultLineWidth;
                }
                else if (lineWid) {
                  let y = yPos - lineWid / 2;
                  this.line(x, y, xMax, y);
                }
              }
            }

            const drawVLines = (yPos: number, h: number) => {
              widths.concat(0).reduce((xPos, wid, ix) => {
                let lineWid = vLineFn(ix);
                if (lineWid === true) {
                  lineWid = defaultLineWidth;
                }
                else if (lineWid) {
                  let x = xPos - lineWid / 2;
                  this.line(x, yPos, x, yPos + h);
                }
                return xPos + wid;
              }, x);
            }

            ct.rows.forEach((row, index) => {
              const rowHeight = row.reduce((height: number, cell, cellIndex) => {
                let h = this.calculateContentHeight(cell, widths[cellIndex] - 2 * p);
                return Math.max(height, h + p * 2);
              }, 0);

              // closed upper
              borders && drawHLine(yPos, index);

              if (cmp(yPos + rowHeight, this.internal.pageSize.height - this.getMb()) > 0) {
                yPos = this.getMt()
                this.addPage();
                borders && drawHLine(yPos, index);
              }

              borders && drawVLines(yPos, rowHeight);

              //draw content
              row.reduce((x: number, cell, cellIndex) => {
                $({
                  content: cell,
                  m: p
                }, {
                  x,
                  y: yPos,
                  w: widths[cellIndex]
                }, defaults);
                return x + widths[cellIndex];
              }, x);

              yPos += rowHeight;
              return yPos;
            });
            //draw last H line
            drawHLine(yPos, ct.rows.length);
            yPos += p;
            break;
          }
          case 'image': {
            const props = this.getImageProperties(ct.imageData);
            const imageAspect = props.height / props.width;
            let {
              h: hFit,
              w: wFit
            } = ct;

            if (hFit == null && wFit == null) {
              wFit = props.width
              hFit = props.height;
            }
            if (wFit == null) {
              wFit = hFit! / imageAspect;
            }
            if (hFit == null) {
              hFit = imageAspect * wFit;
            }
            if ((ct.fit??'contain') == 'contain') {
              if (hFit / wFit > imageAspect) {
                hFit = imageAspect * wFit
              } else {
                wFit = hFit / imageAspect;
              }
            }

            if (cmp(yPos + hFit, this.internal.pageSize.height - this.getMb()) > 0) {
              yPos = this.getMt();
              this.addPage();
            }

            let x: number = box.x + ml;
            let wMax = box.w - ml - mr;

            switch (ct.align) {
              case 'center':
                x += wMax / 2 - wFit / 2;
                break;
              case 'right':
                x += wMax - wFit;
            }
            this.addImage(ct.imageData, props.fileType, x, yPos, wFit, hFit, ct.alias);
            yPos += hFit;
            break;
          }
        }
        yPos += mb;
        return yPos;
      }, ct.style ?? {})
    };
    $(content, {
      y: this.getMt(),
      x: this.getMl(),
      w: this.internal.pageSize.width - this.getMl() - this.getMr()
    });
    this.internal.scaleFactor = oldScale;
    return this;
  }

  jspdf.calculateContentHeight = function calculateContentHeight(content: Content, maxWidth) {
    if (maxWidth == undefined) {
      maxWidth = this.internal.pageSize.width - this.getMl() - this.getMr();
    }

    const $ = (ct: Content, w: number, defaults: ContentBase = {}): number => {
      if (Array.isArray(ct)) {
        return ct.reduce((h: number, $ct) => (h + $($ct, w, defaults)), 0);
      }

      if (!ct) {
        return 0;
      }

      if (typeof ct == 'string') {
        ct = {
          el: 'text',
          text: ct
        } satisfies ContentText
      }

      return this.withStyle(() => {
        if (Array.isArray(ct) || typeof ct == 'string' || !ct) {
          throw 'error types'
        }
        let h = 0;
        let {
          ml = ct.ml ?? ct.m ?? 0,
          mt = ct.mt ?? ct.m ?? 0,
          mr = ct.mr ?? ct.m ?? 0,
          mb = ct.mb ?? ct.m ?? 0
        } = ct;

        let maxW = w - mr - ml;

        if (ct.el == null) {
          ct.el = 'group';
        }

        switch (ct.el) {
          case 'group': {
            h = $(ct.content, maxW);
            break
          }
          case 'page':
            mb = 0;
            break;
          case 'text':
            h = this.splitTextToSize(this.processArabic(ct.text), maxW).length * this.getLineHeight();
            break;
          case 'table': {
            const widths = tableWidths(ct, w);
            let {
              layout: {
                p = 2
              } = {}
            } = ct;
            h = ct.rows.reduce((h, row: TableRow) => {
              return h + row.reduce((maxH: number, cell, cellIndex) => Math.max(maxH, $({
                content: cell,
                m: p
              }, widths[cellIndex])), 0)
            }, 0) + p;
            break;
          }
          case 'image': {
            const props = this.getImageProperties(ct.imageData);
            const imageAspect = props.height / props.width;
            let {
              h: hFit,
              w: wFit
            } = ct;


            if (hFit == null && wFit == null) {
              wFit = props.width
              hFit = props.height;
            }
            if (wFit == null) {
              wFit = hFit! / imageAspect;
            }
            if (hFit == null) {
              hFit = imageAspect * wFit;
            }
            if (ct.fit == 'contain') {
              if (hFit / wFit > imageAspect) {
                hFit = imageAspect * wFit
              } else {
                wFit = imageAspect / hFit;
              }
            }

            h = hFit;
          }

        }
        return h + mb + mt;
      }, ct.style);

    }
    return $(content, maxWidth);
  }
  jspdf.generate = function generate(content: Content, autoHeight = false) {
    if (autoHeight) {
      const width = this.internal.pageSize.width;
      let height = this.calculateContentHeight(content);
      height += this.getMt() + this.getMb()
      console.debug('calculated content height %f', height);
      this.deleteAllPages();
      this.addPage([width, height], width > height ? 'l' : 'p');
    }
    this.drawFromContent(content);

    return this;
  }

  jspdf.deleteAllPages = function deleteAllPages() {
    while (this.getNumberOfPages() > 0) {
      this.deletePage(1);
    }
    return this;
  }

  jspdf.margins = 8;

  jspdf.getMt = function getMt() {
    return typeof this.margins == 'number' ? this.margins :
      this.margins.length == 2 ? this.margins[1] : this.margins[1]
  };
  jspdf.getMb = function getMb() {
    return typeof this.margins == 'number' ? this.margins :
      this.margins.length == 2 ? this.margins[1] : this.margins[3]
  };
  jspdf.getMl = function getMl() {
    return typeof this.margins == 'number' ? this.margins :
      this.margins.length == 2 ? this.margins[0] : this.margins[0]
  };
  jspdf.getMr = function getMr() {
    return typeof this.margins == 'number' ? this.margins :
      this.margins.length == 2 ? this.margins[0] : this.margins[2]
  };
}
applyPlugin(jsPDF.API as any);
