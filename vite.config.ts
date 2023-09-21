import { BuildOptions, UserConfig, UserConfigExport } from "vite";

export default {
    build:{
        lib: {
            fileName: 'main',
            entry: './src/main.ts',
            formats: ['es', 'umd'],
            name: 'JsPdfExtended'
        },
        minify: true,
        rollupOptions:{
            external: ['jspdf'],
            output: {
                globals:{
                    'jspdf': 'jspdf'
                }
            }
        }
    },
    resolve:{
        alias: {
            '@': ''
        }
    }
    
    
} satisfies UserConfigExport;