# Jspdf Autoprint

plugin created for auto generated content.

inspired from pdf-make.

## Futures
- styling
- tables
- paragraphs
- images
- arabic support
- auto page height

## Installation

```bash
    npm i -D jspdf jspdf-autocontent
```

Or use umd bundle

todo : upload to cdn

## Usage

### Apply plugin

```javascript

    import { jsPdf } from 'jspdf'

    // will auto add plugin.
    import 'jspdf-autocontent'
    
    // if not work
    import { applyPlugin } from 'jspdf-autocontent'
    applyPlugin(jsPdf);
```


### Create some content

```javascript

    /**
     * refer to dist/types.d.ts
     */
    const pdf = new jsPdf({
        unit: 'pt' // only use pt will be fixed
    })
    pdf.generate(/* Content */  [
        // string
        'Title 1',
        
        // group
        {
            el: 'group' // optional for group
            content: 'content'
        },

        {
            el: 'line',
            dashing: [/* dash */ 0.1, /* gap */ 0.1],
            dashPhase: 0,
            lineWidth: 0.1,
        },

        {
            el: 'table',
            style: {
                fontSize: 12
            },
            widths: '*',
            rows: [
                ['Header 1', 'Header 2'],
                ['Data 1', 'Data 2']
            ]
        },

        {
            el: 'text',
            style: {
                textColor: 'red'
            }
        },

        {
            style: {
                font: 'Arial',
                fontStyle: 'bold'
            },
            content: [
                'some styled text',
                {
                    el: 'image',
                    imageData: 'https://....',
                    alias: 'img-1'
                }
            ]
        },
    ], /* auto height default=false */ false);

```


# TODO

- Add more content types.
- Fix add mutiple unit support.
- Add docs.
- Add demo.
- Add more todo :)

