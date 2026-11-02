import { page } from 'vitest/browser';
import { DropList, SelectBox } from '../../src/lib/index';
import type { DropListOptions, SelectBoxOptions } from '../../src/lib/index';

const instances: Array<{ destroy(): void }> = [];

export function cleanup() {
    while (instances.length)
        instances.pop().destroy();
    document.body.innerHTML = '';
}

export const fruits = [
    { label: 'Banana', value: 'banana' },
    { label: 'Apple', value: 'apple' },
    { label: 'Cherry', value: 'cherry' },
    { label: 'Date', value: 'date' },
];

/** Creates a SelectBox attached to the document; destroyed automatically after each test. */
export function mountSelectBox(options: SelectBoxOptions = {}) {
    const selectBox = new SelectBox({ filterThrottleWindow: 0, ...options });
    instances.push(selectBox);
    document.body.append(selectBox.el);

    const input = selectBox.el.querySelector<HTMLInputElement>('.selectbox__search_field');
    return { selectBox, el: selectBox.el, input };
}

/** Creates a button for a standalone DropList to anchor to. */
export function createAnchor() {
    const anchor = document.createElement('button');
    anchor.textContent = 'Menu';
    document.body.append(anchor);
    return anchor;
}

/**
 * Creates a standalone DropList, positioned under an anchor like real menus are
 * (an unpositioned list stays off-screen). Destroyed automatically after each test.
 */
export function createDropList(options: DropListOptions = {}) {
    const anchor = createAnchor();
    const dropList = new DropList({
        filterThrottleWindow: 0,
        positionOptionsProvider: () => ({
            target: anchor,
            anchor: { x: 'start', y: 'bottom' },
            position: { x: 'start', y: 'top' },
        }),
        ...options,
    });
    instances.push(dropList);
    return dropList;
}

/** The visible option elements of every open list (excludes the hidden measuring element). */
export function listItemEls(): HTMLElement[] {
    return Array.from(document.querySelectorAll<HTMLElement>('.droplist__item:not([aria-hidden])'));
}

export const listLabels = () => listItemEls().map(el => el.textContent.trim());

export const option = (name: string) => page.getByRole('menuitem', { name, exact: true });

/** Labels of the selected "chips" in multi mode. */
export const chipLabels = (el: HTMLElement) =>
    Array.from(el.querySelectorAll('.selectbox__item')).map(x => x.textContent.trim());

/** Lets the SelectBox flush its batched (setTimeout-scheduled) render. */
export const nextTick = () => new Promise(resolve => setTimeout(resolve));
