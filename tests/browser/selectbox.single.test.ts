import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import type { ItemBase } from '../../src/lib/index';
import { fruits, listLabels, mountSelectBox, nextTick, option } from './helpers';

describe('SelectBox — single selection', () => {
    it('shows the initial value and exposes combobox semantics', async () => {
        const { selectBox, el } = mountSelectBox({ items: fruits, value: 'cherry' });
        await nextTick();

        expect(selectBox.getValue()).toBe('cherry');
        expect(el.querySelector<HTMLElement>('.selectbox__single_wrapper')).toHaveTextContent('Cherry');
        expect(el).toHaveAttribute('role', 'combobox');
        expect(el).toHaveAttribute('aria-expanded', 'false');
    });

    it('opens on focus, selects the clicked option, then closes', async () => {
        const onSelect = vi.fn();
        const { selectBox, el, input } = mountSelectBox({ items: fruits });
        selectBox.on('select', onSelect);

        await userEvent.click(input);
        expect(el).toHaveAttribute('aria-expanded', 'true');
        expect(listLabels()).toEqual(['Banana', 'Apple', 'Cherry', 'Date']);

        await userEvent.click(option('Apple'));

        expect(selectBox.getValue()).toBe('apple');
        expect(onSelect).toHaveBeenCalledWith({ value: 'apple', item: fruits[1] });
        expect(el).toHaveAttribute('aria-expanded', 'false');
        await expect.element(el.querySelector<HTMLElement>('.selectbox__single_wrapper')).toHaveTextContent('Apple');
    });

    it('lets a select:before handler veto the selection', async () => {
        const { selectBox, input } = mountSelectBox({ items: fruits, value: 'banana' });
        selectBox.on('select:before', (event: { value: string, cancel: boolean }) => {
            event.cancel = event.value === 'date';
        });

        await userEvent.click(input);
        await userEvent.click(option('Date'));
        expect(selectBox.getValue()).toBe('banana');

        await userEvent.click(option('Cherry'));
        expect(selectBox.getValue()).toBe('cherry');
    });

    it('does not select options marked _nointeraction', async () => {
        const items = [...fruits, { label: 'Durian', value: 'durian', _nointeraction: true }];
        const { selectBox, input } = mountSelectBox({ items });

        await userEvent.click(input);
        await userEvent.click(option('Durian'));

        expect(selectBox.getValue()).toBeUndefined();
    });

    describe('clear button', () => {
        it('clears the selection and emits clear', async () => {
            const onClear = vi.fn();
            const { selectBox, el } = mountSelectBox({ items: fruits, value: 'apple' });
            selectBox.on('clear', onClear);
            await nextTick();

            await userEvent.click(el.querySelector<HTMLElement>('.selectbox__clear button'));

            expect(selectBox.getValue()).toBeUndefined();
            expect(onClear).toHaveBeenCalledOnce();
            await expect.element(el.querySelector<HTMLElement>('.selectbox__clear')).not.toBeInTheDocument();
        });

        it('can be vetoed by clear:before', async () => {
            const { selectBox, el } = mountSelectBox({ items: fruits, value: 'apple' });
            selectBox.on('clear:before', (event: { cancel: boolean }) => event.cancel = true);
            await nextTick();

            await userEvent.click(el.querySelector<HTMLElement>('.selectbox__clear button'));

            expect(selectBox.getValue()).toBe('apple');
        });

        it('is not rendered when clearable is false', async () => {
            const { el } = mountSelectBox({ items: fruits, value: 'apple', clearable: false });
            await nextTick();

            expect(el.querySelector<HTMLElement>('.selectbox__clear')).toBeNull();
        });
    });

    describe('search', () => {
        it('filters options case-insensitively, matching regex characters literally', async () => {
            const items = [
                { label: 'C', value: 'c' },
                { label: 'C++', value: 'cpp' },
                { label: 'C#', value: 'cs' },
            ];
            const { input } = mountSelectBox({ items });

            await userEvent.click(input);
            await userEvent.type(input, 'c+');

            await expect.poll(listLabels).toEqual(['C++']);
        });

        it('shows the no-results text when nothing matches', async () => {
            const { input } = mountSelectBox({ items: fruits, noResultsText: 'Nothing here' });

            await userEvent.click(input);
            await userEvent.type(input, 'xyz');

            await expect.poll(listLabels).toEqual(['Nothing here']);
        });

        it('uses a custom filterFn with the original items and the trimmed term', async () => {
            const filterFn = vi.fn((items: ItemBase[], term: string) =>
                items.filter(x => x.value.endsWith(term)));
            const { input } = mountSelectBox({ items: fruits, filterFn });

            await userEvent.click(input);
            await userEvent.type(input, ' e ');

            await expect.poll(listLabels).toEqual(['Apple', 'Date']);
            expect(filterFn).toHaveBeenLastCalledWith(expect.arrayContaining(fruits), 'e');
        });

        it('cannot be typed into when searchable is false', async () => {
            const { input } = mountSelectBox({ items: fruits, searchable: false });

            expect(input).toHaveAttribute('readonly');
        });
    });

    describe('keyboard', () => {
        it('moves the highlight with arrows, selects it with Enter, and closes with Escape', async () => {
            const { selectBox, el, input } = mountSelectBox({ items: fruits });
            const highlighted = () => document.querySelector<HTMLElement>('.droplist__item_focus')?.textContent;

            await userEvent.click(input);
            await userEvent.keyboard('{ArrowDown}');
            expect(highlighted()).toBe('Banana');
            await userEvent.keyboard('{ArrowDown}');
            expect(highlighted()).toBe('Apple');

            await userEvent.keyboard('{Enter}');
            expect(selectBox.getValue()).toBe('apple');
            expect(el).toHaveAttribute('aria-expanded', 'false');

            selectBox.openList();
            await userEvent.keyboard('{Escape}');
            expect(el).toHaveAttribute('aria-expanded', 'false');
            expect(selectBox.getValue()).toBe('apple');
        });

        it('steps through values with arrows while closed, passing through "no value" when clearable', async () => {
            const { selectBox, input } = mountSelectBox({ items: fruits.slice(0, 2), value: 'banana' });

            await userEvent.click(input);
            await userEvent.keyboard('{Escape}');

            await userEvent.keyboard('{ArrowDown}');
            expect(selectBox.getValue()).toBe('apple');

            await userEvent.keyboard('{ArrowDown}');
            expect(selectBox.getValue()).toBeUndefined();

            await userEvent.keyboard('{ArrowDown}');
            expect(selectBox.getValue()).toBe('banana');

            await userEvent.keyboard('{ArrowUp}');
            expect(selectBox.getValue()).toBeUndefined();
        });
    });

    describe('disabled / read-only', () => {
        it.each([
            ['disabled', { disabled: true }],
            ['readOnly', { readOnly: true }],
        ])('%s blocks opening and clearing', async (_, state) => {
            const { selectBox, el } = mountSelectBox({ items: fruits, value: 'apple', ...state });
            await nextTick();

            await userEvent.click(el, { force: true });
            // The clear button is hidden by CSS in this state; make sure the click is ignored regardless.
            el.querySelector<HTMLButtonElement>('.selectbox__clear button').click();

            expect(selectBox.isListOpen()).toBe(false);
            expect(selectBox.getValue()).toBe('apple');
        });

        it('reflects the disabled state for assistive technology and toggles at runtime', () => {
            const { selectBox, el, input } = mountSelectBox({ items: fruits });

            selectBox.disable();
            expect(el).toHaveAttribute('aria-disabled', 'true');
            expect(input).toBeDisabled();

            selectBox.enable();
            expect(el).toHaveAttribute('aria-disabled', 'false');
            expect(input).toBeEnabled();
        });
    });

    it('sorts list options by label when sortListItems is set', async () => {
        const { input } = mountSelectBox({ items: fruits, sortListItems: true });

        await userEvent.click(input);

        expect(listLabels()).toEqual(['Apple', 'Banana', 'Cherry', 'Date']);
    });

    it('re-resolves the selected item when items are replaced', async () => {
        const { selectBox, el } = mountSelectBox({ items: fruits, value: 'apple' });

        selectBox.setItems([{ label: 'Green apple', value: 'apple' }]);

        expect(selectBox.getValue()).toBe('apple');
        await expect.element(el.querySelector<HTMLElement>('.selectbox__single_wrapper')).toHaveTextContent('Green apple');
    });

    it('renders the selection with renderSingleItem, falling back to the label when it returns false', async () => {
        const renderSingleItem = (item: ItemBase, itemEl: Element) => {
            if (item.value !== 'apple') return false;
            itemEl.innerHTML = `<b>${item.label}!</b>`;
        };
        const { selectBox, el } = mountSelectBox({ items: fruits, value: 'apple', renderSingleItem });
        const wrapper = () => el.querySelector<HTMLElement>('.selectbox__single_wrapper');

        await expect.poll(() => wrapper().innerHTML).toBe('<b>Apple!</b>');

        selectBox.setValue('date');
        await expect.poll(() => wrapper().innerHTML).toBe('Date');
    });

    describe('loading mode', () => {
        it('shows a spinner and does not open an empty list until items arrive', async () => {
            const { selectBox, el } = mountSelectBox({ isLoadingMode: true });
            await nextTick();

            expect(el.querySelector<HTMLElement>('.selectbox__spinner')).not.toBeNull();
            selectBox.openList();
            expect(selectBox.isListOpen()).toBe(false);

            selectBox.setItems(fruits).setIsLoadingMode(false);
            await nextTick();

            expect(el.querySelector<HTMLElement>('.selectbox__spinner')).toBeNull();
            selectBox.openList();
            expect(selectBox.isListOpen()).toBe(true);
        });
    });

    it('detaches from a provided element on destroy', () => {
        const host = document.createElement('div');
        document.body.append(host);

        const { selectBox } = mountSelectBox({ el: host, items: fruits });
        expect(host).toHaveClass('selectbox');

        selectBox.destroy();

        expect(host.className).toBe('');
        expect(host).not.toHaveAttribute('role');
        expect(host).not.toHaveAttribute('aria-expanded');
        expect(host.querySelector<HTMLElement>('input')).toBeNull();
    });
});
