import { createVNode, render } from 'vue';

const VueInstanceSymbol = Symbol('vue_instance');

/**
 * Creates a render function (for `renderItem`-style options) that renders the component's slot into a parent element.
 * @param vue - the component instance owning the slot
 * @param slotName - name of the slot to render
 * @returns the render function, or `undefined` if the slot is not provided
 */
const createSlotBasedRenderFunc = (vue: any, slotName: string) => {
    if (!vue.$slots[slotName])
        return undefined;

    return (item: any, parent: any) => {
        const slotVnode = vue.$slots[slotName](item);
        const vnode = createVNode({
            render() {
                return slotVnode;
            },
        });
        render(vnode, parent);
        parent[VueInstanceSymbol] = true;
    };
};

/**
 * Creates the matching unrender function (for `unrenderItem`-style options), unmounting what the render function rendered.
 * @param vue - the component instance owning the slot
 * @param slotName - name of the slot
 * @returns the unrender function, or `undefined` if the slot is not provided
 */
const createSlotBasedUnrenderFunc = (vue: any, slotName: string) => {
    if (!vue.$slots[slotName])
        return undefined;

    return (parent: any) => {
        if (!parent[VueInstanceSymbol])
            return;

        render(null, parent);
        delete parent[VueInstanceSymbol];
    };
};

export {
    createSlotBasedRenderFunc,
    createSlotBasedUnrenderFunc,
};
