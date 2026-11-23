import { createElement as createDomElement } from '@danielgindi/dom-utils/lib/Dom';

/** The upstream helper creates HTML elements for HTML tag names. */
export const createElement = createDomElement as <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    attrs?: Record<string, unknown>,
    children?: Node | Node[],
) => HTMLElementTagNameMap[K];
