import Vue, { Component as VueComponent } from 'vue';

const generateVNodeRenderer = vnode => {
    return new Vue({
        render() {
            return vnode;
        },
    });
};

const generateVNodesRenderer = vnodes => {
    return new Vue({
        render(h) {
            return h('div', vnodes);
        },
    });
};

const VueInstanceSymbol = Symbol('vue_instance');

/**
 *
 * @param {VueComponent} vue
 * @param {string} slotName
 * @param {function(item: *)?} onAfterUpdate
 * @returns {(function(item: *, parent: Element): void)|undefined}
 */
const createSlotBasedRenderFunc = (vue, slotName, onAfterUpdate) => {
    if (vue.$scopedSlots[slotName]) {
        return (item, parent) => {
            let vnode = vue.$scopedSlots[slotName](item);
            let vm;

            if (Array.isArray(vnode)) {
                vm = generateVNodesRenderer(vnode);
                vm.$mount();
                let nodes = vm.$el.childNodes;
                nodes[0][VueInstanceSymbol] = vm;
                for (let node of nodes)
                    parent.appendChild(node);
            } else {
                vm = generateVNodeRenderer(vnode);
                vm.$mount();
                vm.$el[VueInstanceSymbol] = vm;
                parent.appendChild(vm.$el);
            }

            if (onAfterUpdate) {
                vm.$on('hook:updated', () => {
                    vm.$nextTick(() => onAfterUpdate(item));
                });
            }
        };
    }

    if (vue.$slots[slotName]) {
        return (item, parent) => {
            let vnode = vue.$slots[slotName];
            let vm = generateVNodeRenderer(vnode);
            vm.$mount();
            vm.$el[VueInstanceSymbol] = vm;
            parent.appendChild(vm.$el);

            if (onAfterUpdate) {
                vm.$on('hook:updated', () => {
                    vm.$nextTick(() => onAfterUpdate(item));
                });
            }
        };
    }
};

/**
 *
 * @param {VueComponent} vue
 * @param {string} slotName
 * @returns {(function(parent: Element): void)|undefined}
 */
const createSlotBasedUnrenderFunc = (vue, slotName) => {
    if (vue.$slots[slotName] || vue.$slots[slotName]) {
        return (parent) => {
            if (parent.childNodes.length > 0) {
                let node = parent.childNodes[0][VueInstanceSymbol];
                if (node) {
                    node.$destroy();
                    delete parent.childNodes[0][VueInstanceSymbol];
                }
            }
        };
    }
};

export {
    generateVNodeRenderer,
    generateVNodesRenderer,
    createSlotBasedRenderFunc,
    createSlotBasedUnrenderFunc,
};
