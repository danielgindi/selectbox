import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { chipLabels, fruits, listItemEls, listLabels, mountSelectBox, nextTick, option } from './helpers';

const checkedLabels = () => listItemEls()
    .filter(el => el.classList.contains('droplist__item_checked'))
    .map(el => el.textContent.trim());

describe('SelectBox — multi selection', () => {
    it('renders selected values as chips sorted by label, preferring short_label', async () => {
        const items = [
            { label: 'United States', short_label: 'USA', value: 'us' },
            { label: 'Canada', value: 'ca' },
            { label: 'Brazil', value: 'br' },
        ];
        const { selectBox, el } = mountSelectBox({ multi: true, items, value: ['us', 'ca', 'br'] });
        await nextTick();

        expect(chipLabels(el)).toEqual(['Brazil', 'Canada', 'USA']);
        expect(selectBox.getValue()).toEqual(['br', 'ca', 'us']);
    });

    it('keeps stickyValues first among the chips', async () => {
        const { el } = mountSelectBox({ multi: true, items: fruits, value: ['apple', 'date'], stickyValues: ['date'] });
        await nextTick();

        expect(chipLabels(el)).toEqual(['Date', 'Apple']);
    });

    it('toggles options from the list, keeping the list open, and emits addsel/removesel', async () => {
        const onAdd = vi.fn();
        const onRemove = vi.fn();
        const { selectBox, el, input } = mountSelectBox({ multi: true, items: fruits });
        selectBox.on('addsel', onAdd).on('removesel', onRemove);

        await userEvent.click(input);
        await userEvent.click(option('Cherry'));
        await userEvent.click(option('Apple'));

        expect(selectBox.isListOpen()).toBe(true);
        expect(checkedLabels()).toEqual(['Apple', 'Cherry']);
        await expect.poll(() => chipLabels(el)).toEqual(['Apple', 'Cherry']);
        expect(selectBox.getValue()).toEqual(['apple', 'cherry']);

        await userEvent.click(option('Cherry'));

        expect(selectBox.getValue()).toEqual(['apple']);
        expect(onAdd).toHaveBeenCalledTimes(2);
        expect(onRemove).toHaveBeenCalledWith(expect.objectContaining({ value: 'cherry', item: fruits[2] }));
    });

    it('rolls the check back when addsel:before vetoes it', async () => {
        const { selectBox, input } = mountSelectBox({ multi: true, items: fruits });
        selectBox.on('addsel:before', (event: { cancel: boolean }) => event.cancel = true);

        await userEvent.click(input);
        await userEvent.click(option('Apple'));

        expect(selectBox.getValue()).toEqual([]);
        expect(checkedLabels()).toEqual([]);
    });

    it('removes a chip with its remove button', async () => {
        const onRemove = vi.fn();
        const { selectBox, el } = mountSelectBox({ multi: true, items: fruits, value: ['apple', 'cherry'] });
        selectBox.on('removesel', onRemove);
        await nextTick();

        await userEvent.click(el.querySelector<HTMLElement>('.selectbox__item .selectbox__item_remove'));

        expect(selectBox.getValue()).toEqual(['cherry']);
        expect(onRemove).toHaveBeenCalledWith({ value: 'apple', item: fruits[1] });
        expect(chipLabels(el)).toEqual(['Cherry']);
    });

    it('lets removesel:before veto removing a chip', async () => {
        const { selectBox, el } = mountSelectBox({ multi: true, items: fruits, value: ['apple'] });
        selectBox.on('removesel:before', (event: { cancel: boolean }) => event.cancel = true);
        await nextTick();

        await userEvent.click(el.querySelector<HTMLElement>('.selectbox__item_remove'));

        expect(selectBox.getValue()).toEqual(['apple']);
    });

    it('Backspace in an empty input removes the last chip and puts its label in the input for editing', async () => {
        const { selectBox, el, input } = mountSelectBox({ multi: true, items: fruits, value: ['apple', 'cherry'] });
        await nextTick();

        await userEvent.click(input);
        await userEvent.keyboard('{Backspace}');

        expect(selectBox.getValue()).toEqual(['apple']);
        expect(input).toHaveValue('Cherry');
        await expect.poll(() => chipLabels(el)).toEqual(['Apple']);
    });

    describe('maxMultiItems', () => {
        it('collapses the overflow into a single "rest" chip labelled by the provider', async () => {
            const multiItemsRestLabelProvider = vi.fn((count: number) => `+${count} more`);
            const { el } = mountSelectBox({
                multi: true,
                items: fruits,
                value: ['apple', 'banana', 'cherry', 'date'],
                maxMultiItems: 2,
                multiItemsRestLabelProvider,
            });
            await nextTick();

            expect(chipLabels(el)).toEqual(['Apple', 'Banana', '+2 more']);
            expect(multiItemsRestLabelProvider).toHaveBeenCalledWith(2, expect.any(Array));
        });

        it('removing the "rest" chip deselects every value it represents', async () => {
            const { selectBox, el } = mountSelectBox({
                multi: true,
                items: fruits,
                value: ['apple', 'banana', 'cherry', 'date'],
                maxMultiItems: 2,
            });
            await nextTick();

            const chips = el.querySelectorAll('.selectbox__item_remove');
            await userEvent.click(chips[chips.length - 1]);

            expect(selectBox.getValue()).toEqual(['apple', 'banana']);
            await expect.poll(() => chipLabels(el)).toEqual(['Apple', 'Banana']);
        });
    });

    it('lists checked options first by default', async () => {
        const { input } = mountSelectBox({ multi: true, items: fruits, value: ['date', 'cherry'] });

        await userEvent.click(input);

        expect(listLabels()).toEqual(['Cherry', 'Date', 'Banana', 'Apple']);
        expect(checkedLabels()).toEqual(['Cherry', 'Date']);
    });

    describe('groups', () => {
        const items = [
            { label: 'Fruits', value: 'fruits', _group: true },
            { label: 'Apple', value: 'apple', _child: true },
            { label: 'Banana', value: 'banana', _child: true },
            { label: 'Vegetables', value: 'veg', _group: true },
            { label: 'Carrot', value: 'carrot', _child: true },
        ];

        it('checking a group header selects all of its children, but not the group itself', async () => {
            const onGroupCheck = vi.fn();
            const { selectBox, input } = mountSelectBox({ multi: true, items, sortListCheckedFirst: false });
            selectBox.on('groupcheck', onGroupCheck);

            await userEvent.click(input);
            await userEvent.click(option('Fruits'));

            expect(selectBox.getValue()).toEqual(['apple', 'banana']);
            expect(onGroupCheck).toHaveBeenCalledWith(expect.objectContaining({ value: 'fruits', affectedCount: 2 }));
        });

        it('keeps groups whose children match a search, and drops groups with none', async () => {
            const { input } = mountSelectBox({ multi: true, items });

            await userEvent.click(input);
            await userEvent.type(input, 'carr');

            await expect.poll(listLabels).toEqual(['Vegetables', 'Carrot']);
        });
    });

    it('with showSelection: false, summarizes the selection in the placeholder instead of chips', async () => {
        const { el, input } = mountSelectBox({
            multi: true,
            items: fruits,
            value: ['banana', 'apple'],
            showSelection: false,
            placeholder: 'Pick fruit',
        });
        await nextTick();

        expect(chipLabels(el)).toEqual([]);
        expect(input).toHaveAttribute('placeholder', 'Banana (+1)');
    });
});
