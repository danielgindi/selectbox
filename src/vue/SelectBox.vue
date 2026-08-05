<template>
  <span :ref="v => el = v" />
</template>

<script lang="ts">
import { defineComponent, markRaw, version, type PropType } from 'vue';
import SelectBox, { DefaultOptions } from '../lib/SelectBox';
import { createSlotBasedRenderFunc, createSlotBasedUnrenderFunc } from './utils/slots';
import deepEqual from 'fast-deep-equal';
import type { SelectBoxOptions, DropListOptions, ItemBase } from '../lib/types.js';

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
 * 'search:term': search term has been updated, before results were re-filtered
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
    readOnly: {
        type: Boolean,
        required: false,
        default: null as any,
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
        type: Array as PropType<any[]>,
        required: false,
    },
    sortItemComparator: {
        type: Function as PropType<SelectBoxOptions['sortItemComparator']>,
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
        type: Function as PropType<SelectBoxOptions['multiPlaceholderFormatter']>,
        required: false,
        default: undefined as any,
    },
    blurOnSingleSelection: {
        type: [Boolean, String] as unknown as PropType<boolean | 'touch'>,
        default: 'touch',
        validator: (value: any) => {
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
    allowTypeToSelect: {
        type: Boolean,
        default: true,
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
    filterFn: {
        type: Function as PropType<SelectBoxOptions['filterFn']>,
        default: undefined as any,
    },
    onError: {
        type: Function as PropType<SelectBoxOptions['onError']>,
        default: undefined as any,
    },
    filterDependencies: {
        type: [Array, String, Number, Boolean, Object] as unknown as PropType<any>,
        default: undefined as any,
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
        type: String as PropType<'before' | 'after' | 'none'>,
        default: 'after',
        validator: (value: any) => {
            return ['before', 'after', 'none'].includes(value);
        },
    },
    items: {
        type: Array as PropType<ItemBase[]>,
        default: (): ItemBase[] => [],
    },
    [isVue3 ? 'modelValue' : 'value']: {
        type: [String, Number, Boolean, Object, Array, Symbol] as unknown as PropType<any>,
        default: undefined as any,
    },
    maxMultiItems: {
        type: Number,
        required: false,
    },
    multiItemsRestLabelProvider: {
        type: Function as PropType<SelectBoxOptions['multiItemsRestLabelProvider']>,
        required: false,
    },
    renderSingleItem: {
        type: Function as PropType<SelectBoxOptions['renderSingleItem']>,
        default: undefined as any,
    },
    unrenderSingleItem: {
        type: Function as PropType<SelectBoxOptions['unrenderSingleItem']>,
        default: undefined as any,
    },
    renderMultiItem: {
        type: Function as PropType<SelectBoxOptions['renderMultiItem']>,
        default: undefined as any,
    },
    unrenderMultiItem: {
        type: Function as PropType<SelectBoxOptions['unrenderMultiItem']>,
        default: undefined as any,
    },
    renderRestMultiItem: {
        type: Function as PropType<SelectBoxOptions['renderRestMultiItem']>,
        default: undefined as any,
    },
    unrenderRestMultiItem: {
        type: Function as PropType<SelectBoxOptions['unrenderRestMultiItem']>,
        default: undefined as any,
    },
    renderNoResultsItem: {
        type: Function as PropType<(item: ItemBase, itemEl: Element) => (any | false)>,
        default: undefined as any,
    },
    unrenderNoResultsItem: {
        type: Function as PropType<(item: ItemBase, itemEl: Element) => void>,
        default: undefined as any,
    },
    renderListItem: {
        type: Function as PropType<(item: ItemBase, itemEl: Element) => (any | false)>,
        default: undefined as any,
    },
    unrenderListItem: {
        type: Function as PropType<(item: ItemBase, itemEl: Element) => void>,
        default: undefined as any,
    },
    virtualMinItems: {
        type: Number,
        default: 10,
    },
    baseClass: {
        type: String,
        default: undefined as string | undefined,
    },
    droplistBaseClass: {
        type: String,
        default: undefined as string | undefined,
    },
    additionalClasses: {
        type: [Object, Array, String] as unknown as PropType<any>,
        default: undefined as any,
    },
    additionalDroplistClasses: {
        type: [Object, Array, String] as unknown as PropType<any>,
        default: undefined as any,
    },
    direction: {
        type: String,
        default: undefined as string | undefined,
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
        required: false,
    },
    clearInputWhen: {
        type: Array as PropType<string[]>,
        required: false,
        default: (): string[] => ['single_close', 'multi_select_single'],
        validator: (value: any) => {
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

export default defineComponent({
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
        'search:term',
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
            el: undefined as HTMLElement | undefined,
            isMounted: false,
            instance: undefined as SelectBox | undefined,
        };
    },

    computed: {
        computedListOptions(): DropListOptions {
            let opts: DropListOptions & { [key: string]: any } = {};

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
                    opts.unrenderItem = (item: any, el: any) => fn(el);
                }
            }

            opts.renderNoResultsItem = this.computedRenderNoResultsItem;
            opts.unrenderNoResultsItem = this.computedUnrenderNoResultsItem;

            return opts;
        },

        computedRenderSingleItem() {
            let render: any = this.renderSingleItem;

            if (!render) {
                render = createSlotBasedRenderFunc(this, 'single-item');
            }

            return render;
        },

        computedUnrenderSingleItem() {
            let unrender: any = this.unrenderSingleItem;

            if (!unrender) {
                let fn = createSlotBasedUnrenderFunc(this, 'single-item');
                if (fn) {
                    unrender = (item: any, el: any) => fn(el);
                }
            }

            return unrender;
        },

        computedRenderMultiItem() {
            let render: any = this.renderMultiItem;

            if (!render) {
                render = createSlotBasedRenderFunc(this, 'multi-item');
            }

            return render;
        },

        computedUnrenderMultiItem() {
            let unrender: any = this.unrenderMultiItem;

            if (!unrender) {
                let fn = createSlotBasedUnrenderFunc(this, 'multi-item');
                if (fn) {
                    unrender = (item: any, el: any) => fn(el);
                }
            }

            return unrender;
        },

        computedRenderRestMultiItem() {
            let render: any = this.renderRestMultiItem;

            if (!render) {
                render = createSlotBasedRenderFunc(this, 'rest-multi-item');
            }

            return render;
        },

        computedUnrenderRestMultiItem() {
            let unrender: any = this.unrenderRestMultiItem;

            if (!unrender) {
                let fn = createSlotBasedUnrenderFunc(this, 'rest-multi-item');
                if (fn) {
                    unrender = (item: any, el: any) => fn(el);
                }
            }

            return unrender;
        },

        computedRenderNoResultsItem() {
            let render: any = this.renderNoResultsItem;

            if (!render) {
                render = createSlotBasedRenderFunc(this, 'no-results-item');
            }

            return render;
        },

        computedUnrenderNoResultsItem() {
            let unrender: any = this.unrenderNoResultsItem;

            if (!unrender) {
                let fn = createSlotBasedUnrenderFunc(this, 'no-results-item');
                if (fn) {
                    unrender = (item: any, el: any) => fn(el);
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
            if (this.instance)
                this.instance.disable(value);
        },

        readOnly() {
            if (this.instance)
                this.instance.setReadOnly(this.readOnly ?? false);
        },

        clearable(value) {
            if (this.instance)
                this.instance.setClearable(value);
        },

        direction(value) {
            if (this.instance)
                this.instance.setDirection(value);
        },

        hasOpenIndicator(value) {
            if (this.instance)
                this.instance.setHasOpenIndicator(value);
        },

        placeholder(value) {
            if (this.instance)
                this.instance.setPlaceholder(value);
        },

        sortSelectedItems(value) {
            if (this.instance)
                this.instance.setSortSelectedItems(value);
        },

        sortListItems(value) {
            if (this.instance)
                this.instance.setSortListItems(value);
        },

        sortListCheckedFirst(value) {
            if (this.instance)
                this.instance.setSortListCheckedFirst(value);
        },

        stickyValues(value) {
            if (!this.instance) return;

            // `stickyValues` tend to be a literal array,
            //   and Vue will get a different reference for each update, triggering this watcher.
            // so use deepEqual here to avoid redoing the list items on each selection change.
            if (deepEqual(this.stickyValues, value)) return;

            this.instance.setStickyValues(value);
        },

        sortItemComparator(value) {
            if (this.instance)
                this.instance.setSortItemComparator(value);
        },

        splitListCheckedGroups(value) {
            if (this.instance)
                this.instance.setSplitListCheckedGroups(value);
        },

        showSelection(value) {
            if (this.instance)
                this.instance.setShowSelection(value);
        },

        showPlaceholderInTooltip(value) {
            if (this.instance)
                this.instance.setShowPlaceholderInTooltip(value);
        },

        multiPlaceholderFormatter(formatter) {
            if (this.instance)
                this.instance.setMultiPlaceholderFormatter(formatter);
        },

        showBlurOnSingleSelection(value) {
            if (this.instance)
                this.instance.setBlurOnSingleSelection(value);
        },

        multi(value) {
            if (this.instance)
                this.instance.setMulti(value);
        },

        searchable(value) {
            if (this.instance)
                this.instance.setSearchable(value);
        },

        allowTypeToSelect(value) {
            if (this.instance)
                this.instance.setAllowTypeToSelect(value);
        },

        noResultsText(value) {
            if (this.instance)
                this.instance.setNoResultsText(value ?? DefaultOptions.noResultsText);
        },

        filterThrottleWindow(value) {
            if (this.instance)
                this.instance.setFilterThrottleWindow(value ?? DefaultOptions.filterThrottleWindow ?? 0);
        },

        filterOnEmptyTerm(value) {
            if (this.instance)
                this.instance.setFilterOnEmptyTerm(value || false);
        },

        filterFn() {
            if (this.instance)
                this.instance.setFilterFn(this.filterFn);
        },

        onError() {
            if (this.instance)
                (this.instance as any).setOnError(this.onError);
        },

        labelProp(value) {
            if (this.instance)
                this.instance.setLabelProp(value);
        },

        valueProp(value) {
            if (this.instance)
                this.instance.setValueProp(value);
        },

        multiItemLabelProp(value) {
            if (this.instance)
                this.instance.setMultiItemLabelProp(value);
        },

        multiItemRemovePosition(value) {
            if (this.instance)
                this.instance.setMultiItemRemovePosition(value);
        },

        maxMultiItems(value) {
            if (this.instance)
                this.instance.setMaxMultiItems(value);
        },

        multiItemsRestLabelProvider(value) {
            if (this.instance)
                this.instance.setMultiItemsRestLabelProvider(value);
        },

        items(value) {
            if (this.instance) {
                this.instance.setItems(value, false);

                const modelValue = isVue3 ? this.modelValue : this.value;
                this.instance.setValue(modelValue === null && (!this.acceptNullAsValue || this.multi) ? undefined : modelValue);
            }
        },

        [isVue3 ? 'modelValue' : 'value'](value: any, old: any) {
            if (Array.isArray(value) && Array.isArray(old) &&
                (value.length as any) === old && value.every((v: any, i: number) => old[i] === v))
                return;

            if (this.instance)
                this.instance.setValue(value === null && (!this.acceptNullAsValue || this.multi) ? undefined : value);
        },

        renderSingleItem() {
            if (this.instance)
                this.instance.setRenderSingleItem(this.computedRenderSingleItem, this.computedUnrenderSingleItem);
        },

        unrenderSingleItem() {
            if (this.instance)
                this.instance.setRenderSingleItem(this.computedRenderSingleItem, this.computedUnrenderSingleItem);
        },

        renderMultiItem() {
            if (this.instance)
                this.instance.setRenderMultiItem(this.computedRenderMultiItem, this.computedUnrenderMultiItem);
        },

        unrenderMultiItem() {
            if (this.instance)
                this.instance.setRenderMultiItem(this.computedRenderMultiItem, this.computedUnrenderMultiItem);
        },

        renderRestMultiItem() {
            if (this.instance)
                this.instance.setRenderRestMultiItem(this.computedRenderRestMultiItem, this.computedUnrenderRestMultiItem);
        },

        unrenderRestMultiItem() {
            if (this.instance)
                this.instance.setRenderRestMultiItem(this.computedRenderRestMultiItem, this.computedUnrenderRestMultiItem);
        },

        renderNoResultsItem() {
            if (this.instance)
                (this.instance as any).setRenderNoResultsItem(this.computedRenderNoResultsItem, this.computedUnrenderNoResultsItem);
        },

        unrenderNoResultsItem() {
            if (this.instance)
                (this.instance as any).setRenderNoResultsItem(this.computedRenderNoResultsItem, this.computedUnrenderNoResultsItem);
        },

        renderListItem() {
            if (this.instance)
                this.instance.setListOptions(this.computedListOptions);
        },

        unrenderListItem() {
            if (this.instance)
                this.instance.setListOptions(this.computedListOptions);
        },

        ...(isVue3 ? {} : {
            $scopedSlots(this: any) { // Vue 2
                if (this.instance)
                    this.instance.setListOptions(this.computedListOptions);
            },
        } as Record<string, any>),

        $slots() {
            if (this.instance)
                this.instance.setListOptions(this.computedListOptions);
        },

        additionalClasses() {
            if (this.instance)
                this.instance.setAdditionalClasses(this.additionalClassesList);
        },

        isLoadingMode() {
            if (this.instance)
                this.instance.setIsLoadingMode(!!this.isLoadingMode);
        },

        closeListWhenLoading() {
            if (this.instance)
                this.instance.setCloseListWhenLoading(this.closeListWhenLoading ?? DefaultOptions.closeListWhenLoading);
        },

        clearInputWhen() {
            if (this.instance)
                this.instance.setClearInputWhen(this.clearInputWhen);
        },

        treatGroupSelectionAsItems() {
            if (this.instance)
                this.instance.setTreatGroupSelectionAsItems(!!this.treatGroupSelectionAsItems);
        },

        filterDependencies: {
            deep: true,
            handler() {
                if (this.instance)
                    this.instance.invokeRefilter();
            },
        },

        el(v) {
            if (v) {
                if (this.isMounted) {
                    this._createBox();

                    if (window.ResizeObserver === undefined) {
                        const wasAttached = (this as any)._isAttached;
                        (this as any)._isAttached = !!this.el && document.body.contains(this.el);
                        if (!wasAttached && this.instance && (this as any)._isAttached)
                            this.instance.refreshSize();
                    }
                }
            } else {
                this._destroyBox();
            }
        },
    },

    mounted() {
        this.isMounted = true;

        this._createBox();

        if (window.ResizeObserver === undefined && this.instance) {
            const wasAttached = (this as any)._isAttached;
            (this as any)._isAttached = !!this.$refs.el && document.body.contains(this.$refs.el as Node);
            if (!wasAttached && this.instance && (this as any)._isAttached)
                this.instance.refreshSize();
        }
    },

    unmounted() {
        this.isMounted = false;
    },

    methods: {
        _handleBoxEvents(event: string, data?: any) {
            switch (event) {
                case 'clear:before':
                case 'clear':
                case 'open':
                case 'close':
                case 'search:focus':
                case 'search:blur':
                case 'search:term':
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
                (event === 'addsel' && !(event as any).isCheckingGroup) ||
                (event === 'removesel' && !(event as any).isCheckingGroup)) {
                let value = event === 'select' ? data.value : this.instance.getValue();
                if (value === undefined && event !== 'select' && this.emitNullForEmptyValue)
                    value = null;
                (this.$emit as any)(isVue3 ? 'update:modelValue' : 'input', value);
            }
        },

        _createBox() {
            this._destroyBox();

            if (!this.el)
                return;

            let box = new SelectBox(<SelectBoxOptions & { baseClass?: any }>{
                el: this.el,
                baseClass: this.baseClass,
                direction: this.direction,
                disabled: this.disabled,
                readOnly: this.readOnly ?? false,
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
                allowTypeToSelect: this.allowTypeToSelect,
                noResultsText: this.noResultsText ?? DefaultOptions.noResultsText,
                filterThrottleWindow: this.filterThrottleWindow ?? DefaultOptions.filterThrottleWindow ?? 0,
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
                onError: this.onError,
                on: this._handleBoxEvents.bind(this),
                additionalClasses: this.additionalClassesList,
                isLoadingMode: this.isLoadingMode,
                closeListWhenLoading: this.closeListWhenLoading ?? DefaultOptions.closeListWhenLoading,
                clearInputWhen: this.clearInputWhen,
                treatGroupSelectionAsItems: this.treatGroupSelectionAsItems,
            });

            const modelValue = isVue3 ? this.modelValue : this.value;
            box.setValue(modelValue === null && (!this.acceptNullAsValue || this.multi) ? undefined : modelValue);

            this.instance = markRaw(box);
            this.el = box.el;
        },

        _destroyBox() {
            if (this.instance) {
                this.instance.destroy();
                this.instance = undefined;
            }
        },

        _concatClassesObject(classes: any) {
            if (Array.isArray(classes)) {
                return classes.join(' ');
            }
            else if (classes && typeof classes === 'object') {
                let arr: string[] = [];
                for (let [key, value] of Object.entries(classes)) {
                    if (value)
                        arr.push(key);
                }
                return arr.join(' ');
            }

            return classes || '';
        },

        toggleLoading(on?: boolean) {
            if (this.instance)
                this.instance.toggleLoading(on);
        },

        toggleList(open?: boolean) {
            if (this.instance)
                this.instance.toggleList(open);
        },

        openList() {
            if (this.instance)
                this.instance.openList();
        },

        closeList() {
            if (this.instance)
                this.instance.closeList();
        },

        isListOpen() {
            if (this.instance)
                return this.instance.isListOpen();
            return false;
        },

        updateItemByValue(value: any, newItem: ItemBase) {
            if (this.instance)
                return this.instance.updateItemByValue(value, newItem);
        },

        getSelectedItems() {
            if (this.instance)
                return this.instance.getSelectedItems();
            return [];
        },

        /**
         * @param {string} term
         * @param {boolean} [performSearch=false] should actually perform the search, or just set the input's text?
         */
        setSearchTerm(term: string, performSearch?: boolean) {
            if (term != null && this.instance)
                this.instance.setSearchTerm(term, performSearch);
        },

        /**
         * @returns {string}
         */
        getSearchTerm() {
            if (this.instance)
                return this.instance.getSearchTerm();
            return '';
        },

        /**
         * @returns {number}
         */
        getFilteredItemCount() {
            if (this.instance)
                return this.instance.getFilteredItemCount();
            return 0;
        },

        /**
         * @returns {boolean}
         */
        isFilterPending() {
            if (this.instance)
                return this.instance.isFilterPending();
            return false;
        },

        focus() {
            this.instance?.focusInput();
        },

        blur() {
            this.instance?.blurInput();
        },

        droplistElContains(other: any, considerSublists = true) {
            return this.instance?.droplistElContains(other, considerSublists);
        },
    },
});
</script>
