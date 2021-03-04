<template>
  <ul
    ref="el"
    style="display: none"
    @blur="$emit('blur')"
  />
</template>

<script>
    import Vue from 'vue';
    import DropList from '../lib/DropList';
    import DomEventsSink from '@danielgindi/dom-utils/lib/DomEventsSink';

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

    export default {
        props: {
            baseClassName: {
                type: String,
            },
            additionalClasses: {
                type: [Object, Array, String],
            },
            autoFocus: {
                type: Boolean,
                default: true,
            },
            capturesFocus: {
                type: Boolean,
                default: true,
            },
            multi: {
                type: Boolean,
                default: false,
            },
            keyDownHandler: {
                type: Function,
            },
            autoCheckGroupChildren: {
                type: Boolean,
                default: true,
            },
            useExactTargetWidth: {
                type: Boolean,
                default: false,
            },
            constrainToWindow: {
                type: Boolean,
                default: true,
            },
            autoFlipDirection: {
                type: Boolean,
                default: true,
            },
            estimatedItemHeight: {
                type: Number,
                default: 20,
            },
            estimateWidth: {
                type: Boolean,
                default: false,
            },
            virtualMinItems: {
                type: Number,
                default: 10,
            },
            labelProp: {
                type: String,
                default: 'label',
            },
            valueProp: {
                type: String,
                default: 'value',
            },
            items: {
                type: Array,
                default: () => [],
            },
            value: {
                type: [Number, String, Object, Array],
            },
            renderItem: {
                type: Function,
            },
            unrenderItem: {
                type: Function,
            },
            positionOptions: {
                type: Object,
            },
        },

        data() {
            return {
                sink: new DomEventsSink(),
                el: undefined,
            };
        },

        computed: {
            computedOptions() {
                let opts = {
                    el: this.$refs.el,
                    on: this._handleListEvents.bind(this),
                };

                if (this.baseClassName) {
                    opts.baseClassName = this.baseClassName;
                }

                if (this.additionalClassesList) {
                    opts.additionalClasses = this.additionalClassesList;
                }

                for (let key of ['capturesFocus', 'multi',
                    'autoCheckGroupChildren', 'useExactTargetWidth', 'constrainToWindow',
                    'autoFlipDirection', 'estimateWidth']) {
                    if (typeof this[key] === 'boolean') {
                        opts[key] = this[key];
                    }
                }

                for (let key of ['estimatedItemHeight', 'virtualMinItems']) {
                    if (typeof this[key] === 'number') {
                        opts[key] = this[key];
                    }
                }

                for (let key of ['labelProp', 'valueProp']) {
                    if (typeof this[key] === 'string') {
                        opts[key] = this[key];
                    }
                }

                if (typeof this.keyDownHandler === 'function') {
                    opts.keyDownHandler = this.keyDownHandler;
                }

                opts.renderItem = this.renderItem || this._createSlotBasedRenderFunc('item');
                opts.unrenderItem = this.unrenderItem || this._createSlotBasedUnrenderFunc('item');

                return opts;
            },

            additionalClassesList() {
                return this._concatClassesObject(this.additionalClasses);
            },
        },

        watch: {
            items(value) {
                if (this._list) {
                    this._list.removeAllItems();

                    if (Array.isArray(value))
                      this._list.addItems(value);
                }
            },

            value(value, old) {
                if (Array.isArray(value) && Array.isArray(old) &&
                    value.length === old && value.every((v, i) => old[i] === v))
                    return;

                if (this._list) {
                    if (this.multi) {
                        this._list.setCheckedValues(Array.isArray(value) ? value : value == null ? [] : [value]);
                    } else {
                        this._list.setSingleSelectedItemByValue(value === null ? undefined : value);
                    }
                }
            },

            additionalClasses() {
                if (this._list)
                    this._list.setAdditionalClasses(this.additionalClassesList);
            },
        },

        mounted() {
            this._createList();
        },

        updated() {
            if (this.$refs.el && this.el !== this.$refs.el) {
                this._createList();
            }
        },

        destroyed() {
            this._destroyList();
        },

        methods: {
            _handleListEvents(event, data) {
                if (event === 'select' ||
                    event === 'check' && !event.isCheckingGroup ||
                    event === 'groupcheck') {
                    this.$emit('input', event === 'select' ? data.value : this._list.getCheckedValues(false));
                }

                if (event === 'hide') {
                    this._clearAutoRelayout();
                }

                if (event === 'show') {
                    this.relayout();

                    if (this.autoFocus) {
                        this.el.focus();
                    }
                }

                switch (event) {
                    case 'itemfocus':
                    case 'itemblur':
                    case 'select':
                    case 'show:before':
                    case 'show':
                    case 'hide:before':
                    case 'hide':
                    case 'check':
                    case 'groupcheck':
                        this.$emit(event, ...(data === undefined ? [] : [data]));
                        break;
                }
            },

            _createSlotBasedRenderFunc(slotName, onAfterUpdate) {
                if (this.$scopedSlots[slotName]) {
                    return (item, parent) => {
                        let vnode = this.$scopedSlots[slotName](item);
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

                if (this.$slots[slotName]) {
                    return (item, parent) => {
                        let vnode = this.$slots[slotName];
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
            },

            _createSlotBasedUnrenderFunc(slotName) {
                if (this.$slots[slotName] || this.$slots[slotName]) {
                    return (_item, parent) => {
                        if (parent.childNodes.length > 0) {
                            let node = parent.childNodes[0][VueInstanceSymbol];
                            if (node) {
                                node.$destroy();
                                delete parent.childNodes[0][VueInstanceSymbol];
                            }
                        }
                    };
                }
            },

            _createList() {
                this._destroyList();

                this.el = this.$refs.el;
                if (!this.el)
                    return;

                let list = new DropList(this.computedOptions);

                if (Array.isArray(this.items))
                    list.addItems(this.items);

                if (this.multi) {
                    list.setCheckedValues(Array.isArray(this.value) ? this.value : this.value == null ? [] : [this.value]);
                } else {
                    list.setSingleSelectedItemByValue(this.value === null ? undefined : this.value);
                }

                this._list = list;

                list.show(this.positionOptions);

                this._setupAutoRelayout();
            },

            _destroyList() {
                this._clearAutoRelayout();

                if (this._list) {
                    this._list.destroy();
                    delete this._list;
                }
            },

            _concatClassesObject(classes) {
                if (Array.isArray(classes)) {
                    return classes.join(' ');
                }
                else if (classes && typeof classes === 'object') {
                    let arr = [];
                    for (let [key, value] of Object.entries(classes)) {
                        if (value)
                            arr.push(key);
                    }
                    return arr.join(' ');
                }

                return classes || '';
            },

            _clearAutoRelayout() {
                this.sink.remove(null, '.trackposition');
            },

            _setupAutoRelayout() {
                this._clearAutoRelayout();

                if (!this.el)
                    return;

                this.sink.add(window, 'resize.trackposition', () => this.relayout());

                let parent = this.el.parentNode;
                while (parent) {
                    if (parent.scrollHeight > parent.offsetHeight ||
                        parent.scrollWidth > parent.offsetWidth) {
                        if (parent === document.documentElement) {
                            parent = window;
                        }
                        this.sink.add(parent, 'scroll.trackposition', () => this.relayout());
                    }
                    parent = parent.parentNode;
                }
            },

            relayout() {
                if (this._list)
                    this._list.relayout(this.positionOptions);
            },
        },
    };
</script>
