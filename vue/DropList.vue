<template>
  <span v-show="false" />
</template>

<script>
import DropList, { DefaultOptions } from '../lib/DropList';
import DomEventsSink from '@danielgindi/dom-utils/lib/DomEventsSink';
import { createSlotBasedRenderFunc, createSlotBasedUnrenderFunc } from './utils/slots.js';
import { version } from 'vue';

const isVue3 = version > '3.';

const AllListEvents = [
    'itemfocus', 'itemblur', 'select',
    'show:before', 'show',
    'hide:before', 'hide', 'hide:after',
    'check', 'groupcheck', 'blur',
    'show_subitems', 'hide_subitems',
    'subitems:select', 'subitems:blur',
];

export const PropTypes = {
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
    isHeaderVisible: {
        type: Boolean,
        default: false,
    },
    searchable: {
        type: Boolean,
        default: false,
    },
    noResultsText: {
        type: String,
        required: false,
    },
    filterThrottleWindow: {
        type: Number,
        required: false,
    },
    filterOnEmptyTerm: {
        type: Boolean,
        default: false,
    },
    filterGroups: {
        type: Boolean,
        default: false,
    },
    filterEmptyGroups: {
        type: Boolean,
        default: false,
    },
    filterFn: {
        type: Function,
        default: undefined,
    },
    filterDependencies: {
        type: [Array, String, Number, Boolean, Object],
        default: undefined,
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
    autoRelayoutOnItemsChange: {
        type: Boolean,
        default: true,
    },
};

export default {
    inheritAttrs: false,

    props: PropTypes,

    emits: [
        // vue events
        'update:modelValue',

        // DropList.js events (passthrough)
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
        'show_subitems',
        'hide_subitems',
        'subitems:select',
        'subitems:blur',

        // Element events
        'keypress',
        'keydown',
    ],

    data() {
        return {
            el: undefined,

            nonReactive: Object.seal({
                instance: undefined,
                sink: new DomEventsSink(),
            }),
        };
    },

    computed: {
        computedOptions() {
            let opts = {
                on: this._handleListEvents.bind(this),
                positionOptionsProvider: () => this.positionOptions,
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
                'autoFlipDirection', 'estimateWidth',
                'isHeaderVisible',
                'searchable', 'filterOnEmptyTerm',
                'filterGroups', 'filterEmptyGroups']) {
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

            opts.renderItem = this.renderItem ?? createSlotBasedRenderFunc(this, 'item');

            opts.unrenderItem = this.unrenderItem;
            if (!opts.unrenderItem) {
                let fn = createSlotBasedUnrenderFunc(this, 'item');
                if (fn) {
                    opts.unrenderItem = (item, el) => fn(el);
                }
            }

            opts.renderNoResultsItem = this.computedRenderNoResultsItem ?? createSlotBasedRenderFunc(this, 'no-results-item');

            opts.unrenderNoResultsItem = this.computedUnrenderNoResultsItem;

            if (!opts.unrenderNoResultsItem) {
                let fn = createSlotBasedUnrenderFunc(this, 'no-results-item');
                if (fn) {
                    opts.unrenderNoResultsItem = (item, el) => fn(el);
                }
            }

            return opts;
        },

        additionalClassesList() {
            return this._concatClassesObject(this.additionalClasses);
        },

        listRef() {
            return this.nonReactive.instance;
        },
    },

    watch: {
        items(value) {
            if (this.nonReactive.instance) {
                const instance = this.nonReactive.instance;
                instance.setItems(Array.isArray(value) ? value : []);
                if (this.autoRelayoutOnItemsChange && instance.isVisible())
                    instance.relayout();
            }
        },

        [isVue3 ? 'modelValue' : 'value'](value, old) {
            if (Array.isArray(value) && Array.isArray(old) &&
                value.length === old && value.every((v, i) => old[i] === v))
                return;

            if (this.nonReactive.instance) {
                if (this.multi) {
                    this.nonReactive.instance.setCheckedValues(Array.isArray(value) ? value : value == null ? [] : [value]);
                } else {
                    this.nonReactive.instance.setSingleSelectedItemByValue(value === null ? undefined : value);
                }
            }
        },

        additionalClasses() {
            if (this.nonReactive.instance)
                this.nonReactive.instance.setAdditionalClasses(this.additionalClassesList);
        },

        direction(value) {
            if (this.nonReactive.instance)
                this.nonReactive.instance.setDirection(value);
        },

        noResultsText(value) {
            if (this.nonReactive.instance)
                this.nonReactive.instance.setNoResultsText(value ?? DefaultOptions.noResultsText);
        },

        filterThrottleWindow(value) {
            if (this.nonReactive.instance)
                this.nonReactive.instance.setFilterThrottleWindow(value ?? DefaultOptions.filterThrottleWindow ?? 0);
        },

        filterOnEmptyTerm(value) {
            if (this.nonReactive.instance)
                this.nonReactive.instance.setFilterOnEmptyTerm(value);
        },

        filterGroups(value) {
            if (this.nonReactive.instance)
                this.nonReactive.instance.setFilterGroups(value);
        },

        filterEmptyGroups(value) {
            if (this.nonReactive.instance)
                this.nonReactive.instance.setFilterEmptyGroups(value);
        },

        filterFn() {
            if (this.nonReactive.instance)
                this.nonReactive.instance.setFilterFn(this.filterFn);
        },

        renderItem() {
            this._recreateList();
        },

        unrenderItem() {
            this._recreateList();
        },

        renderNoResultsItem() {
            this._recreateList();
        },

        unrenderNoResultsItem() {
            this._recreateList();
        },

        searchable(v) {
            if (this.nonReactive.instance)
                this.nonReactive.instance.setSearchable(v);
            this.relayout();
        },

        isHeaderVisible(v) {
            if (this.nonReactive.instance)
                this.nonReactive.instance.setHeaderVisible(v);
            this.relayout();
        },

        positionOptions: {
            deep: true,
            handler() {
                this.relayout();
            },
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
                        : this.nonReactive.instance.getCheckedValues(false));
            }

            if (event === 'hide') {
                this._clearAutoRelayout();
            }

            if (event === 'show') {
                this.relayout();

                if (this.autoFocus) {
                    this.nonReactive.instance.el.focus();
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
                case 'blur':
                case 'show_subitems':
                case 'hide_subitems':
                case 'subitems:select':
                case 'subitems:blur':
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
            this.nonReactive.instance = list;

            this.nonReactive.sink.add(this.nonReactive.instance.el, 'keydown.vue', evt => {
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

            const headerRenderer = createSlotBasedRenderFunc(this, 'header');
            if (headerRenderer) {
                headerRenderer({}, list.getHeaderElement());
            }

            list.show();

            this._setupAutoRelayout();
        },

        _destroyList() {
            this._clearAutoRelayout();

            if (this.nonReactive.instance) {
                this.nonReactive.instance.destroy();
                this.nonReactive.instance = undefined;
            }

            this.el = undefined;

            this.nonReactive.sink.remove(null, '.vue');
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
            this.nonReactive.sink.remove(null, '.trackposition');
        },

        _setupAutoRelayout() {
            this._clearAutoRelayout();

            if (!this.nonReactive.instance)
                return;

            this.nonReactive.sink.add(window, 'resize.trackposition', () => this.relayout());

            let parent = this.nonReactive.instance.el.parentNode;
            while (parent) {
                if (parent.scrollHeight > parent.offsetHeight ||
                    parent.scrollWidth > parent.offsetWidth) {
                    if (parent === document.documentElement) {
                        parent = window;
                    }
                    this.nonReactive.sink.add(parent, 'scroll.trackposition', () => this.relayout());
                }
                parent = parent.parentNode;
            }
        },

        relayout() {
            if (this.nonReactive.instance)
                this.nonReactive.instance.relayout();
        },

        getHeaderElement() {
            if (this.nonReactive.instance)
                this.nonReactive.instance.getHeaderElement();
        },

        elContains(other, considerSublists = true) {
            return !!this.listRef?.elContains(other, considerSublists);
        },
    },
};
</script>
