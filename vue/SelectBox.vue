<template>
  <span ref="el" />
</template>

<script>
import { version } from 'vue';
import SelectBox from '../lib/SelectBox';
import { createSlotBasedRenderFunc, createSlotBasedUnrenderFunc } from './utils/slots';
import deepEqual from 'fast-deep-equal';

const isVue3 = version > '3.';

/**
 * Events:
 * 'clear:before': `{cancel: false}` - will clear the whole selection. return false to abort.
 * 'clear': clearead the whole selection.
 * 'open': `{ list: DropList `}: the drop list is opening
 * 'open:before': `{ list: DropList `}: the drop list will open
 * 'close': the drop list is closing
 * 'addsel:before': `{value, item, cancel: false}` - an item selection is about to be added (in multi mode). return false to abort.
 * 'removesel:before: `{value, item, cancel: false}` - an item selection is about to be removed (in multi mode). return false to abort.
 * 'select:before': `{value, item, cancel: false}` - an item is about to be selected (in single mode). return false to abort.
 * 'addsel': `{value, item}` - an item selection has been added (in multi mode)
 * 'removesel': `{value, item}` - an item selection has been removed (in multi mode)
 * 'select': `{value, item}` - an item has been selected (in single mode)
 * 'search': `string` - input box value has changed
 * 'search:focus': input box has gained focus
 * 'search:blur': input box has lost focus
 * 'input:resize': input box resized
 * 'input' (Vue v2): (on select, clear, addsel, removesel) - fired after any of the above events.
 * 'update:modelValue' (Vue v3): (on select, clear, addsel, removesel) - fired after any of the above events.
 * 'itemschanged': `{term, mutated, count}` = the current set of items has changed
 *
 * Slots:
 * list-item, single-item, multi-item, rest-multi-item, no-results-item
 */

