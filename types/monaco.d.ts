import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import type {languages} from 'monaco-editor/esm/vs/editor/editor.api';
monaco.languages.setTokensProvider
declare global {
    interface Window {
        monaco?: typeof monaco; 
    }
}