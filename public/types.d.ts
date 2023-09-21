import { RGBAData } from "jspdf";
import { jsPDFOptions } from "jspdf";

export type Margins = number | [number, number] | [number, number, number, number];

export type LTRB = 'l' | 't' | 'r' | 'b'

export interface Options extends Omit<jsPDFOptions, 'unit'> {
    margins?: Margins
}


type Box = Record<'x' | 'y' | 'w', number>;

export type Align = 'left' | 'center' | 'right';

type TableRow = TableCell[]
type TableCell = Content

export interface Style {
    textColor?: string | number | [number, number, number, number?];
    font?: string,
    fontStyle?: string,
    fontSize?: number
}

export interface ContentBase {
    m?: number
    ml?: number
    mt?: number
    mr?: number
    mb?: number
    align?: Align

    style?: Style
}

export interface ContentGroup extends ContentBase {
    el?: 'group',
    content: Content
}


export interface ContentLine extends ContentBase {
    el: 'line',
    dashing?: number[]
    dashPhase?: number
    lineWidth?: number
    fullWidth?: boolean
}

export interface ContentPageBreak extends ContentBase {
    el: 'page'
    format?: jsPDFOptions['format']
    orientation?: jsPDFOptions['orientation']
}
export interface ContentText extends ContentBase {
    el: 'text'
    text: string
}

export interface ContentTable extends ContentBase {
    el: 'table'
    headerRows?: number
    widths: (number | '*')[] | '*' | number
    rows: TableRow[]
    layout?: {
        p?: number
        borders?: boolean,
        hLineFn?(no: number): number | boolean
        vLineFn?(no: number): number | boolean
    }
}

export interface ContentImage extends ContentBase {
    el: 'image',
    imageData: | string
    | HTMLImageElement
    | HTMLCanvasElement
    | Uint8Array
    alias?: string

    fit?: 'contain' | 'stretch'
    w?: number
    h?: number
}

export type ContentType =
    ContentGroup |
    ContentLine |
    ContentPageBreak |
    ContentText |
    ContentTable |
    ContentImage

export type Content = false | 0 | null | undefined | string | Content[] |
    (ContentType & ContentBase);


declare module 'jspdf' {
    interface jsPDF {

        margins: Margins;

        getMt(): number
        getMb(): number
        getMl(): number
        getMr(): number

        withStyle<T>(cb: () => T, $?: Style): T;

        generate(content: Content, autoHeight?: boolean): jsPDF;
        drawFromContent(content: Content): jsPDF;
        calculateContentHeight(content: Content, maxWidth?: number): number;
        deleteAllPages(): jsPDF;


    }
}