export const PropTypes = {
    disabled: {
        type: Boolean,
        default: false,
    },
    clearable: {
        type: Boolean,
        default: true,
    },
    hasOpenIndicator: {
        type: Boolean,
        default: true,
    },
    placeholder: {
        type: String,
        default: '',
    },
    sortSelectedItems: {
        type: Boolean,
        default: true,
    },
    sortListItems: {
        type: Boolean,
        default: false,
    },
    sortListCheckedFirst: {
        type: Boolean,
        default: true,
    },
    stickyValues: {
        type: Array,
        required: false,
    },
    sortItemComparator: {
        type: Function,
        required: false,
    },
    splitListCheckedGroups: {
        type: Boolean,
        default: true,
    },
    showSelection: {
        type: Boolean,
        default: true,
    },
    showPlaceholderInTooltip: {
        type: Boolean,
        default: true,
    },
    multiPlaceholderFormatter: {
        type: Function,
        required: false,
        default: undefined,
    },
    blurOnSingleSelection: {
        type: [Boolean, String],
        default: 'touch',
        validator: value => {
            return [true, false, 'touch', null].includes(value);
        },
    },
    multi: {
        type: Boolean,
        default: false,
    },
    searchable: {
        type: Boolean,
        default: true,
    },
    noResultsText: {
        type: String,
        default: 'No matching results',
    },
    filterThrottleWindow: {
        type: Number,
        default: 300,
    },
    filterOnEmptyTerm: {
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
    labelProp: {
        type: String,
        default: 'label',
    },
    valueProp: {
        type: String,
        default: 'value',
    },
    multiItemLabelProp: {
        type: String,
        default: 'short_label',
    },
    multiItemRemovePosition: {
        type: String,
        default: 'after',
        validator: value => {
            return ['before', 'after', 'none'].includes(value);
        },
    },
    items: {
        type: Array,
        default: () => [],
    },
    [isVue3 ? 'modelValue' : 'value']: {
        type: [String, Number, Boolean, Object, Array, Symbol],
        default: undefined,
    },
    maxMultiItems: {
        type: Number,
        required: false,
    },
    multiItemsRestLabelProvider: {
        type: Function,
        required: false,
    },
    renderSingleItem: {
        type: Function,
        default: undefined,
    },
    unrenderSingleItem: {
        type: Function,
        default: undefined,
    },
    renderMultiItem: {
        type: Function,
        default: undefined,
    },
    unrenderMultiItem: {
        type: Function,
        default: undefined,
    },
    renderRestMultiItem: {
        type: Function,
        default: undefined,
    },
    unrenderRestMultiItem: {
        type: Function,
        default: undefined,
    },
    renderNoResultsItem: {
        type: Function,
        default: undefined,
    },
    unrenderNoResultsItem: {
        type: Function,
        default: undefined,
    },
    renderListItem: {
        type: Function,
        default: undefined,
    },
    unrenderListItem: {
        type: Function,
        default: undefined,
    },
    virtualMinItems: {
        type: Number,
        default: 10,
    },
    baseClass: {
        type: String,
        default: undefined,
    },
    droplistBaseClass: {
        type: String,
        default: undefined,
    },
    additionalClasses: {
        type: [Object, Array, String],
        default: undefined,
    },
    additionalDroplistClasses: {
        type: [Object, Array, String],
        default: undefined,
    },
    direction: {
        type: String,
        default: undefined,
    },
    fixedDroplistWidth: {
        type: Boolean,
        default: false,
    },
    acceptNullAsValue: {
        type: Boolean,
        default: false,
    },
    emitNullForEmptyValue: {
        type: Boolean,
        default: false,
    },
    isLoadingMode: {
        type: Boolean,
        default: false,
    },
    closeListWhenLoading: {
        type: Boolean,
        default: true,
    },
    clearInputWhen: {
        type: Array,
        required: false,
        default: () => ['single_close', 'multi_select_single'],
        validator: value => {
            if (value && !Array.isArray(value))
                return false;
            for (let v of value) {
                if (!['single_close', 'multi_close', 'multi_select_single'].includes(v))
                    return false;
            }
            return true;
        },
    },
    treatGroupSelectionAsItems: {
        type: Boolean,
        default: false,
    },
    autoCheckGroupChildren: {
        type: Boolean,
        default: true,
    },
    constrainListToWindow: {
        type: Boolean,
        default: true,
    },
    autoFlipListDirection: {
        type: Boolean,
        default: true,
    },
};

export default {
    inheritAttrs: false,

    props: PropTypes,

    emits: [
        'update:modelValue',
        'clear:before',
        'clear',
        'open',
        'close',
        'search:focus',
        'search:blur',
        'addsel:before',
        'addsel',
        'removesel:before',
        'removesel',
        'select:before',
        'select',
        'input:resize',
        'itemschanged',
        'search',
    ],

    data() {
        return {
            el: undefined,

            nonReactive: Object.seal({
                instance: undefined,
            }),
        };
    },

    computed: {
        computedListOptions() {
            let opts = {};

            if (this.droplistBaseClass) {
                opts.baseClassName = this.droplistBaseClass;
            }

            if (this.additionalDroplistClassesList) {
                opts.additionalClasses = this.additionalDroplistClassesList;
            }

            if (typeof this.autoCheckGroupChildren === 'boolean' && this.multi) {
                opts.autoCheckGroupChildren = this.autoCheckGroupChildren;
            }

            if (typeof this.constrainListToWindow === 'boolean') {
                opts.constrainToWindow = this.constrainListToWindow;
            }

            if (typeof this.autoFlipListDirection === 'boolean') {
                opts.autoFlipDirection = this.autoFlipListDirection;
            }

            opts.virtualMinItems = this.virtualMinItems;
            opts.useExactTargetWidth = this.fixedDroplistWidth;

            opts.renderItem = this.renderListItem;
            if (!opts.renderItem) {
                opts.renderItem = createSlotBasedRenderFunc(this, 'list-item');
            }

            opts.unrenderItem = this.unrenderListItem;
            if (!opts.unrenderItem) {
                let fn = createSlotBasedUnrenderFunc(this, 'list-item');
                if (fn) {
                    opts.unrenderItem = (item, el) => fn(el);
                }
            }

            opts.renderNoResultsItem = this.renderNoResultsItem;
            if (!opts.renderNoResultsItem) {
                opts.renderNoResultsItem = createSlotBasedRenderFunc(this, 'rest-multi-item');
            }

            opts.unrenderNoResultsItem = this.unrenderNoResultsItem;
            if (!opts.unrenderNoResultsItem) {
                let fn = createSlotBasedUnrenderFunc(this, 'rest-multi-item');
                if (fn) {
                    opts.unrenderNoResultsItem = (item, el) => fn(el);
                }
            }

            return opts;
        },

        computedRenderSingleItem() {
            let render = this.renderSingleItem;

            if (!render) {
                render = createSlotBasedRenderFunc(this, 'single-item');
            }

            return render;
        },

        computedUnrenderSingleItem() {
            let unrender = this.unrenderSingleItem;

            if (!unrender) {
                let fn = createSlotBasedUnrenderFunc(this, 'single-item');
                if (fn) {
                    unrender = (item, el) => fn(el);
                }
            }

            return unrender;
        },

        computedRenderMultiItem() {
            let render = this.renderMultiItem;

            if (!render) {
                render = createSlotBasedRenderFunc(this, 'multi-item');
            }

            return render;
        },

        computedUnrenderMultiItem() {
            let unrender = this.unrenderMultiItem;

            if (!unrender) {
                let fn = createSlotBasedUnrenderFunc(this, 'multi-item');
                if (fn) {
                    unrender = (item, el) => fn(el);
                }
            }

            return unrender;
        },

        computedRenderRestMultiItem() {
            let render = this.renderRestMultiItem;

            if (!render) {
                render = createSlotBasedRenderFunc(this, 'rest-multi-item');
            }

            return render;
        },

        computedUnrenderRestMultiItem() {
            let unrender = this.unrenderRestMultiItem;

            if (!unrender) {
                let fn = createSlotBasedUnrenderFunc(this, 'rest-multi-item');
                if (fn) {
                    unrender = (item, el) => fn(el);
                }
            }

            return unrender;
        },

        computedRenderNoResultsItem() {
            let render = this.renderNoResultsItem;

            if (!render) {
                render = createSlotBasedRenderFunc(this, 'no-results-item');
            }

            return render;
        },

        computedUnrenderNoResultsItem() {
            let unrender = this.unrenderNoResultsItem;

            if (!unrender) {
                let fn = createSlotBasedUnrenderFunc(this, 'no-results-item');
                if (fn) {
                    unrender = (item, el) => fn(el);
                }
            }

            return unrender;
        },

        additionalClassesList() {
            return this._concatClassesObject(this.additionalClasses);
        },

        additionalDroplistClassesList() {
            return this._concatClassesObject(this.additionalDroplistClasses);
        },
    },

    watch: {
        disabled(value) {
            if (this.nonReactive.instance)
                this.nonReactive.instance.disable(value);
        },

        clearable(value) {
            if (this.nonReactive.instance)
                this.nonReactive.instance.setClearable(value);
        },

        direction(value) {
            if (this.nonReactive.instance)
                this.nonReactive.instance.setDirection(value);
        },

        hasOpenIndicator(value) {
            if (this.nonReactive.instance)
                this.nonReactive.instance.setHasOpenIndicator(value);
        },

        placeholder(value) {
            if (this.nonReactive.instance)
                this.nonReactive.instance.setPlaceholder(value);
        },

        sortSelectedItems(value) {
            if (this.nonReactive.instance)
                this.nonReactive.instance.setSortSelectedItems(value);
        },

        sortListItems(value) {
            if (this.nonReactive.instance)
                this.nonReactive.instance.setSortListItems(value);
        },

        sortListCheckedFirst(value) {
            if (this.nonReactive.instance)
                this.nonReactive.instance.setSortListCheckedFirst(value);
        },

        stickyValues(value) {
            if (!this.nonReactive.instance) return;

            // `stickyValues` tend to be a literal array,
            //   and Vue will get a different reference for each update, triggering this watcher.
            // so use deepEqual here to avoid redoing the list items on each selection change.
            if (deepEqual(this.stickyValues, value)) return;

            this.nonReactive.instance.setStickyValues(value);
        },

        sortItemComparator(value) {
            if (this.nonReactive.instance)
                this.nonReactive.instance.setSortItemComparator(value);
        },

        splitListCheckedGroups(value) {
            if (this.nonReactive.instance)
                this.nonReactive.instance.setSplitListCheckedGroups(value);
        },

        showSelection(value) {
            if (this.nonReactive.instance)
                this.nonReactive.instance.setShowSelection(value);
        },

        showPlaceholderInTooltip(value) {
            if (this.nonReactive.instance)
                this.nonReactive.instance.setShowPlaceholderInTooltip(value);
        },

        multiPlaceholderFormatter(formatter) {
            if (this.nonReactive.instance)
                this.nonReactive.instance.setMultiPlaceholderFormatter(formatter);
        },

        showBlurOnSingleSelection(value) {
            if (this.nonReactive.instance)
                this.nonReactive.instance.setBlurOnSingleSelection(value);
        },

        multi(value) {
            if (this.nonReactive.instance)
                this.nonReactive.instance.setMulti(value);
        },

        searchable(value) {
            if (this.nonReactive.instance)
                this.nonReactive.instance.setSearchable(value);
        },

        noResultsText(value) {
            if (this.nonReactive.instance)
                this.nonReactive.instance.setNoResultsText(value);
        },

        filterThrottleWindow(value) {
            if (this.nonReactive.instance)
                this.nonReactive.instance.setFilterThrottleWindow(value || 0);
        },

        filterOnEmptyTerm(value) {
            if (this.nonReactive.instance)
                this.nonReactive.instance.setFilterOnEmptyTerm(value || false);
        },

        filterFn() {
            if (this.nonReactive.instance)
                this.nonReactive.instance.setFilterFn(this.filterFn);
        },

        labelProp(value) {
            if (this.nonReactive.instance)
                this.nonReactive.instance.setLabelProp(value);
        },

        valueProp(value) {
            if (this.nonReactive.instance)
                this.nonReactive.instance.setValueProp(value);
        },

        multiItemLabelProp(value) {
            if (this.nonReactive.instance)
                this.nonReactive.instance.setMultiItemLabelProp(value);
        },

        multiItemRemovePosition(value) {
            if (this.nonReactive.instance)
                this.nonReactive.instance.setMultiItemRemovePosition(value);
        },

        maxMultiItems(value) {
            if (this.nonReactive.instance)
                this.nonReactive.instance.setMaxMultiItems(value);
        },

        multiItemsRestLabelProvider(value) {
            if (this.nonReactive.instance)
                this.nonReactive.instance.setMultiItemsRestLabelProvider(value);
        },

        items(value) {
            if (this.nonReactive.instance) {
                this.nonReactive.instance.setItems(value, false);

                const modelValue = isVue3 ? this.modelValue : this.value;
                this.nonReactive.instance.setValue(modelValue === null && (!this.acceptNullAsValue || this.multi) ? undefined : modelValue);
            }
        },

        [isVue3 ? 'modelValue' : 'value'](value, old) {
            if (Array.isArray(value) && Array.isArray(old) &&
                value.length === old && value.every((v, i) => old[i] === v))
                return;

            if (this.nonReactive.instance)
                this.nonReactive.instance.setValue(value === null && (!this.acceptNullAsValue || this.multi) ? undefined : value);
        },

        renderSingleItem() {
            if (this.nonReactive.instance)
                this.nonReactive.instance.setRenderSingleItem(this.computedRenderSingleItem, this.computedUnrenderSingleItem);
        },

        unrenderSingleItem() {
            if (this.nonReactive.instance)
                this.nonReactive.instance.setRenderSingleItem(this.computedRenderSingleItem, this.computedUnrenderSingleItem);
        },

        renderMultiItem() {
            if (this.nonReactive.instance)
                this.nonReactive.instance.setRenderMultiItem(this.computedRenderMultiItem, this.computedUnrenderMultiItem);
        },

        unrenderMultiItem() {
            if (this.nonReactive.instance)
                this.nonReactive.instance.setRenderMultiItem(this.computedRenderMultiItem, this.computedUnrenderMultiItem);
        },

        renderRestMultiItem() {
            if (this.nonReactive.instance)
                this.nonReactive.instance.setRenderRestMultiItem(this.computedRenderRestMultiItem, this.computedUnrenderRestMultiItem);
        },

        unrenderRestMultiItem() {
            if (this.nonReactive.instance)
                this.nonReactive.instance.setRenderRestMultiItem(this.computedRenderRestMultiItem, this.computedUnrenderRestMultiItem);
        },

        renderNoResultsItem() {
            if (this.nonReactive.instance)
                this.nonReactive.instance.setRenderNoResultsItem(this.computedRenderNoResultsItem, this.computedUnrenderNoResultsItem);
        },

        unrenderNoResultsItem() {
            if (this.nonReactive.instance)
                this.nonReactive.instance.setRenderNoResultsItem(this.computedRenderNoResultsItem, this.computedUnrenderNoResultsItem);
        },

        renderListItem() {
            if (this.nonReactive.instance)
                this.nonReactive.instance.setListOptions(this.computedListOptions);
        },

        unrenderListItem() {
            if (this.nonReactive.instance)
                this.nonReactive.instance.setListOptions(this.computedListOptions);
        },

        ...(isVue3 ? {} : {
            $scopedSlots() { // Vue 2
                if (this.nonReactive.instance)
                    this.nonReactive.instance.setListOptions(this.computedListOptions);
            },
        }),

        $slots() {
            if (this.nonReactive.instance)
                this.nonReactive.instance.setListOptions(this.computedListOptions);
        },

        additionalClasses() {
            if (this.nonReactive.instance)
                this.nonReactive.instance.setAdditionalClasses(this.additionalClassesList);
        },

        isLoadingMode() {
            if (this.nonReactive.instance)
                this.nonReactive.instance.setIsLoadingMode(!!this.isLoadingMode);
        },

        closeListWhenLoading() {
            if (this.nonReactive.instance)
                this.nonReactive.instance.setCloseListWhenLoading(!!this.closeListWhenLoading);
        },

        clearInputWhen() {
            if (this.nonReactive.instance)
                this.nonReactive.instance.setClearInputWhen(this.clearInputWhen);
        },

        treatGroupSelectionAsItems() {
            if (this.nonReactive.instance)
                this.nonReactive.instance.setTreatGroupSelectionAsItems(!!this.treatGroupSelectionAsItems);
        },

        filterDependencies: {
            deep: true,
            handler() {
                if (this.nonReactive.instance)
                    this.nonReactive.instance.invokeRefilter();
            },
        },
    },

    mounted() {
        this._createBox();

        if (window.ResizeObserver === undefined) {
            this._isAttached = !!this.$refs.el && document.body.contains(this.$refs.el);

            this.$nextTick(() => {
                if (this.nonReactive.instance && this._isAttached)
                    this.nonReactive.instance.refreshSize();
            });
        }
    },

    updated() {
        if (this.$refs.el && this.el !== this.$refs.el) {
            this._createBox();
        }

        if (window.ResizeObserver === undefined) {
            const wasAttached = this._isAttached;
            this._isAttached = !!this.$refs.el && document.body.contains(this.$refs.el);
            if (!wasAttached && this.nonReactive.instance && this._isAttached)
                this.nonReactive.instance.refreshSize();
        }
    },

    [isVue3 ? 'unmounted' : 'destroyed']() {
        this._destroyBox();
    },

    methods: {
        _handleBoxEvents(event, data) {
            switch (event) {
                case 'clear:before':
                case 'clear':
                case 'open':
                case 'close':
                case 'search:focus':
                case 'search:blur':
                case 'addsel:before':
                case 'addsel':
                case 'removesel:before':
                case 'removesel':
                case 'select:before':
                case 'select':
                case 'input:resize':
                case 'itemschanged':
                    this.$emit(event, ...(data === undefined ? [] : [data]));
                    break;

                case 'search':
                    this.$emit(event, data.value);
                    break;
            }

            if (event === 'select' ||
                event === 'clear' ||
                event === 'groupcheck' ||
                (event === 'addsel' && !event.isCheckingGroup) ||
                (event === 'removesel' && !event.isCheckingGroup)) {
                let value = event === 'select' ? data.value : this.nonReactive.instance.getValue();
                if (value === undefined && event !== 'select' && this.emitNullForEmptyValue)
                    value = null;
                this.$emit(isVue3 ? 'update:modelValue' : 'input', value);
            }
        },

        _createBox() {
            this._destroyBox();

            this.el = this.$refs.el;
            if (!this.el)
                return;

            let box = new SelectBox({
                el: this.el,
                baseClass: this.baseClass,
                direction: this.direction,
                disabled: this.disabled,
                clearable: this.clearable,
                hasOpenIndicator: this.hasOpenIndicator,
                placeholder: this.placeholder,
                sortSelectedItems: this.sortSelectedItems,
                sortListItems: this.sortListItems,
                sortListCheckedFirst: this.sortListCheckedFirst,
                stickyValues: this.stickyValues,
                sortItemComparator: this.sortItemComparator,
                splitListCheckedGroups: this.splitListCheckedGroups,
                showSelection: this.showSelection,
                showPlaceholderInTooltip: this.showPlaceholderInTooltip,
                multiPlaceholderFormatter: this.multiPlaceholderFormatter,
                blurOnSingleSelection: this.blurOnSingleSelection,
                multi: this.multi,
                searchable: this.searchable,
                noResultsText: this.noResultsText,
                filterThrottleWindow: this.filterThrottleWindow,
                filterOnEmptyTerm: this.filterOnEmptyTerm,
                labelProp: this.labelProp,
                valueProp: this.valueProp,
                multiItemLabelProp: this.multiItemLabelProp,
                multiItemRemovePosition: this.multiItemRemovePosition,
                maxMultiItems: this.maxMultiItems,
                multiItemsRestLabelProvider: this.multiItemsRestLabelProvider,
                items: this.items,
                listOptions: this.computedListOptions,
                renderSingleItem: this.computedRenderSingleItem,
                unrenderSingleItem: this.computedUnrenderSingleItem,
                renderMultiItem: this.computedRenderMultiItem,
                unrenderMultiItem: this.computedUnrenderMultiItem,
                renderRestMultiItem: this.computedRenderRestMultiItem,
                unrenderRestMultiItem: this.computedUnrenderRestMultiItem,
                filterFn: this.filterFn,
                on: this._handleBoxEvents.bind(this),
                additionalClasses: this.additionalClassesList,
                isLoadingMode: this.isLoadingMode,
                closeListWhenLoading: this.closeListWhenLoading,
                clearInputWhen: this.clearInputWhen,
                treatGroupSelectionAsItems: this.treatGroupSelectionAsItems,
            });

            const modelValue = isVue3 ? this.modelValue : this.value;
            box.setValue(modelValue === null && (!this.acceptNullAsValue || this.multi) ? undefined : modelValue);

            this.nonReactive.instance = box;
            this.el = box.el;
        },

        _destroyBox() {
            if (this.nonReactive.instance) {
                this.nonReactive.instance.destroy();
                this.nonReactive.instance = undefined;
            }

            this.el = undefined;
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

        toggleLoading(on) {
            if (this.nonReactive.instance)
                this.nonReactive.instance.toggleLoading(on);
        },

        toggleList(open) {
            if (this.nonReactive.instance)
                this.nonReactive.instance.toggleList(open);
        },

        openList() {
            if (this.nonReactive.instance)
                this.nonReactive.instance.openList();
        },

        closeList() {
            if (this.nonReactive.instance)
                this.nonReactive.instance.closeList();
        },

        isListOpen() {
            if (this.nonReactive.instance)
                return this.nonReactive.instance.isListOpen();
            return false;
        },

        updateItemByValue(value, newItem) {
            if (this.nonReactive.instance)
                return this.nonReactive.instance.updateItemByValue(value, newItem);
        },

        getSelectedItems() {
            if (this.nonReactive.instance)
                return this.nonReactive.instance.getSelectedItems();
            return [];
        },

        /**
         * @param {string} term
         * @param {boolean} [performSearch=false] should actually perform the search, or just set the input's text?
         */
        setSearchTerm(term, performSearch) {
            if (term != null && this.nonReactive.instance)
                this.nonReactive.instance.setSearchTerm(term, performSearch);
        },

        /**
         * @returns {string}
         */
        getSearchTerm() {
            if (this.nonReactive.instance)
                return this.nonReactive.instance.getSearchTerm();
            return '';
        },

        /**
         * @returns {number}
         */
        getFilteredItemCount() {
            if (this.nonReactive.instance)
                return this.nonReactive.instance.getFilteredItemCount();
            return 0;
        },

        /**
         * @returns {boolean}
         */
        isFilterPending() {
            if (this.nonReactive.instance)
                return this.nonReactive.instance.isFilterPending();
            return false;
        },

        focus() {
            this.nonReactive.instance?.focusInput();
        },

        blur() {
            this.nonReactive.instance?.blurInput();
        },

        droplistElContains(other, considerSublists = true) {
            return this.nonReactive.instance?.droplistElContains(other, considerSublists);
        },
    },
};
</script>
