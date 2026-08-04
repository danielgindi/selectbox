// Ambient module declarations for dependencies that don't ship their own types yet.
// These packages are plain JS (same author's other libraries) - treat their exports as `any`
// until they get their own TypeScript migration. This keeps our own code checked without us
// having to author full third-party type definitions here.
declare module '@danielgindi/dom-utils/lib/Dom';
declare module '@danielgindi/dom-utils/lib/DomCompat';
declare module '@danielgindi/dom-utils/lib/Css';
declare module '@danielgindi/dom-utils/lib/DomEventsSink';
declare module '@danielgindi/virtual-list-helper';
