<template>
    <span v-show="false" />
</template>

<script>
import DropList from '../lib/DropList';
import DomEventsSink from '@danielgindi/dom-utils/lib/DomEventsSink';
import { createSlotBasedRenderFunc, createSlotBasedUnrenderFunc } from './utils/slots.js';

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

            opts.renderItem = this.renderItem;
            if (!opts.renderItem) {
                opts.renderItem = createSlotBasedRenderFunc(this, 'item');
            }

            opts.unrenderItem = this.unrenderItem;
            if (!opts.unrenderItem) {
                let fn = createSlotBasedUnrenderFunc(this, 'item');
                if (fn) {
                    opts.unrenderItem = (item, el) => fn(el);
                }
            }

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

        renderItem() {
            this._recreateList();
        },

        unrenderItem() {
            this._recreateList();
        },

        $scopedSlots() {
            this._recreateList();
        },

        $slots() {
            this._recreateList();
        },
    },

    mounted() {
        this._createList();
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
                    this._list.el.focus();
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

        _createList() {
            this._destroyList();

            if (!this.$root)
                return;

            let list = new DropList(this.computedOptions);
            this.el = list.el;

            this.sink.remove(null, 'blur');
            this.sink.add(list.el, 'blur', event => this.$emit('blur', event));

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

            this.el = undefined;

            this.sink.remove(null, 'blur');
        },

        _recreateList() {
            this._destroyList();
            this._createList();
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

            if (!this._list)
                return;

            this.sink.add(window, 'resize.trackposition', () => this.relayout());

            let parent = this._list.el.parentNode;
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
