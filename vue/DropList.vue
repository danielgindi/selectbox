<template>
  <span v-show="false" />
</template>

<script>
import DropList from '../lib/DropList';
import DomEventsSink from '@danielgindi/dom-utils/lib/DomEventsSink';
import { createSlotBasedRenderFunc, createSlotBasedUnrenderFunc } from './utils/slots.js';
import { version } from 'vue';

const isVue3 = version > '3.';

const AllListEvents = ['itemfocus', 'itemblur', 'select', 'show:before', 'show', 'hide:before', 'hide', 'hide:after', 'check', 'groupcheck'];

export default {
    inheritAttrs: false,

    props: {
        baseClassName: {
            type: String,
        },
        additionalClasses: {
            type: [Object, Array, String],
        },
        direction: {
            type: String,
            default: undefined,
        },
        autoFocus: {
            type: Boolean,
            default: true,
        },
        autoItemBlur: {
            type: Boolean,
            default: true,
        },
        autoItemBlurDelay: {
            type: Number,
            default: 300,
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
        [isVue3 ? 'modelValue' : 'value']: { // Vue 2
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

    emits: [
        'update:modelValue',
        'itemfocus',
        'itemblur',
        'select',
        'show:before',
        'show',
        'hide:before',
        'hide',
        'check',
        'groupcheck',
        'blur',
        'keypress',
    ],

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

            if (this.direction) {
                opts.direction = this.direction;
            }

            for (let key of ['autoItemBlur', 'capturesFocus', 'multi',
                'autoCheckGroupChildren', 'useExactTargetWidth', 'constrainToWindow',
                'autoFlipDirection', 'estimateWidth']) {
                if (typeof this[key] === 'boolean') {
                    opts[key] = this[key];
                }
            }

            for (let key of ['autoItemBlurDelay', 'estimatedItemHeight', 'virtualMinItems']) {
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

        [isVue3 ? 'modelValue' : 'value'](value, old) {
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

        direction(value) {
            if (this._list)
                this._list.setDirection(value);
        },

        renderItem() {
            this._recreateList();
        },

        unrenderItem() {
            this._recreateList();
        },

        ...(isVue3 ? {} : {
            $scopedSlots() { // Vue 2
                this._recreateList();
            },
        }),

        $slots() {
            this._recreateList();
        },
    },

    mounted() {
        this._createList();
    },

    [isVue3 ? 'unmounted' : 'destroyed']() {
        this._destroyList();
    },

    methods: {
        _handleListEvents(event, data) {
            if ((event === 'select' && !this.multi) ||
                event === 'check' && !event.isCheckingGroup ||
                event === 'groupcheck') {
                this.$emit(isVue3 ? 'update:modelValue' : 'input',
                    event === 'select'
                        ? data.value
                        : this._list.getCheckedValues(false));
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
            this._list = list;

            this.sink.add(this._list.el, 'blur.vue', evt => {
                if (this._list.el.contains(evt.relatedTarget))
                    return;
                this.$emit('blur', evt);
            }, true);

            this.sink.add(this._list.el, 'keydown.vue', evt => {
                this.$emit('keydown', evt);
            }, true);

            if (Array.isArray(this.items))
                list.addItems(this.items);

            const modelValue = isVue3 ? this.modelValue : this.value;
            if (this.multi) {
                list.setCheckedValues(Array.isArray(modelValue) ? modelValue : modelValue == null ? [] : [modelValue]);
            } else {
                list.setSingleSelectedItemByValue(modelValue === null ? undefined : modelValue);
            }

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

            this.sink.remove(null, '.vue');
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
