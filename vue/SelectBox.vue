<template>
  <span ref="el" />
</template>

<script>
    import SelectBox from '../lib/SelectBox';
    import { createSlotBasedRenderFunc, createSlotBasedUnrenderFunc } from './utils/slots';
    import deepEqual from 'fast-deep-equal';

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
     * 'input': (on select, clear, addsel, removesel)
     * 'itemschanged': `{term, mutated, count}` = the current set of items has changed
     *
     * Slots:
     * list-item, single-item, multi-item, rest-multi-item, no-results-item
     */

    export default {
        props: {
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
            items: {
                type: Array,
                default: () => [],
            },
            value: {
                type: [String, Number, Boolean, Object, Array],
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
            filterFn: {
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
            fixedDroplistWidth: {
                type: Boolean,
                default: false,
            },
            useNullForEmptyValue: {
                type: Boolean,
                default: false,
            },
            isLoadingMode: {
                type: Boolean,
                default: false,
            },
        },

        data() {
            return {
                el: undefined,
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
                if (this._box)
                    this._box.disable(value);
            },

            clearable(value) {
                if (this._box)
                    this._box.setClearable(value);
            },

            hasOpenIndicator(value) {
                if (this._box)
                    this._box.setHasOpenIndicator(value);
            },

            placeholder(value) {
                if (this._box)
                    this._box.setPlaceholder(value);
            },

            sortSelectedItems(value) {
                if (this._box)
                    this._box.setSortSelectedItems(value);
            },

            sortListItems(value) {
                if (this._box)
                    this._box.setSortListItems(value);
            },

            sortListCheckedFirst(value) {
                if (this._box)
                    this._box.setSortListCheckedFirst(value);
            },

            stickyValues(value) {
                if (!this._box) return;

                // `stickyValues` tend to be a literal array,
                //   and Vue will get a different reference for each update, triggering this watcher.
                // so use deepEqual here to avoid redoing the list items on each selection change.
                if (deepEqual(this.stickyValues, value)) return;

                this._box.setStickyValues(value);
            },

            sortItemComparator(value) {
                if (this._box)
                    this._box.setSortItemComparator(value);
            },

            splitListCheckedGroups(value) {
                if (this._box)
                    this._box.setSplitListCheckedGroups(value);
            },

            showSelection(value) {
                if (this._box)
                    this._box.setShowSelection(value);
            },

            multiPlaceholderFormatter(formatter) {
                if (this._box)
                    this._box.setMultiPlaceholderFormatter(formatter);
            },

            showBlurOnSingleSelection(value) {
                if (this._box)
                    this._box.setBlurOnSingleSelection(value);
            },

            multi(value) {
                if (this._box)
                    this._box.setMulti(value);
            },

            searchable(value) {
                if (this._box)
                    this._box.setSearchable(value);
            },

            noResultsText(value) {
                if (this._box)
                    this._box.setNoResultsText(value);
            },

            filterThrottleWindow(value) {
                if (this._box)
                    this._box.setFilterThrottleWindow(value || 0);
            },

            filterOnEmptyTerm(value) {
                if (this._box)
                    this._box.setFilterOnEmptyTerm(value || false);
            },

            labelProp(value) {
                if (this._box)
                    this._box.setLabelProp(value);
            },

            valueProp(value) {
                if (this._box)
                    this._box.setValueProp(value);
            },

            multiItemLabelProp(value) {
                if (this._box)
                    this._box.setMultiItemLabelProp(value);
            },

            maxMultiItems(value) {
                if (this._box)
                    this._box.setMaxMultiItems(value);
            },

            multiItemsRestLabelProvider(value) {
                if (this._box)
                    this._box.setMultiItemsRestLabelProvider(value);
            },

            items(value) {
                if (this._box) {
                    this._box.setItems(value, false);
                    this._box.setValue(this.value === null ? undefined : this.value);
                }
            },

            value(value, old) {
                if (Array.isArray(value) && Array.isArray(old) &&
                    value.length === old && value.every((v, i) => old[i] === v))
                    return;

                if (this._box)
                    this._box.setValue(value === null ? undefined : value);
            },

            renderSingleItem() {
                if (this._box)
                    this._box.setRenderSingleItem(this.computedRenderSingleItem, this.computedUnrenderSingleItem);
            },

            unrenderSingleItem() {
                if (this._box)
                    this._box.setRenderSingleItem(this.computedRenderSingleItem, this.computedUnrenderSingleItem);
            },

            renderMultiItem() {
                if (this._box)
                    this._box.setRenderMultiItem(this.computedRenderMultiItem, this.computedUnrenderMultiItem);
            },

            unrenderMultiItem() {
                if (this._box)
                    this._box.setRenderMultiItem(this.computedRenderMultiItem, this.computedUnrenderMultiItem);
            },

            renderRestMultiItem() {
                if (this._box)
                    this._box.setRenderRestMultiItem(this.computedRenderRestMultiItem, this.computedUnrenderRestMultiItem);
            },

            unrenderRestMultiItem() {
                if (this._box)
                    this._box.setRenderRestMultiItem(this.computedRenderRestMultiItem, this.computedUnrenderRestMultiItem);
            },

            renderNoResultsItem() {
                if (this._box)
                    this._box.setRenderNoResultsItem(this.computedRenderNoResultsItem, this.computedUnrenderNoResultsItem);
            },

            unrenderNoResultsItem() {
                if (this._box)
                    this._box.setRenderNoResultsItem(this.computedRenderNoResultsItem, this.computedUnrenderNoResultsItem);
            },

            renderListItem() {
                if (this._box)
                    this._box.setListOptions(this.computedListOptions);
            },

            unrenderListItem() {
                if (this._box)
                    this._box.setListOptions(this.computedListOptions);
            },

            $scopedSlots() {
                if (this._box)
                    this._box.setListOptions(this.computedListOptions);
            },

            $slots() {
                if (this._box)
                    this._box.setListOptions(this.computedListOptions);
            },

            additionalClasses() {
                if (this._box)
                    this._box.setAdditionalClasses(this.additionalClassesList);
            },

            isLoadingMode() {
                if (this._box)
                    this._box.setIsLoadingMode(!!this.isLoadingMode);
            },
        },

        mounted() {
            this._createBox();

            if (window.ResizeObserver === undefined) {
                this._isAttached = !!this.$refs.el && document.body.contains(this.$refs.el);

                this.$nextTick(() => {
                    if (this._box && this._isAttached)
                        this._box.refreshSize();
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
                if (!wasAttached && this._box && this._isAttached)
                    this._box.refreshSize();
            }
        },

        destroyed() {
            this._destroyBox();
        },

        methods: {
            _handleBoxEvents(event, data) {
                if (event === 'select' ||
                    event === 'clear' ||
                    event === 'addsel' ||
                    event === 'removesel') {
                    let value = event === 'select' ? data.value : this._box.getValue();
                    if (value === undefined && event !== 'select' && this.useNullForEmptyValue)
                        value = null;
                    this.$emit('input', value);
                }

                if (event === 'search') {
                    this.$emit(event, data.value);
                    return;
                }

                switch (event) {
                    case 'clear:before':
                    case 'clear':
                    case 'open':
                    case 'close':
                    case 'search':
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
                    renderNoResultsItem: this.computedRenderNoResultsItem,
                    unrenderNoResultsItem: this.computedUnrenderNoResultsItem,
                    filterFn: this.filterFn,
                    on: this._handleBoxEvents.bind(this),
                    additionalClasses: this.additionalClassesList,
                    isLoadingMode: this.isLoadingMode,
                });

                box.setValue(this.value === null ? undefined : this.value);

                this._box = box;
            },

            _destroyBox() {
                if (this._box) {
                    this._box.destroy();
                    delete this._box;
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

            toggleLoading(on) {
                if (this._box)
                    this._box.toggleLoading(on);
            },

            toggleList(open) {
                if (this._box)
                    this._box.toggleList(open);
            },

            openList() {
                if (this._box)
                    this._box.openList();
            },

            closeList() {
                if (this._box)
                    this._box.closeList();
            },

            isListOpen() {
                if (this._box)
                    return this._box.isListOpen();
                return false;
            },

            updateItemByValue(value, newItem) {
                if (this._box)
                    return this._box.updateItemByValue(value, newItem);
            },

            getSelectedItems() {
                if (this._box)
                    return this._box.getSelectedItems();
                return [];
            },

            /**
             * @param {string} term
             * @param {boolean} [performSearch=false] should actually perform the search, or just set the input's text?
             */
            setSearchTerm(term, performSearch) {
                if (term != null && this._box)
                    this._box.setSearchTerm(term, performSearch);
            },

            /**
             * @returns {string}
             */
            getSearchTerm() {
                if (this._box)
                    return this._box.getSearchTerm();
                return '';
            },

            /**
             * @returns {number}
             */
            getFilteredItemCount() {
                if (this._box)
                    return this._box.getFilteredItemCount();
                return 0;
            },

            /**
             * @returns {boolean}
             */
            isFilterPending() {
                if (this._box)
                    return this._box.isFilterPending();
                return false;
            },

            focus() {
                this._box?.focusInput();
            },

            blur() {
                this._box?.blurInput();
            },
        },
    };
</script>
