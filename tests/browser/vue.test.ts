import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { enableAutoUnmount, mount } from '@vue/test-utils';
import { h } from 'vue';
import { SelectBox } from '../../src/vue/index';
import { chipLabels, fruits, nextTick, option } from './helpers';

const singleWrapper = (root: Element) => root.querySelector<HTMLElement>('.selectbox__single_wrapper');

describe('Vue SelectBox', () => {
    enableAutoUnmount(afterEach);

    it('supports v-model in both directions', async () => {
        const wrapper = mount(SelectBox, {
            attachTo: document.body,
            props: {
                items: fruits,
                modelValue: 'apple',
                'onUpdate:modelValue': (value: string) => wrapper.setProps({ modelValue: value }),
            },
        });

        await expect.element(singleWrapper(wrapper.element)).toHaveTextContent('Apple');

        await userEvent.click((wrapper.element as HTMLElement).querySelector('input'));
        await userEvent.click(option('Date'));

        expect(wrapper.emitted('update:modelValue')).toEqual([['date']]);
        await expect.element(singleWrapper(wrapper.element)).toHaveTextContent('Date');

        await wrapper.setProps({ modelValue: 'banana' });
        await expect.element(singleWrapper(wrapper.element)).toHaveTextContent('Banana');
    });

    it('emits the full array for multi selection', async () => {
        const wrapper = mount(SelectBox, {
            attachTo: document.body,
            props: { items: fruits, multi: true, modelValue: ['cherry'] },
        });
        await nextTick();

        await userEvent.click((wrapper.element as HTMLElement).querySelector('input'));
        await userEvent.click(option('Apple'));

        const [emitted] = wrapper.emitted<[string[]]>('update:modelValue').at(-1);
        expect(emitted.toSorted()).toEqual(['apple', 'cherry']);
        await expect.poll(() => chipLabels(wrapper.element as HTMLElement)).toEqual(['Apple', 'Cherry']);
    });

    it('renders the selection through the single-item slot', async () => {
        const wrapper = mount(SelectBox, {
            attachTo: document.body,
            props: { items: fruits, modelValue: 'cherry' },
            slots: {
                // Slot props are the selected item itself
                'single-item': (item: { label: string }) => h('em', `🍒 ${item.label}`),
            },
        });

        await expect.poll(() => singleWrapper(wrapper.element)?.innerHTML).toBe('<em>🍒 Cherry</em>');
    });
});
