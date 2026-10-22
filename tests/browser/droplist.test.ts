import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { DropListDefaultOptions } from '../../src/lib/index';
import { createAnchor, createDropList, fruits, listItemEls, listLabels, mountSelectBox, option } from './helpers';

const highlighted = () => document.querySelector<HTMLElement>('.droplist__item_focus')?.textContent;

describe('DropList (standalone)', () => {
    it('shows and hides around a target, emitting lifecycle events in order', () => {
        const events: string[] = [];
        const target = createAnchor();
        const dropList = createDropList({
            on: name => events.push(name),
            positionOptionsProvider: () => ({ target, anchor: { x: 'start', y: 'bottom' }, position: { x: 'start', y: 'top' } }),
        });
        dropList.setItems(fruits);

        dropList.show();
        expect(dropList.isVisible()).toBe(true);
        expect(dropList.el).toBeVisible();

        dropList.hide();
        expect(dropList.isVisible()).toBe(false);
        expect(dropList.el).not.toBeInTheDocument();

        expect(events.filter(x => /^(show|hide)/.test(x)))
            .toEqual(['show:before', 'show', 'hide:before', 'hide', 'hide:after']);
    });

    it('emits select with the original item when an option is clicked', async () => {
        const onSelect = vi.fn();
        const dropList = createDropList({ on: (name, data) => name === 'select' && onSelect(data) });
        dropList.setItems(fruits).show();

        await userEvent.click(option('Cherry'));

        expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ value: 'cherry', item: fruits[2] }));
    });

    it('exposes header and footer containers for custom content', () => {
        const dropList = createDropList({ isHeaderVisible: true, isFooterVisible: true });
        dropList.getHeaderElement().textContent = 'Actions';
        dropList.getFooterElement().textContent = '4 available';
        dropList.setItems(fruits).show();

        expect(dropList.getHeaderElement()).toBeVisible();
        expect(dropList.getHeaderElement()).toHaveTextContent('Actions');
        expect(dropList.getFooterElement()).toBeVisible();
        expect(dropList.getFooterElement()).toHaveTextContent('4 available');
    });

    it('renders custom item content with renderItem', () => {
        const dropList = createDropList({
            renderItem: (item, itemEl) => {
                itemEl.textContent = `${item.label} (${item.value})`;
            },
        });
        dropList.setItems(fruits.slice(0, 1)).show();

        expect(listLabels()).toEqual(['Banana (banana)']);
    });

    it('virtualizes long lists, rendering only what fits in view', async () => {
        const items = Array.from({ length: 10_000 }, (_, i) => ({ label: `Item ${i}`, value: i }));
        const dropList = createDropList();
        dropList.setItems(items).show();

        expect(listItemEls().length).toBeLessThan(100);

        dropList.el.focus();
        await userEvent.keyboard('{End}');

        expect(dropList.getFocusedItemIndex()).toBe(9999);
        await expect.poll(listLabels).toContain('Item 9999');
        expect(listItemEls().length).toBeLessThan(100);
    });

    it('focuses the first option starting with typed characters when not searchable', async () => {
        const dropList = createDropList();
        dropList.setItems([...fruits, { label: 'Cranberry', value: 'cranberry' }]).show();
        dropList.el.focus();

        await userEvent.keyboard('cr');

        expect(highlighted()).toBe('Cranberry');
    });

    it('filters with its own inline search box when searchable', async () => {
        const dropList = createDropList({ searchable: true, searchPlaceholder: 'Filter…' });
        dropList.setItems(fruits).show();

        const search = dropList.el.querySelector<HTMLElement>('input');
        expect(search).toHaveAttribute('placeholder', 'Filter…');

        await userEvent.type(search, 'an');

        await expect.poll(listLabels).toEqual(['Banana']);
    });

    describe('sub-items', () => {
        const items = [
            { label: 'Europe', value: 'europe', _subitems: [
                { label: 'Paris', value: 'paris' },
                { label: 'Berlin', value: 'berlin' },
            ] },
            { label: 'Tokyo', value: 'tokyo' },
        ];

        it('opens a nested list for an item with _subitems and selects from it', async () => {
            const onSubSelect = vi.fn();
            const onSelect = vi.fn();
            const dropList = createDropList({
                on: (name, data) => {
                    if (name === 'subitems:select') onSubSelect(data);
                    if (name === 'select') onSelect(data);
                },
            });
            dropList.setItems(items).show();

            await userEvent.click(option('Europe'));
            expect(onSelect).not.toHaveBeenCalled();

            await userEvent.click(option('Berlin'));
            expect(onSubSelect).toHaveBeenCalledWith(expect.objectContaining({ value: 'berlin' }));
        });

        it('lets a SelectBox select, and display, a nested value', async () => {
            const { selectBox, el, input } = mountSelectBox({ items, searchable: false });

            selectBox.setValue('paris');
            await expect.element(el.querySelector<HTMLElement>('.selectbox__single_wrapper')).toHaveTextContent('Paris');

            await userEvent.click(input);
            await userEvent.click(option('Europe'));
            await userEvent.click(option('Berlin'));

            expect(selectBox.getValue()).toBe('berlin');
        });
    });

    describe('zIndex', () => {
        it('applies a fixed z-index, and leaves the CSS one when null', () => {
            const dropList = createDropList({ zIndex: 1234 });
            dropList.show();
            expect(dropList.el.style.zIndex).toBe('1234');

            dropList.hide();
            dropList.setZIndex(null).show();
            expect(dropList.el.style.zIndex).toBe('');
        });

        it('resolves a global resolver on every show, with the owning SelectBox as context', async () => {
            const resolver = vi.fn(() => 500);
            const previous = DropListDefaultOptions.zIndex;
            DropListDefaultOptions.zIndex = resolver;

            try {
                const { selectBox, el } = mountSelectBox({ items: fruits });
                selectBox.openList();

                expect(resolver).toHaveBeenCalledWith(expect.objectContaining({ owner: el, selectBox }));
                expect(selectBox.droplistInstance.el.style.zIndex).toBe('500');
            } finally {
                DropListDefaultOptions.zIndex = previous;
            }
        });
    });
});
