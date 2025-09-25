'use client';

import { Editor } from '@monaco-editor/react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useTheme } from '@/components/ThemeRegistry';

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: string;
  theme?: 'light' | 'dark';
  readOnly?: boolean;
  height?: string | number;
  width?: string | number;
  options?: any;
}

export function CodeEditor({
  value,
  onChange,
  language = 'typescript',
  theme,
  readOnly = false,
  height = '400px',
  width = '100%',
  options = {},
}: CodeEditorProps) {
  const { actualMode } = useTheme();
  const editorTheme = theme || actualMode;

  const defaultOptions = {
    minimap: { enabled: false },
    fontSize: 14,
    lineNumbers: 'on',
    roundedSelection: false,
    scrollBeyondLastLine: false,
    readOnly,
    automaticLayout: true,
    tabSize: 2,
    wordWrap: 'on',
    folding: true,
    lineDecorationsWidth: 10,
    lineNumbersMinChars: 3,
    glyphMargin: false,
    ...options,
  };

  const handleEditorChange = (newValue: string | undefined) => {
    if (onChange && newValue !== undefined) {
      onChange(newValue);
    }
  };

  return (
    <Box 
      sx={{ 
        height,
        width,
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        overflow: 'hidden',
      }}
    >
      <Editor
        height={height}
        width={width}
        language={language}
        theme={editorTheme === 'dark' ? 'vs-dark' : 'light'}
        value={value}
        onChange={handleEditorChange}
        options={defaultOptions}
        loading={
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              height: '100%',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">
              Loading editor...
            </Typography>
          </Box>
        }
        onMount={(editor, monaco) => {
          // Configure TypeScript compiler options
          monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
            target: monaco.languages.typescript.ScriptTarget.ES2020,
            allowNonTsExtensions: true,
            moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
            module: monaco.languages.typescript.ModuleKind.CommonJS,
            noEmit: true,
            esModuleInterop: true,
            jsx: monaco.languages.typescript.JsxEmit.React,
            reactNamespace: 'React',
            allowJs: true,
            typeRoots: ['node_modules/@types'],
          });

          // Add React and MUI type definitions
          monaco.languages.typescript.typescriptDefaults.addExtraLib(
            `
            declare module 'react' {
              export = React;
              export as namespace React;
              namespace React {
                interface FC<P = {}> {
                  (props: P & { children?: ReactNode }): ReactElement | null;
                }
                type ReactNode = ReactChild | ReactFragment | ReactPortal | boolean | null | undefined;
                type ReactElement = any;
                type ReactChild = any;
                type ReactFragment = any;
                type ReactPortal = any;
              }
            }
            `,
            'file:///node_modules/@types/react/index.d.ts'
          );

          // Focus editor
          editor.focus();
        }}
      />
    </Box>
  );
}
