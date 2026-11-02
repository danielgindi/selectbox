import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { enableAutoUnmount, mount } from '@vue/test-utils';
import { defineComponent, h, onMounted, onUnmounted } from 'vue';
import { DropList, SelectBox } from '../../src/vue/index';
import { SelectBox as SelectBoxClass } from '../../src/lib/index';
import type { ItemBase } from '../../src/lib/index';
import { chipLabels, createAnchor, fruits, listItemEls, listLabels, nextTick } from './helpers';

// Slots are rendered as separate Vue trees inside the library's own elements, so
// each one must be unmounted when the library removes or reuses its element.
// `Tracked` counts the slot components that are currently mounted.
let mounted = 0;
const Tracked = defineComponent({
    props: { text: { type: String, required: true } },
    setup(props) {
        onMounted(() => mounted++);
        onUnmounted(() => mounted--);
        return () => h('span', { class: 'tracked' }, props.text);
    },
});
const tracked = (text: string) => h(Tracked, { text });

/** Every mounted slot component is in the document, and vice versa (none leaked). */
const expectNoLeakedSlots = () =>
    expect(mounted).toBe(document.querySelectorAll('.tracked').length);

const inputOf = (wrapper: { element: unknown }) => (wrapper.element as HTMLElement).querySelector('input');

const listPosition = (target: Element) => ({
    target,
    anchor: { x: 'start', y: 'bottom' },
    position: { x: 'start', y: 'top' },
});

