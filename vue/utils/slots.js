import * as VueModule from 'vue';

const isVue3 = VueModule.version > '3.';
const render3 = VueModule.render;
const createVNode3 = VueModule.createVNode;

const createInstanceFromVnode = vnode => {
    return new VueModule({
        render() {
            return vnode;
        },
    });
};

const createInstanceFromVnodes = vnodes => {
    return new VueModule({
        render(h) {
            return h('div', vnodes);
        },
    });
};

const VueInstanceSymbol = Symbol('vue_instance');

/**
 *
 * @param {import('vue').Component} vue
 * @param {string} slotName
 * @returns {(function(item: *, parent: Element): void)|undefined}
 */
const createSlotBasedRenderFunc = (vue, slotName) => {
    if (vue.$slots[slotName]) {
        return (item, parent) => {
            if (isVue3) {
                let slotVnode = vue.$slots[slotName](item);
                let vnode = createVNode3({
                    render() {
                        return slotVnode;
                    },
                });
                render3(vnode, parent);
                parent[VueInstanceSymbol] = true;
            } else {
                let slotVnode = vue.$slots[slotName];
                let vm = createInstanceFromVnode(slotVnode);
                vm.$mount();
                parent[VueInstanceSymbol] = vm;
                parent.appendChild(vm.$el);
            }
        };
    }

    if (!isVue3 && vue.$scopedSlots && vue.$scopedSlots[slotName]) { // Removed in Vue 3
        return (item, parent) => {
            let vnode = vue.$scopedSlots[slotName](item);
            let vm;

            if (Array.isArray(vnode)) {
                vm = createInstanceFromVnodes(vnode);
                vm.$mount();
                let nodes = vm.$el.childNodes;
                parent[VueInstanceSymbol] = vm;
                for (let node of nodes)
                    parent.appendChild(node);
            } else {
                vm = createInstanceFromVnode(vnode);
                vm.$mount();
                parent[VueInstanceSymbol] = vm;
                parent.appendChild(vm.$el);
            }
        };
    }
};

/**
 *
 * @param {import('vue').Component} vue
 * @param {string} slotName
 * @returns {(function(parent: Element): void)|undefined}
 */
const createSlotBasedUnrenderFunc = (vue, slotName) => {
    if (vue.$slots[slotName] || (!isVue3 && vue.$scopedSlots && vue.$scopedSlots[slotName])) {
        return (parent) => {
            const vmOrApp = parent[VueInstanceSymbol];
            if (!vmOrApp) return;
            if (isVue3) render3(null, parent);
            else vmOrApp.$destroy();
            delete parent[VueInstanceSymbol];
        };
    }
};

export {
    createSlotBasedRenderFunc,
    createSlotBasedUnrenderFunc,
};
