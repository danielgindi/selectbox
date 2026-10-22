import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { enableAutoUnmount, mount } from '@vue/test-utils';
import { SelectBox as VueSelectBox } from '../../src/vue/index';
import { fruits, listLabels, mountSelectBox, nextTick, option } from './helpers';

// Known bugs, each reproduced by a test that asserts the correct behavior.
// `it.fails` keeps CI green while the bug exists; once a bug is fixed its test
// starts failing - then change it to `it` and move it to the matching suite.
describe('known bugs', () => {
    enableAutoUnmount(afterEach);

    it.fails('2. leaves a provided element empty after destroy()', () => {
        const host = document.createElement('div');
        document.body.append(host);

        const { selectBox } = mountSelectBox({ el: host, items: fruits });
        selectBox.destroy();

        expect(host.innerHTML).toBe('');
    });

    it.fails('3. setItems(items, false) refreshes an open list', async () => {
        const { selectBox, input } = mountSelectBox({ items: fruits });
        await userEvent.click(input);
        expect(listLabels()).toEqual(['Banana', 'Apple', 'Cherry', 'Date']);

        selectBox.setItems([{ label: 'Kiwi', value: 'kiwi' }], false);
        await nextTick();

        expect(listLabels()).toEqual(['Kiwi']);
    });

    it.fails('4. Vue emits a single update:modelValue when a group is checked', async () => {
        const items = [
            { label: 'Fruits', value: 'fruits', _group: true },
            { label: 'Apple', value: 'apple', _child: true },
            { label: 'Banana', value: 'banana', _child: true },
        ];
        const wrapper = mount(VueSelectBox, {
            attachTo: document.body,
            props: { items, multi: true, modelValue: [], sortListCheckedFirst: false },
        });
        await nextTick();

        await userEvent.click((wrapper.element as HTMLElement).querySelector('input'));
        await userEvent.click(option('Fruits'));

        expect(wrapper.emitted('update:modelValue')).toEqual([[['apple', 'banana']]]);
    });
});