describe('Vue slots', () => {
    enableAutoUnmount(afterEach);
    beforeEach(() => mounted = 0);

    // Known bugs: each test asserts the correct behavior and is marked `it.fails`
    // until fixed. Once a bug is fixed its test starts failing - then change it to `it`.

    describe('SelectBox', () => {
        it.fails('destroys its SelectBox (list, listeners, slots) when unmounted', async () => {
            const destroy = vi.spyOn(SelectBoxClass.prototype, 'destroy');
            const wrapper = mount(SelectBox, {
                attachTo: document.body,
                props: { items: fruits, modelValue: 'apple' },
            });

            try {
                wrapper.unmount();
                expect(destroy).toHaveBeenCalledOnce();
            } finally {
                destroy.mockRestore();
            }
        });

        it.fails('unmounts its slot components when unmounted', async () => {
            const wrapper = mount(SelectBox, {
                attachTo: document.body,
                props: { items: fruits, multi: true, modelValue: ['apple', 'cherry'] },
                slots: { 'multi-item': (item: ItemBase) => tracked(`#${item.value}`) },
            });
            await expect.poll(() => mounted).toBe(2);

            wrapper.unmount();

            expect(mounted).toBe(0);
        });

        it('single-item: replaces the rendered selection and unmounts the previous one', async () => {
            const wrapper = mount(SelectBox, {
                attachTo: document.body,
                props: { items: fruits, modelValue: 'apple' },
                slots: { 'single-item': (item: ItemBase) => tracked(`★ ${item.label}`) },
            });
            const selection = () => (wrapper.element as HTMLElement).querySelector('.selectbox__single_wrapper');

            await expect.poll(() => selection().textContent).toBe('★ Apple');

            await wrapper.setProps({ modelValue: 'date' });
            await expect.poll(() => selection().textContent).toBe('★ Date');
            expect(mounted).toBe(1);
        });

        it('multi-item: renders a chip per value and unmounts a removed chip', async () => {
            const wrapper = mount(SelectBox, {
                attachTo: document.body,
                props: { items: fruits, multi: true, modelValue: ['apple', 'cherry'] },
                slots: { 'multi-item': (item: ItemBase) => tracked(`#${item.value}`) },
            });
            const el = wrapper.element as HTMLElement;

            await expect.poll(() => chipLabels(el)).toEqual(['#apple', '#cherry']);

            await userEvent.click(el.querySelector('.selectbox__item .selectbox__item_remove'));

            await expect.poll(() => chipLabels(el)).toEqual(['#cherry']);
            expectNoLeakedSlots();
        });

        it('rest-multi-item: receives the collapsed items', async () => {
            const wrapper = mount(SelectBox, {
                attachTo: document.body,
                props: { items: fruits, multi: true, maxMultiItems: 1, modelValue: ['apple', 'banana', 'cherry'] },
                slots: {
                    'rest-multi-item': (item: ItemBase) => tracked(`and ${item.items.length - 1} more`),
                },
            });

            await expect.poll(() => chipLabels(wrapper.element as HTMLElement)).toEqual(['Apple', 'and 2 more']);
        });

        it('list-item: shows the right item in every row while a virtual list recycles them', async () => {
            const items = Array.from({ length: 1000 }, (_, i) => ({ label: `Item ${i}`, value: i }));
            const wrapper = mount(SelectBox, {
                attachTo: document.body,
                props: { items, searchable: false },
                slots: { 'list-item': (item: ItemBase) => tracked(`row ${item.value}`) },
            });

            await userEvent.click(wrapper.element as HTMLElement);
            await userEvent.keyboard('{End}');

            await expect.poll(listLabels).toContain('row 999');

            // Rows are recycled while scrolling: each one must show its own item, in order
            const rows = listLabels().map(label => Number(label.replace('row ', '')));
            expect(rows).toEqual(rows.map((_, i) => rows[0] + i));
            expect(listItemEls().length).toBeLessThan(100);
            expectNoLeakedSlots();
        });

        it.fails('no-results-item: uses a renderNoResultsItem prop changed after mount', async () => {
            const errorHandler = vi.fn();
            const wrapper = mount(SelectBox, {
                attachTo: document.body,
                global: { config: { errorHandler } },
                props: {
                    items: fruits,
                    filterThrottleWindow: 0,
                    renderNoResultsItem: (_item: ItemBase, el: Element) => { el.textContent = 'first'; },
                },
            });

            await wrapper.setProps({
                renderNoResultsItem: (_item: ItemBase, el: Element) => { el.textContent = 'second'; },
            });
            await userEvent.click(inputOf(wrapper));
            await userEvent.type(inputOf(wrapper), 'xyz');

            expect(errorHandler).not.toHaveBeenCalled();
            await expect.poll(listLabels).toEqual(['second']);
        });
    });

    describe('DropList', () => {
        it('renders items, header and footer through slots', async () => {
            mount(DropList, {
                attachTo: document.body,
                props: {
                    items: fruits.slice(0, 2),
                    isHeaderVisible: true,
                    isFooterVisible: true,
                    positionOptions: listPosition(createAnchor()),
                },
                slots: {
                    item: (item: ItemBase) => tracked(`→ ${item.label}`),
                    header: () => h('b', 'Fruits'),
                    footer: () => h('i', '2 items'),
                },
            });
            await nextTick();

            expect(listLabels()).toEqual(['→ Banana', '→ Apple']);
            expect(document.querySelector('.droplist_header')).toHaveTextContent('Fruits');
            expect(document.querySelector('.droplist_footer')).toHaveTextContent('2 items');
        });

        it.fails('no-results-item: uses the renderNoResultsItem prop', async () => {
            mount(DropList, {
                attachTo: document.body,
                props: {
                    items: [],
                    positionOptions: listPosition(createAnchor()),
                    renderNoResultsItem: (_item: ItemBase, el: Element) => { el.textContent = 'Nothing here'; },
                },
            });
            await nextTick();

            expect(listLabels()).toEqual(['Nothing here']);
        });

        it('no-results-item: renders the slot', async () => {
            mount(DropList, {
                attachTo: document.body,
                props: { items: [], positionOptions: listPosition(createAnchor()) },
                slots: { 'no-results-item': () => tracked('Empty!') },
            });
            await nextTick();

            expect(listLabels()).toEqual(['Empty!']);
        });
    });
});
