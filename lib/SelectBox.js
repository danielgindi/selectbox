import {
    getCssProps,
    getElementWidth,
    setElementWidth,
    getPseudoElementWidth,
    setCssProps,
} from '@danielgindi/dom-utils/lib/Css';
import escapeRegex from './utils/escapeRegex';
import {
    closestUntil,
    createElement,
    next,
    prev,
    setElementAttrs,
} from '@danielgindi/dom-utils/lib/Dom';
import {
    append,
    getRootNode,
    before,
    remove,
    toggleClass,
} from '@danielgindi/dom-utils/lib/DomCompat';

import DomEventsSink from '@danielgindi/dom-utils/lib/DomEventsSink';
import DropList, { ItemSymbol } from './DropList';
import {
    VALUE_BACK_SPACE,
    VALUE_DELETE, VALUE_DOWN, VALUE_END, VALUE_ENTER,
    VALUE_ESCAPE, VALUE_HOME,
    VALUE_LEFT, VALUE_PAGE_DOWN,
    VALUE_PAGE_UP,
    VALUE_RIGHT, VALUE_SPACE,
    VALUE_TAB,
    VALUE_UP,
} from 'keycode-js';
import mitt from 'mitt';

const DestroyedSymbol = Symbol('destroyed');
const RestMultiItemsSymbol = Symbol('rest_multi_items');

const hasTouchCapability = !!('ontouchstart' in window
    || (window.DocumentTouch && window.document instanceof window.DocumentTouch)
    || window.navigator.maxTouchPoints
);

/**
 * @param {Element|EventTarget} el
 * @param {string} className
 * @returns {boolean}
 */
const hasClass = function (el, className) {
    if (el instanceof Element) {
        return el.classList.contains(className);
    }

    return false;
};

const inputBackbufferCssProps = [
    'font-family',
    'font-size',
    'font-weight',
    'font-size',
    'letter-spacing',
    'text-transform',
    'word-spacing',
    'text-indent',
    'box-sizing',
    'padding-left',
    'padding-right',
];

/**
 * @typedef {Object} SelectBox.Options
 * @property {DropList.Options} [listOptions] options to pass to the `DropList`
 * @property {Element} [el] An element to attach to, instead of creating a new one
 * @property {string} [baseClassName='selectbox'] class name for the menu root element
 * @property {string|string[]} [additionalClasses]
 * @property {'ltr'|'rtl'|'auto'} [direction='auto']
 * @property {boolean} [disabled=false] Should start as disabled?
 * @property {boolean} [clearable=true] Has clear button?
 * @property {boolean} [hasOpenIndicator=true] has open/close indicator?
 * @property {string} [placeholder=''] Placeholder text
 * @property {boolean} [sortSelectedItems=true] Should the selected items be sorted?
 * @property {boolean} [sortListItems=false] Sort list items
 * @property {boolean} [sortListCheckedFirst=true] When sorting - put checked items first (applicable to `multi` mode only)
 * @property {boolean} [treatGroupSelectionAsItems=false] Treat group items as normal items
 * @property {*[]} [stickyValues]
 * @property {function(a: DropList.ItemBase, b: DropList.ItemBase):number} [sortItemComparator]
 * @property {boolean} [splitListCheckedGroups=true] Split groups to "checked" and "unchecked", works with `sortListCheckedFirst` only
 * @property {boolean|'touch'} [blurOnSingleSelection='touch']
 * @property {boolean} [multi=false] can multiple values be selected?
 * @property {boolean} [showSelection=true] show selection? if false, the placeholder will take effect
 * @property {boolean} [showPlaceholderInTooltip=false] show placeholder in title attribute
 * @property {function(items: DropList.ItemBase[]):string} [multiPlaceholderFormatter] formatter for placeholder for multi items mode
 * @property {string} [labelProp='label']
 * @property {string} [valueProp='value']
 * @property {string} [multiItemLabelProp='short_label']
 * @property {number} [maxMultiItems] maximum number of multi items. The rest will get a single item to represent.
 * @property {function(count: number, items: DropList.ItemBase[]):string} [multiItemsRestLabelProvider] label for the item representing the rest of the items.
 * @property {DropList.ItemBase[]|null} [items] initial items
 * @property {*[]|null} [selectedValues] initial selected values
 * @property {*|*[]|null} [value] initial selected value
 * @property {function(item: DropList.ItemBase, itemEl: Element):(*|false)} [renderSingleItem]
 * @property {function(item: DropList.ItemBase, itemEl: Element)} [unrenderSingleItem]
 * @property {function(item: DropList.ItemBase, itemEl: Element):(*|false)} [renderMultiItem]
 * @property {function(item: DropList.ItemBase, itemEl: Element)} [unrenderMultiItem]
 * @property {function(item: DropList.ItemBase, itemEl: Element):(*|false)} [renderRestMultiItem]
 * @property {function(item: DropList.ItemBase, itemEl: Element)} [unrenderRestMultiItem]
 * @property {boolean} [searchable=false] is it searchable?
 * @property {string} [noResultsText='No matching results'] text for no results (empty for none)
 * @property {boolean} [autoSelectTextOnCheck=true] automatically select text in input when an item is checked (multi mode). Used to allow the user to quickly type multiple items.
 * @property {number} [filterThrottleWindow=300] throttle time (milliseconds) for filtering
 * @property {boolean} [filterOnEmptyTerm=false] call the filter function on empty search term too
 * @property {function(items: DropList.ItemBase[], term: string):(DropList.ItemBase[]|null)} [filterFn]
 * @property {function(name: string, ...args)} [on]
 * @property {boolean} [isLoadingMode]
 * @property {boolean} [closeListWhenLoading] whether we should close the list automatically when loading
 * @property {string[]} [clearInputWhen=['single_close','multi_select_single']] clear input box when closing the droplist or selecting <code>['single_close', 'multi_close', 'multi_select_single']</code>
 * */
const defaultOptions = {
    el: null,
    baseClassName: 'selectbox',
    disabled: false,
    clearable: true,
    hasOpenIndicator: true,
    placeholder: '',
    sortSelectedItems: true,
    sortListItems: false,
    sortListCheckedFirst: true,
    stickyValues: null,
    sortItemComparator: null,
    splitListCheckedGroups: true,
    treatGroupSelectionAsItems: false,
    blurOnSingleSelection: 'touch',
    multi: false,
    showSelection: true,
    showPlaceholderInTooltip: false,
    multiPlaceholderFormatter: null,
    searchable: true,
    noResultsText: 'No matching results',
    autoSelectTextOnCheck: true,
    filterThrottleWindow: 300,
    filterOnEmptyTerm: false,
    labelProp: 'label',
    valueProp: 'value',
    multiItemLabelProp: 'short_label',
    maxMultiItems: null,
    multiItemsRestLabelProvider: null,
    items: [],
    selectedValues: undefined,
    value: undefined,
    isLoadingMode: false,
    closeListWhenLoading: true,
    clearInputWhen: ['single_close', 'multi_select_single'],
};

/**
 *
 * @param {DropList.ItemBase[]} items
 * @param {string} labelProp
 * @returns {string}
 */
const defaultMultiPlaceholderFormatter = (items, labelProp) => {
    if (items.length === 0)
        return '';

    let title = items[0][labelProp] + '';

    if (items.length > 1) {
        title += ` (+${items.length - 1})`;
    }

    return title;
};

/*
Emits the following events:
---------------------------

'clear:before' {cancel: false}: will clear the whole selection. return false to abort.
'clear': clearead the whole selection.
'open' { list: DropList }: the drop list is opening
'open:before' { list: DropList }: the drop list will open
'close': the drop list is closing
'addsel:before' {value, item, cancel: false, isCheckingGroup: bool}: an item selection is about to be added (in multi mode). return false to abort.
'removesel:before' {value, item, cancel: false, isCheckingGroup: bool}: an item selection is about to be removed (in multi mode). return false to abort.
'addsel' {value, item, isCheckingGroup: bool}: an item selection has been added (in multi mode)
'removesel' {value, item, isCheckingGroup: bool}: an item selection has been removed (in multi mode)
'groupcheck' {value, item, affectedCount: number}: an item selection has been removed (in multi mode)
'select:before' {value, item, cancel: false}: an item is about to be selected (in single mode). return false to abort.
'select' {value, item}: an item has been selected (in single mode)
'search' {value}: input box value has changed
'search:focus': input box has gained focus
'search:blur': input box has lost focus
'input:resize': input box resized
'itemschanged' {term, mutated, count}: the current set of items has changed
 */

// noinspection JSUnusedGlobalSymbols
class SelectBox {
    /**
     * @param {SelectBox.Options} options
     */
    constructor(options) {
        const o = { ...defaultOptions };

        for (let [key, value] of Object.entries(/**@type Object*/options))
            if (value !== undefined)
                o[key] = value;

        const p = this._p = {
            ownsEl: true,

            baseClassName: o.baseClassName,
            additionalClasses: o.additionalClasses,
            direction: o.direction === 'ltr' ? 'ltr' : o.direction === 'rtl' ? 'rtl' : 'auto',

            listOptions: o.listOptions,

            disabled: !!o.disabled,
            clearable: !!o.clearable,
            hasOpenIndicator: !!o.hasOpenIndicator,
            placeholder: o.placeholder,
            sortSelectedItems: !!o.sortSelectedItems,
            sortListItems: !!o.sortListItems,
            sortListCheckedFirst: !!o.sortListCheckedFirst,
            stickyValues: Array.isArray(o.stickyValues) ? new Set(o.stickyValues) : null,
            sortItemComparator: o.sortItemComparator,
            splitListCheckedGroups: !!o.splitListCheckedGroups,
            treatGroupSelectionAsItems: o.treatGroupSelectionAsItems,
            blurOnSingleSelection: o.blurOnSingleSelection,
            multi: o.multi,
            showSelection: o.showSelection,
            showPlaceholderInTooltip: o.showPlaceholderInTooltip,
            multiPlaceholderFormatter: o.multiPlaceholderFormatter,
            searchable: o.searchable,
            noResultsText: o.noResultsText,
            autoSelectTextOnCheck: o.autoSelectTextOnCheck,

            labelProp: o.labelProp,
            valueProp: o.valueProp,
            multiItemLabelProp: o.multiItemLabelProp,

            maxMultiItems: o.maxMultiItems,
            multiItemsRestLabelProvider: o.multiItemsRestLabelProvider,

            renderSingleItem: o.renderSingleItem,
            unrenderSingleItem: o.unrenderSingleItem,
            renderMultiItem: o.renderMultiItem,
            unrenderMultiItem: o.unrenderMultiItem,
            renderRestMultiItem: o.renderRestMultiItem,
            unrenderRestMultiItem: o.unrenderRestMultiItem,

            on: o.on || null,
            silenceEvents: true,
            mitt: mitt(),

            isLoadingMode: !!o.isLoadingMode,
            closeListWhenLoading: !!o.closeListWhenLoading,
            clearInputWhen: Array.isArray(o.clearInputWhen) ? o.clearInputWhen.slice(0) : [],

            items: [],
            itemsChanged: true,

            sink: new DomEventsSink(),

            /** @type ResizeObserver */
            resizeObserver: null,

            selectedItems: [],
            selectedValues: [],
            selectionChanged: true,
            resortBySelectionNeeded: false,

            filterThrottleWindow: o.filterThrottleWindow,
            filterOnEmptyTerm: o.filterOnEmptyTerm,
            filterFn: null,
            filterTerm: '',
        };

        let el = o.el;
        if (el instanceof Element) {
            p.ownsEl = false;
        } else {
            el = createElement('span');
        }

        setElementAttrs(el, {
            role: 'combobox',
            'aria-haspopup': 'true',
            'aria-expanded': 'false',
        });
        p.el = el;

        this._syncBaseClasses();
        this._renderBase();

        /** @type Element[] */
        p.multiItemEls = [];

        this.enable(!p.disabled);

        this._setupDropdownMenu();

        // --- Hook click
        p.sink
            .add(el, 'click', (evt) => {
                if (p.clearButtonWrapper && p.clearButtonWrapper.contains(evt.target)) {
                    return;
                }

                if (!el.contains(document.activeElement)) {
                    p.input.focus();
                    // Go to end of input
                    p.input.selectionStart = p.input.selectionEnd = p.input.value.length;
                }
            });

        // --- Handle default focus directly to search box
        p.sink.add(el, 'focus', evt => {
            const target = (/**Element*/evt.target);

            if (!el.contains(evt.relatedTarget) &&
                !hasClass(target, `${p.baseClassName}__search_field`) &&
                !hasClass(target, `${p.baseClassName}__item`)) {
                let field = el.querySelector(`.${p.baseClassName}__search_field`);
                field && field.focus();
            }
        }, true);

        p.sink
            .add(p.input, 'keydown', (/**KeyboardEvent*/event) => {
                this._handleInputKeydown(event);
            })
            .add(p.input, 'input', () => {
                this._resizeInput();
            });

        const focusInOutHandler = (() => {
            let t;
            return () => {
                if (t) {
                    clearTimeout(t);
                }
                t = setTimeout(() => {
                    toggleClass(el, `${p.baseClassName}__focus`, el.contains(document.activeElement));
                });
            };
        })();
        p.sink.add(el, 'focus', focusInOutHandler, true);
        p.sink.add(el, 'blur', focusInOutHandler, true);

        // --- Resize input on window change
        p.sink.add(window, 'resize', () => this._resizeInput());
        p.sink.add(window, 'orientationchange', () => this._resizeInput());

        if (window.ResizeObserver !== undefined) {
            let lastSize = {
                borderBoxSize: {
                    blockSize: null,
                    inlineSize: null,
                },
                contentBoxSize: {
                    blockSize: null,
                    inlineSize: null,
                },
            };
            p.resizeObserver = new ResizeObserver(entries => {
                if (this[DestroyedSymbol])
                    return;

                const entry = entries[0];
                if (!lastSize ||
                    entry.borderBoxSize[0].blockSize !== lastSize.borderBoxSize.blockSize ||
                    entry.borderBoxSize[0].inlineSize !== lastSize.borderBoxSize.inlineSize ||
                    entry.contentBoxSize[0].blockSize !== lastSize.contentBoxSize.blockSize ||
                    entry.contentBoxSize[0].inlineSize !== lastSize.contentBoxSize.inlineSize) {
                    p.resizeObserver.unobserve(p.el);
                    this._resizeInput();
                    requestAnimationFrame(() => p.resizeObserver.observe(p.el));
                }

                lastSize.borderBoxSize = entry.borderBoxSize[0];
                lastSize.contentBoxSize = entry.contentBoxSize[0];
            });
            p.resizeObserver.observe(p.el);
        }

        this.setFilterFn(o.filterFn);

        this.setItems(o.items);
        delete o.items; // we do not need this in memory anymore

        if (o.multi && Array.isArray(o.selectedValues)) {
            this.setSelectedValues(o.selectedValues);
        } else if (o.value != null) {
            this.setValue(o.value);
        }

        this._scheduleSync('full');

        this.silenceEvents = false;

        return this;
    }

    destroy() {
        if (this[DestroyedSymbol])
            return;
        this[DestroyedSymbol] = true;

        const p = this._p;

        if (p.syncTimeout) {
            clearTimeout(p.syncTimeout);
            delete p.syncTimeout;
        }

        this._stopTrackingPresence();

        p.sink.remove();
        p.dropList && p.dropList.destroy();

        this._cleanupSingleWrapper();

        if (p.unrenderMultiItem || p.unrenderRestMultiItem) {
            // Remove all item elements
            while (p.multiItemEls.length > 0) {
                // use fast path by removing in reverse
                this._removeMultiItemElementByIndex(p.multiItemEls.length - 1);
            }
        }

        remove(p.list);
        remove(p.singleWrapper);
        remove(p.input);
        remove(p.inputBackBuffer);
        remove(p.clearButtonWrapper);
        remove(p.openIndicator);

        if (!p.ownsEl) {
            for (let name of Array.from(p.el.classList)) {
                if (name.startsWith(p.baseClassName)) {
                    p.el.classList.remove(name);
                }
            }
            p.el.removeAttribute('role');
            p.el.removeAttribute('aria-haspopup');
            p.el.removeAttribute('aria-expanded');
        }

        p.resizeObserver?.disconnect();

        this._p = null;
    }

    get el() {
        return this._p.el;
    }

    get droplistInstance() {
        return this._p.dropList;
    }

    /**
     * Returns true if other is an inclusive descendant of droplist node, false otherwise, and undefined if the droplist is not initiated.
     * @param {Node} other
     * @param {boolean} [considerSubmenus=true]
     * @returns {boolean|undefined}
     */
    droplistElContains(other, considerSubmenus = true) {
        return this._p.dropList?.elContains(other, considerSubmenus);
    }

    /**
     * Enables the control
     * @param {boolean=true} enabled Should the control be enabled?
     * @returns {SelectBox}
     */
    enable(enabled) {
        const p = this._p;

        if (enabled === undefined) {
            enabled = true;
        }
        p.disabled = !enabled;
        p.el.setAttribute('aria-disabled', p.disabled.toString());
        p.input.disabled = !!p.disabled;

        const multiItemEls = p.multiItemEls;

        for (let itemEl of multiItemEls) {
            if (p.disabled) {
                itemEl.removeAttribute('tabindex');
            } else {
                itemEl.setAttribute('tabindex', '0');
            }
        }

        return this;
    }

    /**
     * Is the control enabled?
     * @returns {boolean}
     */
    isEnabled() {
        return !this._p.disabled;
    }

    /**
     * Disables the control
     * @param {boolean=true} disabled Should the control be disabled?
     * @returns {SelectBox}
     */
    disable(disabled) {
        return this.enable(disabled === undefined ? false : !disabled);
    }

    /**
     * Is the control disabled?
     * @returns {boolean}
     */
    isDisabled() {
        return this._p.disabled;
    }

    /**
     * @param {string|string[]} classes
     * @returns {SelectBox}
     */
    setAdditionalClasses(classes) {
        const p = this._p;
        p.additionalClasses = classes;
        this._syncBaseClasses();
        return this;
    }

    /**
     *
     * @param {DropList.ItemBase[]} [items]
     * @param {boolean} [resetValues=true] should reset values to current values (essentially refresh the data based on items & values). If set to false, use setValue to set a fresh value
     * @returns {SelectBox}
     */
    setItems(items, resetValues = true) {
        const p = this._p;

        if (!items)
            items = [];

        p.items = items.slice(0);
        p.itemsChanged = true;

        this._updateItemByValueMap();

        if (resetValues) {
            this.setSelectedValues(this.getSelectedValues());
        }

        this._trigger('itemschanged', { term: null, mutated: true, count: this.getFilteredItemCount() });

        return this;
    }

    getFilteredItemCount() {
        const p = this._p;

        if (p.dropList)
            return p.dropList.getFilteredItemCount();

        if (p.items)
            return p.items.length;

        return 0;
    }

    isFilterPending() {
        const p = this._p;
        return p.dropList?.isFilterPending() === true;
    }

    updateItemByValue(value, newItem) {
        const p = this._p;

        let existingItem = p.itemByValueMap.get(value);
        if (existingItem)
            Object.assign(existingItem, newItem);

        if (p.dropList) {
            p.dropList.updateItemByValue(value, newItem);
        }
    }

    /**
     * @returns {DropList.ItemBase[]|*}
     */
    getItems() {
        const p = this._p;
        return p.items;
    }

    /**
     * @param {boolean} clearable
     * @returns {SelectBox}
     */
    setClearable(clearable) {
        clearable = !!clearable;

        if (this._p.clearable === clearable)
            return this;

        this._p.clearable = !!clearable;
        this._scheduleSync('render_clear');
        return this;
    }

    /**
     * @returns {boolean}
     */
    getClearable() {
        return this._p.clearable;
    }

    /**
     * @param {boolean} enabled
     * @returns {SelectBox}
     */
    setHasOpenIndicator(enabled) {
        enabled = !!enabled;

        if (this._p.hasOpenIndicator === enabled)
            return this;

        this._p.hasOpenIndicator = enabled;
        this._scheduleSync('render_base');
        return this;
    }

    /**
     * @returns {boolean}
     */
    getHasOpenIndicator() {
        return this._p.hasOpenIndicator;
    }

    /**
     * @param {string} placeholder
     * @returns {SelectBox}
     */
    setPlaceholder(placeholder) {
        this._p.placeholder = placeholder == null ? '' : String(placeholder);
        this._scheduleSync('render_base');
        return this;
    }

    /**
     * @returns {string}
     */
    getPlaceHolder() {
        return this._p.placeholder;
    }

    /**
     * @param {string} term
     * @param {boolean} [performSearch=false] should actually perform the search, or just set the input's text?
     * @returns {SelectBox}
     */
    setSearchTerm(term, performSearch = false) {
        const p = this._p;

        if (!p.input) return this;

        p.input.value = term;

        this._scheduleSync('resize_input');

        if (performSearch) {
            p.filterTerm = p.input.value.trim();
            p.dropList?.setSearchTerm(p.filterTerm, performSearch);
        }

        return this;
    }

    /**
     * @returns {string}
     */
    getSearchTerm() {
        const p = this._p;
        if (p.input)
            return p.input.value;
        return '';
    }

    invokeRefilter() {
        const p = this._p;
        p.dropList?.invokeRefilter();
        return this;
    }

    /**
     * @param {boolean} sortSelectedItems
     * @returns {SelectBox}
     */
    setSortSelectedItems(sortSelectedItems) {
        const p = this._p;
        sortSelectedItems = !!sortSelectedItems;
        if (p.sortSelectedItems === sortSelectedItems)
            return this;

        p.sortSelectedItems = sortSelectedItems;
        this._scheduleSync('render_items');
        return this;
    }

    /**
     * @returns {boolean}
     */
    isSortSelectedItemsEnabled() {
        return this._p.sortSelectedItems;
    }

    /**
     * @param {boolean} sortListItems
     * @returns {SelectBox}
     */
    setSortListItems(sortListItems) {
        const p = this._p;
        sortListItems = !!sortListItems;
        if (p.sortListItems === sortListItems)
            return this;

        p.sortListItems = sortListItems;
        p.itemsChanged = true;
        this._scheduleSync('render_list');
        return this;
    }

    /**
     * @returns {boolean}
     */
    isSortListItemsEnabled() {
        return this._p.sortListItems;
    }

    /**
     * @param {boolean} sortListCheckedFirst
     * @returns {SelectBox}
     */
    setSortListCheckedFirst(sortListCheckedFirst) {
        const p = this._p;
        sortListCheckedFirst = !!sortListCheckedFirst;
        if (p.sortListCheckedFirst === sortListCheckedFirst)
            return this;

        p.sortListCheckedFirst = sortListCheckedFirst;
        p.itemsChanged = true;
        this._scheduleSync('render_list');
        return this;
    }

    /**
     * @returns {boolean}
     */
    isSortListCheckedFirstEnabled() {
        return this._p.sortListCheckedFirst;
    }

    /**
     * @param {*[]} values
     * @returns {SelectBox}
     */
    setStickyValues(values) {
        const p = this._p;

        p.stickyValues = Array.isArray(values) ? new Set(values) : null;
        p.itemsChanged = true;
        this._scheduleSync('render_list');
        return this;
    }

    /**
     * @returns {*[]}
     */
    getStickyValues() {
        return this._p.stickyValues ? Array.from(this._p.stickyValues) : null;
    }

    /**
     * @param {function(a: DropList.ItemBase, b: DropList.ItemBase):number} comparator
     * @returns {SelectBox}
     */
    setSortItemComparator(comparator) {
        const p = this._p;
        if (p.sortItemComparator === comparator)
            return this;

        p.sortItemComparator = comparator;
        p.itemsChanged = true;
        this._scheduleSync('render_list');
        return this;
    }

    /**
     * @returns {function(a: DropList.ItemBase, b: DropList.ItemBase):number}
     */
    getSortItemComparator() {
        return this._p.sortItemComparator;
    }

    /**
     * @param {boolean} treatGroupSelectionAsItems
     * @returns {SelectBox}
     */
    setTreatGroupSelectionAsItems(treatGroupSelectionAsItems) {
        const p = this._p;
        treatGroupSelectionAsItems = !!treatGroupSelectionAsItems;
        if (p.treatGroupSelectionAsItems === treatGroupSelectionAsItems)
            return this;

        p.treatGroupSelectionAsItems = treatGroupSelectionAsItems;
        p.dropList?.setFilterGroups(treatGroupSelectionAsItems);
        p.dropList?.setFilterEmptyGroups(!treatGroupSelectionAsItems);
        p.itemsChanged = true;
        this._scheduleSync('render_list');
        return this;
    }

    /**
     * @returns {boolean}
     */
    isTreatGroupSelectionAsItemsEnabled() {
        return !this._p.treatGroupSelectionAsItems;
    }

    /**
     * @param {boolean} splitListCheckedGroups
     * @returns {SelectBox}
     */
    setSplitListCheckedGroups(splitListCheckedGroups) {
        const p = this._p;
        splitListCheckedGroups = !!splitListCheckedGroups;
        if (p.splitListCheckedGroups === splitListCheckedGroups)
            return this;

        p.splitListCheckedGroups = splitListCheckedGroups;
        p.itemsChanged = true;
        this._scheduleSync('render_list');
        return this;
    }

    /**
     * @returns {boolean}
     */
    isSplitListCheckedGroupsEnabled() {
        return this._p.splitListCheckedGroups;
    }

    /**
     * @param {boolean} showSelection
     * @returns {SelectBox}
     */
    setShowSelection(showSelection) {
        const p = this._p;
        showSelection = !!showSelection;
        if (p.showSelection === showSelection)
            return this;

        p.showSelection = showSelection;
        this._scheduleSync('render_items');
        return this;
    }

    /**
     * @returns {boolean}
     */
    isShowSelectionEnabled() {
        return this._p.showSelection;
    }

    /**
     * @param {boolean} showPlaceholderInTooltip
     * @returns {SelectBox}
     */
    setShowPlaceholderInTooltip(showPlaceholderInTooltip) {
        const p = this._p;
        showPlaceholderInTooltip = !!showPlaceholderInTooltip;
        if (p.showPlaceholderInTooltip === showPlaceholderInTooltip)
            return this;

        p.showPlaceholderInTooltip = showPlaceholderInTooltip;
        this._scheduleSync('render_base');
        return this;
    }

    /**
     * @returns {boolean}
     */
    isShowPlaceholderInTooltipEnabled() {
        return this._p.showPlaceholderInTooltip;
    }

    /**
     * @param {function(items: DropList.ItemBase[]):string} formatter
     * @returns {SelectBox}
     */
    setMultiPlaceholderFormatter(formatter) {
        const p = this._p;

        if (p.multiPlaceholderFormatter === formatter)
            return this;

        p.multiPlaceholderFormatter = formatter;
        this._scheduleSync('render_base');
        return this;
    }

    /**
     * @param {boolean|'touch'} value
     * @returns {SelectBox}
     */
    setBlurOnSingleSelection(value) {
        const p = this._p;
        if (p.blurOnSingleSelection === value)
            return this;

        p.blurOnSingleSelection = value;
        return this;
    }

    /**
     * @returns {boolean|'touch'}
     */
    getBlurOnSingleSelection() {
        return this._p.blurOnSingleSelection;
    }

    /**
     * @param {boolean} multi
     * @returns {SelectBox}
     */
    setMulti(multi) {
        const p = this._p;
        multi = !!multi;
        if (p.multi === multi)
            return this;

        p.multi = multi;

        this._setupDropdownMenu();

        // move to correct parent
        remove(p.clearButtonWrapper);
        delete p.clearButtonWrapper;

        if (multi &&
            p.selectedValues &&
            p.selectedValues.length === 1 &&
            Array.isArray(p.selectedValues[0])) {
            this.setSelectedValues(/**@type Array*/p.selectedValues[0]);
        }

        this._scheduleSync('full');

        return this;
    }

    /**
     * @returns {boolean}
     */
    isMultiEnabled() {
        return this._p.multi;
    }

    /**
     * @param {boolean} searchable
     * @returns {SelectBox}
     */
    setSearchable(searchable) {
        const p = this._p;
        searchable = !!searchable;
        if (p.searchable === searchable)
            return this;

        p.searchable = searchable;
        this._scheduleSync('full');

        return this;
    }

    /**
     * @returns {boolean}
     */
    isSearchableEnabled() {
        return this._p.searchable;
    }

    /**
     * @param {string} noResultsText
     * @returns {SelectBox}
     */
    setNoResultsText(noResultsText) {
        this._p.dropList?.setNoResultsText(noResultsText);
        return this;
    }

    /**
     * @returns {string}
     */
    getNoResultsText() {
        return this._p.noResultsText;
    }

    /**
     * @param {boolean} autoSelectTextOnCheck
     * @returns {SelectBox}
     */
    setAutoSelectTextOnCheck(autoSelectTextOnCheck) {
        this._p.autoSelectTextOnCheck = autoSelectTextOnCheck;
        return this;
    }

    /**
     * @returns {boolean}
     */
    getAutoSelectTextOnCheck() {
        return this._p.autoSelectTextOnCheck;
    }

    /**
     * @param {number} window
     * @returns {SelectBox}
     */
    setFilterThrottleWindow(window) {
        const p = this._p;
        p.filterThrottleWindow = window;
        p.dropList?.setFilterThrottleWindow(window);
        return this;
    }

    /**
     * @returns {number}
     */
    getFilterThrottleWindow() {
        return this._p.filterThrottleWindow;
    }

    /**
     * @param {boolean} value
     * @returns {SelectBox}
     */
    setFilterOnEmptyTerm(value) {
        const p = this._p;
        if (p.filterOnEmptyTerm === value)
            return this;
        p.dropList?.setFilterOnEmptyTerm(value);
        return this;
    }

    /**
     * @returns {boolean}
     */
    getFilterOnEmptyTerm() {
        return this._p.filterOnEmptyTerm;
    }

    /**
     * @param {DropList.Options} listOptions
     * @returns {SelectBox}
     */
    setListOptions(listOptions) {
        const p = this._p;
        p.listOptions = listOptions;
        this._setupDropdownMenu();
        return this;
    }

    /**
     * @param {(function(item: DropList.ItemBase, itemEl: Element):(*|false))|null} render
     * @param {(function(item: DropList.ItemBase, itemEl: Element))|null} unrender
     * @returns {SelectBox})|null
     */
    setRenderSingleItem(render, unrender) {
        const p = this._p;
        p.renderSingleItem = render;
        p.unrenderSingleItem = unrender;
        return this;
    }

    /**
     * @param {(function(item: DropList.ItemBase, itemEl: Element):(*|false))|null} render
     * @param {(function(item: DropList.ItemBase, itemEl: Element))|null} unrender
     * @returns {SelectBox}
     */
    setRenderMultiItem(render, unrender) {
        const p = this._p;
        p.renderMultiItem = render;
        p.unrenderMultiItem = unrender;
        return this;
    }

    /**
     * @param {(function(item: DropList.ItemBase, itemEl: Element):(*|false))|null} render
     * @param {(function(item: DropList.ItemBase, itemEl: Element))|null} unrender
     * @returns {SelectBox}
     */
    setRenderRestMultiItem(render, unrender) {
        const p = this._p;
        p.renderRestMultiItem = render;
        p.unrenderRestMultiItem = unrender;
        return this;
    }

    /**
     * @param {string} prop
     * @returns {SelectBox}
     */
    setLabelProp(prop) {
        const p = this._p;
        p.labelProp = prop;

		if (p.dropList)
			p.dropList.setLabelProp(prop);

        return this;
    }

    /**
     * @param {string} prop
     * @returns {SelectBox}
     */
    setValueProp(prop) {
        const p = this._p;

        if (p.valueProp === prop)
            return this;

        p.valueProp = prop;

		if (p.dropList)
			p.dropList.setValueProp(prop);

        this._updateItemByValueMap();

        return this;
    }

    /**
     * @param {string} prop
     * @returns {SelectBox}
     */
    setMultiItemLabelProp(prop) {
        const p = this._p;
        p.multiItemLabelProp = prop;
        return this;
    }

    /**
     * @param {number|null|undefined} value
     * @returns {SelectBox}
     */
    setMaxMultiItems(value) {
        const p = this._p;
        p.maxMultiItems = value;
        return this;
    }

    /**
     * @param {function(count: number, items: DropList.ItemBase[]):string|null|undefined} value
     * @returns {SelectBox}
     */
    setMultiItemsRestLabelProvider(value) {
        const p = this._p;
        p.multiItemsRestLabelProvider = value;
        return this;
    }

    /**
     * @param {function(items: DropList.ItemBase[], term: string):(DropList.ItemBase[]|null)} fn
     * @returns {SelectBox}
     */
    setFilterFn(fn) {
        const p = this._p;
        if (p.filterFn === fn)
            return this;

        // Do not keep this reference, as far as the user is concerned - he/she did not set a custom filter.
        p.filterFn = fn;

        if (!fn) {
            // Add search by multi-item label
            fn = (items, term) => {
                const matcher = new RegExp(escapeRegex(term), 'i');
                const labelProp = p.labelProp,
                    multiItemLabelProp = p.multiItemLabelProp;

                return p.items.filter(x => {
                    if (!p.treatGroupSelectionAsItems && x._group) return true;
                    return matcher.test(x[labelProp] || x[multiItemLabelProp]);
                });
            };
        }

        p.actualFilterFn = fn;
        p.dropList?.setFilterFn(fn);
        return this;
    }

    /**
     * @returns {function(items: DropList.ItemBase[], term: string):(DropList.ItemBase[]|null)}
     */
    getFilterFn() {
        return this._p.filterFn;
    }

    /**
     * Focus on input element
     * @returns {SelectBox}
     */
    focusInput() {
        const p = this._p;

        if (p.input)
            p.input.focus();

        return this;
    }

    /**
     * Remvoe focus from the input element
     * @returns {SelectBox}
     */
    blurInput() {
        const p = this._p;

        if (p.input)
            p.input.blur();

        return this;
    }

    /**
     * Removes all selected items
     * @returns {SelectBox}
     */
    clear() {
        if (!this._performClearWithEvent(true))
            return this;

        if (this[DestroyedSymbol]) return this; // destroyed by event handler

        return this;
    }

    /**
     * Returns a single value or an array of selected values - depending on `multi` prop
     * @public
     * @returns {*[]}
     */
    getValue() {
        const p = this._p;
        if (p.multi)
            return p.selectedValues.slice(0);
        else if (p.selectedValues.length > 0)
            return p.selectedValues[0];
        return undefined;
    }

    /**
     * Selects the specified value or multiple values - depending on `multi` prop
     * @public
     * @param {*|*[]} value - if `multi`, then an array of values to select, otherwise - a single value to select
     * @returns {SelectBox}
     */
    setValue(value) {
        const p = this._p;
        if (p.multi)
            return this.setSelectedValues(Array.isArray(value) ? value : value !== undefined ? [value] : []);
        else
            return this.setSelectedValues(value !== undefined ? [value] : []);
    }

    /**
     * Returns an array of selected values
     * @public
     * @returns {*[]}
     */
    getSelectedValues() {
        const p = this._p;
        return p.selectedValues.slice(0);
    }

    /**
     * Selects the specified values
     * @public
     * @param {*[]} values - an array of *values* to select
     * @returns {SelectBox}
     */
    setSelectedValues(values) {
        const p = this._p, valueProp = p.valueProp;

        if (!p.multi) {
            values = values.slice(0, 1);
        }

        let set = new Set();
        let selectedValues = [];
        let selectedItems = [];

        for (let value of values) {
            if (set.has(value))
                continue;
            set.add(value);

            selectedValues.push(value);

            let item = p.itemByValueMap.get(value);
            if (item !== undefined) {
                selectedItems.push(item);
            } else {
                selectedItems.push({ [valueProp]: value });
            }
        }

        p.selectedValues = selectedValues;
        p.selectedItems = selectedItems;
        p.selectionChanged = true;
        p.resortBySelectionNeeded = true;

        this._scheduleSync('full');

        return this;
    }

    /**
     * Returns the count of selected values
     * @public
     * @returns {number}
     */
    getSelectedValueCount() {
        const p = this._p;
        return p.selectedValues.length;
    }

    /**
     * Returns an array of selected items
     * @public
     * @returns {Array.<Object>}
     */
    getSelectedItems() {
        const p = this._p;
        return p.selectedItems.slice(0);
    }

    /**
     * Sets the specified items to "checked" mode.
     * An array of items is passed, not values, because we need to keep track if items,
     * and if we already have the array of items then this spares the process of searching for the items by values.
     * @public
     * @param {DropList.ItemBase[]} items - an array of *items* to select (not values)
     * @returns {SelectBox}
     */
    setSelectedItems(items) {
        this._setSelectedItems(items);
        return this;
    }

    /**
     * @returns {SelectBox}
     */
    openList() {
        const p = this._p;

        if (p.dropList.isVisible())
            return this;

        if (p.isLoadingMode && p.items.length === 0)
            return this;

        this._trigger('open:before', { list: p.dropList });

        // Propagate direction to droplist
        p.dropList.setDirection(getComputedStyle(p.el).direction);

        p.dropList.show();
        this._repositionDropList();

        // Another one in case the droplist position messed with screen layout.
        // If the out element's bounds stayed the same - nothing will be recalculated.
        // So this is *not* expensive.
        this._repositionDropList();

        if (p.dropList.hasFocusedItem()) {
            p.dropList.setFocusedItemAtIndex(p.dropList.getFocusedItemIndex());
        } else if (!p.multi && this.getValue() !== undefined) {
            p.dropList.setFocusedItemByValue(this.getValue());
        }

        return this;
    }

    /**
     * @returns {SelectBox}
     */
    closeList() {
        const p = this._p;

        if (this[DestroyedSymbol])
            return this;

        if (!p.dropList.isVisible())
            return this;

        p.dropList.hide();

        return this;
    }

    /**
     * @param {boolean} [open]
     * @returns {SelectBox}
     */
    toggleList(open) {
        const p = this._p;

        let shouldOpen = open === undefined ? !p.dropList.isVisible() : !!open;

        if (shouldOpen)
            return this.openList();
        else return this.closeList();
    }

    /**
     * @returns {boolean}
     */
    isListOpen() {
        return !!this._p.dropListVisible;
    }

    /**
     * @param {boolean} [on]
     * @returns {SelectBox}
     */
    toggleLoading(on) {
        return this.setIsLoadingMode(on === undefined ? !this.getIsLoadingMode() : !!on);
    }

    /**
     * @param {boolean} isLoadingMode
     * @returns {SelectBox}
     */
    setIsLoadingMode(isLoadingMode) {
        const p = this._p;

        isLoadingMode = isLoadingMode === undefined ? true : !!isLoadingMode;

        if (p.isLoadingMode === isLoadingMode)
            return this;

        p.isLoadingMode = isLoadingMode;

        if (p.isLoadingMode && p.closeListWhenLoading && p.items.length === 0 && this.isListOpen()) {
            this.closeList();
        } else if (!p.isLoadingMode && p.closeListWhenLoading && document.activeElement &&
            ((p.multi || p.searchable) && p.input.contains(document.activeElement) ||
                (!p.multi && !p.searchable) && p.el.contains(document.activeElement))) {
            this.openList();
        }

        this._scheduleSync('render_base');
        return this;
    }

    /**
     * @returns {boolean}
     */
    getIsLoadingMode() {
        return this._p.isLoadingMode;
    }

    /**
     * Sets whether to close the list when loading mode is enabled
     * @param {boolean} closeListWhenLoading
     * @returns {SelectBox}
     */
    setCloseListWhenLoading(closeListWhenLoading) {
        this._p.closeListWhenLoading = closeListWhenLoading;
        return this;
    }

    /**
     * @returns {boolean}
     */
    getCloseListWhenLoading() {
        return this._p.closeListWhenLoading;
    }

    /**
     * Sets when to clear the input field
     * @param {string[]} clearInputWhen
     * @returns {SelectBox}
     */
    setClearInputWhen(clearInputWhen) {
        this._p.clearInputWhen = Array.isArray(clearInputWhen) ? clearInputWhen.slice(0) : [];
        return this;
    }

    /**
     * Retrieves the settings for when to clear the input field
     * @returns {string[]}
     */
    getClearInputWhen() {
        return this._p.clearInputWhen;
    }

    /**
     * Sets the appropriate direction for the selectbox
     * @param {'ltr'|'rtl'|'auto'} direction
     * @return {SelectBox}
     */
    setDirection(direction) {
        const p = this._p;
        p.direction = direction === 'ltr' ? 'ltr' : direction === 'rtl' ? 'rtl' : 'auto';
        this._syncBaseClasses();
        return this;
    }

    /**
     * Gets the supplied direction for the selectbox
     * @return {'ltr'|'rtl'|'auto'}
     */
    getDirection() {
        const p = this._p;
        return p.direction;
    }

    /**
     * Can be called in case that the selectbox was attached to the dom late and has a weird size.
     * @returns {SelectBox}
     */
    refreshSize() {
        this._resizeInput();
        return this;
    }

    /**
     * Register an event handler
     * @param {(string|'*')?} event
     * @param {function(any)} handler
     * @returns {SelectBox}
     */
    on(/**string|'*'*/event, /**Function?*/handler) {
        this._p.mitt.on(event, handler);
        return this;
    }

    /**
     * Register a one time event handler
     * @param {(string|'*')?} event
     * @param {function(any)} handler
     * @returns {SelectBox}
     */
    once(/**string|'*'*/event, /**Function?*/handler) {
        let wrapped = (value) => {
            this._p.mitt.off(event, wrapped);
            handler(value);
        };
        this._p.mitt.on(event, wrapped);
        return this;
    }

    /**
     * Remove an `handler` for `event`, all events for `event`, or all events completely.
     * @param {(string|'*')?} event
     * @param {function(any)} handler
     * @returns {SelectBox}
     */
    off(/**(string|'*')?*/event, /**Function?*/handler) {
        if (!event && !event) {
            this._p.mitt.all.clear();
        } else {
            this._p.mitt.off(event, handler);
        }
        return this;
    }

    /**
     * Emit an event
     * @param {string} event
     * @param {any} value
     * @returns {SelectBox}
     */
    emit(/**string|'*'*/event, /**any?*/value) {
        this._p.mitt.emit(event, value);
        return this;
    }

    /**
     * Prepare the mapping between values and items.
     * This reduces search time greatly (i.e when checking items), especially when Vue proxies are in place.
     * @private
     */
    _updateItemByValueMap() {
        const p = this._p;

        const itemByValueMap = p.itemByValueMap = new Map();
        const valueProp = p.valueProp;
        for (let item of p.items) {
            itemByValueMap.set(item[valueProp], item);
        }
    }

    /** @private */
    _renderBase() {
        const p = this._p;

        if (!p.inputBackBuffer) {
            p.inputBackBuffer = createElement('span', {
                css: {
                    position: 'absolute',
                    zIndex: -1,
                    left: 0,
                    top: '-9999px',
                    whiteSpace: 'pre',
                },
            });
        }

        if (!p.input) {
            p.inputWrapper = createElement('span',
                {
                    class: `${p.baseClassName}__search_wrapper`,
                },
                p.input = createElement('input', {
                    class: `${p.baseClassName}__search_field`,
                    type: 'search',
                    autocomplete: 'off',
                    autocorrect: 'off',
                    autocapitalize: 'off',
                    spellcheck: 'false',
                    role: 'textbox',
                    'aria-autocomplete': 'list',
                    readOnly: !(p.searchable || p.multi),
                }),
            );
        }

        if (p.multi) {
            if (p.singleWrapper) {
                this._cleanupSingleWrapper();
                remove(p.singleWrapper);
                delete p.singleWrapper;
            }

            if (!p.list) {
                // Moving `inputWrapper` to a new parent may cause a 'blur' event, and an unwanted chain reaction!
                // So we're unregistering those events here.
                this._unregisterDropdownEvents();

                // Restore focus to this one later if we affected it
                const lastActiveElement = document.activeElement;

                p.list = createElement('ul', {
                    class: `${p.baseClassName}__list`,
                });
                p.el.appendChild(p.list);
                p.list.appendChild(p.inputWrapper);
                p.el.classList.remove(`${p.baseClassName}__single`);
                p.el.classList.add(`${p.baseClassName}__multi`);

                // Hook clear and remove
                p.sink
                    .add(p.list, 'click', (evt) => {
                        if (!closestUntil(evt.target, `.${p.baseClassName}__item_remove`, evt.currentTarget))
                            return;

                        if (p.disabled) return;

                        this._removeMultiItemFromEvent(
                            /**@type Element*/
                            closestUntil(evt.target, `.${p.baseClassName}__item`, evt.currentTarget),
                            evt);
                    })
                    .add(p.list, 'keydown', (/**KeyboardEvent*/evt) => {
                        if (!closestUntil(evt.target, `.${p.baseClassName}__item`, evt.currentTarget))
                            return;

                        this._handleMultiKeydown(evt);
                    });

                if (lastActiveElement === p.input)
                    p.input.focus();

                this._registerDropdownEvents();
            }
        } else {
            if (p.list) {
                remove(p.list);
                p.sink.remove(p.list);
                delete p.list;
            }

            if (!p.singleWrapper) {
                // Moving `inputWrapper` to a new parent may cause a 'blur' event, and an unwanted chain reaction!
                // So we're unregistering those events here.
                this._unregisterDropdownEvents();

                // Restore focus to this one later if we affected it
                const lastActiveElement = document.activeElement;

                p.singleWrapper = createElement('div', {
                    class: `${p.baseClassName}__single_wrapper`,
                });
                p.el.appendChild(p.singleWrapper);
                p.el.appendChild(p.inputWrapper);
                p.el.classList.remove(`${p.baseClassName}__multi`);
                p.el.classList.add(`${p.baseClassName}__single`);

                if (lastActiveElement === p.input)
                    p.input.focus();

                this._registerDropdownEvents();
            }
        }

        if (p.hasOpenIndicator !== !!p.openIndicator) {
            if (p.hasOpenIndicator) {
                p.openIndicator = createElement('span', { class: `${p.baseClassName}__open_indicator` });
                p.el.appendChild(p.openIndicator);
            } else {
                remove(p.openIndicator);
                delete p.openIndicator;
                p.el.classList.remove(`${p.baseClassName}__has_open_indicator`);
            }
        }

        if (p.isLoadingMode !== !!p.spinner) {
            if (p.isLoadingMode) {
                p.spinner = createElement('span', { class: `${p.baseClassName}__spinner` });
                p.el.appendChild(p.spinner);
                p.el.classList.add(`${p.baseClassName}__has_spinner`);
            } else {
                remove(p.spinner);
                delete p.spinner;
                p.el.classList.remove(`${p.baseClassName}__has_spinner`);
            }
        }
    }

    /**
     * @private
     */
    _syncBaseClasses() {
        const p = this._p, el = p.el;

        if (!el)
            return;

        let classes = [p.baseClassName];

        if (p.multi)
            classes.push(`${p.baseClassName}__multi`);
        else classes.push(`${p.baseClassName}__single`);

        if (this.isListOpen())
            classes.push(`${p.baseClassName}__open_list`);
        else classes.push(`${p.baseClassName}__closed_list`);

        if (p.hasOpenIndicator)
            classes.push(`${p.baseClassName}__has_open_indicator`);

        if (p.clearButtonWrapper)
            classes.push(`${p.baseClassName}__has_clear`);

        if (p.isLoadingMode)
            classes.push(`${p.baseClassName}__has_spinner`);

        if (p.selectedValues.length === 0)
            classes.push(`${p.baseClassName}__empty_selection`);

        if (p.selectedValues.length > 0)
            classes.push(`${p.baseClassName}__has_selection`);

        if (p.searchable || p.multi)
            classes.push(`${p.baseClassName}__searchable`);

        if (p.direction === 'ltr' || p.direction === 'rtl')
            classes.push(`${p.baseClassName}__` + p.direction);

        if (p.additionalClasses) {
            classes = classes.concat(p.additionalClasses);
        }

        el.className = classes.join(' ');
    }

    /** @private */
    _setupDropdownMenu() {
        const p = this._p, valueProp = p.valueProp;

        if (p.dropList) {
            p.dropList.destroy();
            delete p.dropList;
            p.itemsChanged = true;
            p.selectionChanged = true;
            p.resortBySelectionNeeded = true;
        }

        const dropList = p.dropList = new DropList({
            virtualMinItems: 10,

            searchable: false,
            ...p.listOptions,

            multi: p.multi,
            capturesFocus: false,

            labelProp: p.labelProp,
            valueProp: p.valueProp,

            noResultsText: p.noResultsText,
            filterThrottleWindow: p.filterThrottleWindow,
            filterOnEmptyTerm: p.filterOnEmptyTerm,
            filterGroups: p.treatGroupSelectionAsItems,
            filterEmptyGroups: !p.treatGroupSelectionAsItems,
            filterFn: p.actualFilterFn,

            positionOptionsProvider: () => this._getDropListPositionOptions(),

            on: (name, event) => {
                switch (name) {
                    case 'show:before': {
                        p.dropListVisible = true;
                        p.el.setAttribute('aria-expanded', 'true');
                        p.el.classList.add(`${p.baseClassName}__open_list`);
                        p.el.classList.remove(`${p.baseClassName}__closed_list`);

                        if (p.resortBySelectionNeeded && (p.sortListCheckedFirst && p.multi))
                            p.itemsChanged = true;

                        this._updateListItems();
                        this._trigger('open', { list: dropList });

                        this._startTrackingPresence();

                        p.sink.add(window, 'resize.trackposition', () => this._repositionDropList());

                        let parent = p.el.parentNode;
                        while (parent) {
                            if (parent.scrollHeight > parent.offsetHeight ||
                                parent.scrollWidth > parent.offsetWidth) {
                                if (parent === document.documentElement) {
                                    parent = window;
                                }
                                p.sink.add(parent, 'scroll.trackposition', () => this._repositionDropList());
                            }
                            parent = parent.parentNode;
                        }
                    }
                        break;

                    case 'hide': {
                        p.dropListVisible = false;
                        p.el.setAttribute('aria-expanded', 'false');
                        p.el.classList.remove(`${p.baseClassName}__open_list`);
                        p.el.classList.add(`${p.baseClassName}__closed_list`);

                        if (!p.multi) {
                            if (p.clearInputWhen.includes('single_close'))
                                this._setInputText('');
                            this._scheduleSync('render_base');
                        } else {
                            if (p.clearInputWhen.includes('multi_close'))
                                this._setInputText('');
                        }

                        this._trigger('close');

                        if (this[DestroyedSymbol]) return; // destroyed by event handler

                        this._stopTrackingPresence();
                        p.sink.remove(null, '.trackposition');
                    }
                        break;

                    case 'check': {
                        if (!p.multi) return;

                        if (p.autoSelectTextOnCheck && p.input && document.activeElement === p.input) {
                            // Select the text in the input, without causing any focus changes
                            p.input.setSelectionRange(0, p.input.value.length);
                        }

                        const item = /**@type DropList.Item*/event.item;
                        const value = event.value;

                        let checked = event.checked;
                        if (event.isGroup && !p.treatGroupSelectionAsItems) return; // Ignore groups

                        let selEvt = {
                            value: value,
                            item: item,
                            cancel: false,
                            isCheckingGroup: event.isCheckingGroup,
                        };
                        this._trigger((checked ? 'addsel' : 'removesel') + ':before', selEvt);

                        if (selEvt.cancel) {
                            // Rollback that check
                            p.dropList.setItemChecked(value, !checked);
                            return;
                        }

                        if (checked) {
                            p.selectedItems.push(item);
                            p.selectedValues.push(value);
                        } else {
                            const idx = p.selectedValues.indexOf(value);
                            if (idx !== -1) {
                                p.selectedItems.splice(idx, 1);
                                p.selectedValues.splice(idx, 1);
                            }
                        }

                        // If we are in context of group, then there are lots of syncs coming, so do not do it now
                        const hasGroupSync = !!event.isCheckingGroup;

                        if (p.showSelection) {
                            if (checked) {
                                if (dropList.itemCount() === 1 && p.clearInputWhen.includes('multi_select_single')) {
                                    this._setInputText('');
                                }

                                if (p.sortSelectedItems) {
                                    if (!hasGroupSync)
                                        this._scheduleSync('full');
                                } else {
                                    if (p.maxMultiItems != null &&
                                        (p.treatGroupSelectionAsItems ? p.selectedItems : p.selectedItems.filter(x => !x._group)).length > p.maxMultiItems) {
                                        this._scheduleSync('addOrUpdateMultiItemRestElement');
                                    } else {
                                        this._scheduleSync('addMultiItemElement', item);
                                    }

                                    if (!hasGroupSync)
                                        this._scheduleSync('render_base');
                                }
                            } else {
                                if (p.maxMultiItems != null &&
                                    (p.treatGroupSelectionAsItems ? p.selectedItems : p.selectedItems.filter(x => !x._group)).length === p.maxMultiItems) {
                                    this._scheduleSync('removeMultiItemRestElement');
                                } else {
                                    this._scheduleSync('removeMultiItemElement', item);
                                }

                                if (!hasGroupSync)
                                    this._scheduleSync('render_base');
                            }
                        } else if (p.multi) {
                            this._scheduleSync('syncPlaceholder');
                        }

                        this._trigger(checked ? 'addsel' : 'removesel', {
                            value: value,
                            item: item,
                            isCheckingGroup: event.isCheckingGroup,
                        });
                    }
                        break;

                    case 'groupcheck': {
                        if (!p.multi) return;

                        if (p.autoSelectTextOnCheck && p.input && document.activeElement === p.input) {
                            // Select the text in the input, without causing any focus changes
                            p.input.setSelectionRange(0, p.input.value.length);
                        }

                        if (event.affectedCount) {
                            this._scheduleSync(p.sortSelectedItems ? 'full' : 'render_base');
                        }

                        this._trigger('groupcheck', {
                            value: event.value,
                            item: event.item,
                            affectedCount: event.affectedCount,
                        });
                    }
                        break;

                    case 'select': {
                        if (p.multi) return;

                        const item = event.item;
                        const value = event.value;

                        if (!this._performSelectWithEvent(item, value))
                            return;

                        if (this[DestroyedSymbol]) return; // destroyed by event handler

                        this.closeList();

                        if (p.blurOnSingleSelection === 'touch' && hasTouchCapability ||
                            p.blurOnSingleSelection !== 'touch' && p.blurOnSingleSelection) {
                            p.input && p.input.blur();
                        }
                    }
                        break;

                    case 'blur':
                        this._handleOnBlur();
                        break;

                    case 'search':
                        this._trigger('search', event);
                        break;

                    case 'itemschanged':
                        this._trigger('itemschanged', event);
                        break;
                }
            },
        });

        p.sink.add(dropList.el, 'mousedown', (event) => {
            const li = closestUntil(event.target, 'li', event.currentTarget);
            if (!li) return;

            event.preventDefault();
        });

        this._registerDropdownEvents();
    }

    _handleOnBlur() {
        const p = this._p;

        setTimeout(() => {
            if (this[DestroyedSymbol]) return; // destroyed by event handler
            if (p.disabled) return;

            this._trigger('search:blur');

            if (this[DestroyedSymbol]) return; // destroyed by event handler

            if (document.activeElement &&
                (p.input && p.input.contains(document.activeElement) ||
                    p.dropList && this.droplistElContains(document.activeElement, true))) {
                return;
            }

            this.closeList();
        });
    }

    _unregisterDropdownEvents() {
        const p = this._p;

        p.sink.remove(null, '.dropdown');
    }

    _registerDropdownEvents() {
        const p = this._p;

        this._unregisterDropdownEvents();

        const dropList = p.dropList;
        if (!dropList) return;

        let avoidToggleFromClick = false,
            currentTouchId = null;

        const keyEventsTarget = p.multi || p.searchable ? p.input : p.el;

        p.sink
            .add(keyEventsTarget, 'keydown.dropdown', evt => {
                if ((/**@type HTMLInputElement*/evt.currentTarget).readOnly)
                    return;

                let suppressEnterSpaceToggle = false;
                let lastKeyAllowsNonTypeKeys = p.lastKeyAllowsNonTypeKeys;
                p.lastKeyAllowsNonTypeKeys = false;
                let hasInputText = p.input && p.input.value.length > 0;

                switch (evt.key) {
                    case VALUE_PAGE_UP:
                    case VALUE_PAGE_DOWN:
                    case VALUE_UP:
                    case VALUE_DOWN:
                    case VALUE_HOME:
                    case VALUE_END:
                        if ((evt.key === VALUE_HOME || evt.key === VALUE_END) &&
                            hasInputText && !lastKeyAllowsNonTypeKeys) {
                            // Allow using HOME/END button within the textbox
                            dropList._keydownFreeType(evt);
                            break;
                        }

                        p.lastKeyAllowsNonTypeKeys = true;
                        evt.preventDefault();

                        switch (evt.key) {
                            case VALUE_PAGE_UP:
                                if (dropList.isVisible())
                                    dropList.previousPage(evt);
                                break;
                            case VALUE_PAGE_DOWN:
                                if (dropList.isVisible())
                                    dropList.nextPage(evt);
                                break;
                            case VALUE_UP:
                                if (dropList.isVisible()) {
                                    dropList.previous(evt);
                                } else {
                                    this._movePrev();
                                }
                                break;
                            case VALUE_DOWN:
                                if (dropList.isVisible()) {
                                    dropList.next(evt);
                                } else {
                                    this._moveNext();
                                }
                                break;

                            case VALUE_HOME:
                                dropList.goToFirst(evt);
                                break;

                            case VALUE_END:
                                dropList.goToLast(evt);
                                break;
                        }
                        break;

                    case VALUE_SPACE:
                        if (lastKeyAllowsNonTypeKeys) {
                            p.lastKeyAllowsNonTypeKeys = true;

                            if (dropList.isVisible() && dropList.hasFocusedItem()) {
                                suppressEnterSpaceToggle = true;
                                if (p.multi)
                                    dropList.toggleFocusedItem(evt);
                                else dropList.triggerItemSelection(null, evt);
                                evt.preventDefault();
                            }
                        }
                        break;

                    case VALUE_ENTER:
                        if (dropList.isVisible() && dropList.hasFocusedItem()) {
                            suppressEnterSpaceToggle = true;
                            evt.preventDefault();
                            dropList.triggerItemSelection(null, evt);
                        }

                        break;

                    case VALUE_TAB:
                        if (dropList.isVisible() && dropList.hasFocusedItem()) {
                            dropList.triggerItemSelection(null, evt);
                        }
                        break;

                    case VALUE_ESCAPE:
                        if (dropList.isVisible()) {
                            dropList.hide(evt);
                            evt.preventDefault();
                        }
                        break;

                    default:
                        dropList._keydownFreeType(evt);
                        break;
                }

                if (!suppressEnterSpaceToggle) {
                    if (evt.key === VALUE_ENTER || (
                        evt.key === VALUE_SPACE &&
                        p.lastKeyAllowsNonTypeKeys &&
                        !p.multi &&
                        !dropList.hasFocusedItem() &&
                        !p.disabled
                    )) {
                        this.toggleList();
                        evt.preventDefault();
                        evt.stopPropagation();
                    }
                }
            });

        if (p.input) {
            p.sink
                .add(p.input, 'input.dropdown', () => {
                    if (p.disabled) return;

                    p.filterTerm = p.input.value.trim();
                    p.dropList?.setSearchTerm(p.filterTerm, true);
                })
                .add(p.input, 'click.dropdown', () => {
                    if (p.disabled) return;

                    if (!p.multi && p.searchable) {
                        this.openList();
                    }
                })
                .add(p.input, 'focus.dropdown', () => {
                    if (p.disabled) return;

                    this._trigger('search:focus');

                    if (this[DestroyedSymbol]) return; // destroyed by event handler

                    avoidToggleFromClick = false;
                    this.openList();

                    avoidToggleFromClick = true;
                    setTimeout(() => { avoidToggleFromClick = false; }, 10);
                })
                .add(p.input, 'blur.dropdown', () => this._handleOnBlur());
        }

        p.sink
            .add(p.el, 'mousedown.dropdown', () => {
                if (!p.multi && !p.searchable && !avoidToggleFromClick && !p.disabled) {
                    this.toggleList();
                }
                avoidToggleFromClick = false;
            })
            .add(p.el, 'touchstart.dropdown', evt => {
                if (currentTouchId) return;
                currentTouchId = evt.changedTouches[0].identifier;

                if (this.isDisabled())
                    return;

                if (closestUntil(evt.target, `.${p.baseClassName}__item,.${p.baseClassName}__clear`, p.el))
                    return;

                let onTouchCancel = () => {
                    currentTouchId = null;
                    p.sink.remove(p.el, '.dropdown_touchextra');
                };

                (p.input || p.el).focus();

                p.sink
                    .add(p.el, 'touchend.dropdown_touchextra', (tevt) => {
                        let touch = Array.prototype.find.call(evt.changedTouches,
                            touch => touch.identifier === currentTouchId);
                        if (!touch) return onTouchCancel();

                        tevt.preventDefault();
                        onTouchCancel();
                    })
                    .add(p.el, 'touchmove.dropdown_touchextra', (tevt) => {
                        tevt.preventDefault();
                    })
                    .add(p.el, 'touchcancel.dropdown_touchextra', onTouchCancel);
            });
    }

    _performSelectWithEvent(item, value) {
        let cancellable = { value: value, item: item, cancel: false };
        this._trigger('select:before', cancellable);

        if (cancellable.cancel)
            return false;

        if (this[DestroyedSymbol]) return false; // destroyed by event handler

        this._setSelectedItems([item]);
        this._trigger('select', { value: value, item: item });

        return true;
    }

    _performClearWithEvent(clearInput = false) {
        let cancellable = { cancel: false };
        this._trigger('clear:before', cancellable);

        if (cancellable.cancel)
            return false;

        if (this[DestroyedSymbol]) return false; // destroyed by event handler

        this._setSelectedItems([]);

        if (clearInput)
            this._setInputText('');

        this._trigger('clear');

        return true;
    }

    _movePrev() {
        const p = this._p;

        if (this.isMultiEnabled()) return;

        let selectedItems = this.getSelectedItems();
        let finalItemCount = p.dropList.getFilteredItemCount();

        if ((finalItemCount + (p.clearable ? 1 : 0)) > 1) {
            let nextIndex = selectedItems.length > 0
                ? p.dropList.filteredItemIndexByItem(selectedItems[0]) - 1
                : (finalItemCount - 1);
            if (nextIndex === -1 && !p.clearable)
                nextIndex = finalItemCount - 1;

            let item = nextIndex === -1 ? null : p.dropList.filteredItemAtIndex(nextIndex);
            if (item) {
                this._performSelectWithEvent(item, item[p.valueProp]);
            } else {
                this._performClearWithEvent();
            }
        }
    }

    _moveNext() {
        const p = this._p;

        if (this.isMultiEnabled()) return;

        let selectedItems = this.getSelectedItems();
        let finalItemCount = p.dropList.getFilteredItemCount();

        if ((finalItemCount + (p.clearable ? 1 : 0)) > 1) {
            let nextIndex = selectedItems.length > 0
                ? p.dropList.filteredItemIndexByItem(selectedItems[0]) + 1
                : 0;
            if (nextIndex === finalItemCount)
                nextIndex = p.clearable ? -1 : 0;

            let item = nextIndex === -1 ? null : p.dropList.filteredItemAtIndex(nextIndex);
            if (item) {
                this._performSelectWithEvent(item, item[p.valueProp]);
            } else {
                this._performClearWithEvent();
            }
        }
    }

    /** @private */
    _updateListItems() {
        const p = this._p;

        const dropList = p.dropList;
        if (!dropList || !p.dropListVisible)
            return;

        if (p.itemsChanged || p.selectionChanged) {
            p.dropList._lastSerializedBox = null;
        }

        if (p.itemsChanged) {
            let items = p.items;
            if (p.sortListItems || (p.sortListCheckedFirst && p.multi)) {
                items = this._sortItems(items,
                    p.sortListItems,
                    p.sortListCheckedFirst && p.multi,
                    p.splitListCheckedGroups);
            }
            dropList.setItems(items);
            dropList.invokeRefilter();
            p.itemsChanged = false;
            p.selectionChanged = true;
            p.resortBySelectionNeeded = false;
        }

        let hasRefocusedItem = false;

        if (p.selectionChanged) {
            if (p.multi) {
                p.dropList.setCheckedValues(p.selectedValues);
            } else {
                const singleItemIndex = p.dropList.itemIndexByValue(this.getValue());

                p.dropList
                    .setFocusedItemAtIndex(singleItemIndex)
                    .setSingleSelectedItemAtIndex(singleItemIndex);

                hasRefocusedItem = p.dropList.hasFocusedItem();
            }
            p.selectionChanged = false;
        }

        this._repositionDropList();

        if (hasRefocusedItem) {
            p.dropList.setFocusedItemAtIndex(p.dropList.getFocusedItemIndex());
        }
    }

    /** @private */
    _setSelectedItems(items) {
        const p = this._p, valueProp = p.valueProp;

        if (p.multi) {
            p.selectedItems = items.filter(x => x[valueProp] !== undefined);
            p.selectedValues = p.selectedItems.map(x => x[valueProp]);
        } else {
            p.selectedItems = items.slice(0, 1);
            p.selectedValues = items.slice(0, 1).map(x => x[valueProp]);
        }

        p.selectionChanged = true;
        p.resortBySelectionNeeded = true;

        this._updateListItems();
        this._scheduleSync('full');
    }

    /** @private */
    _scheduleSync(mode, data) {
        const p = this._p;

        if (!p.syncQueue)
            p.syncQueue = [];

        if (mode === 'full' || ('render_items' === mode && !p.syncQueue.some(x => x.mode === 'full')))
            p.syncQueue.length = 0;

        if (p.syncQueue.length === 0 ||
            (!['full', 'render_items'].includes(mode)))
            p.syncQueue.push({ mode: mode, data: data });

        if (p.syncTimeout)
            return;

        p.syncTimeout = setTimeout(() => {
            delete p.syncTimeout;
            let queue = p.syncQueue;
            delete p.syncQueue;
            this._performSync(queue);
        });
    }

    /** @private */
    _performSync(queue) {
        const p = this._p;

        if (this[DestroyedSymbol])
            return;

        for (let op of queue) {
            switch (op.mode) {
                case 'full':
                    this._syncFull(true, true);
                    break;

                case 'render_base':
                    this._syncFull(false, false);
                    break;

                case 'render_items':
                    this._syncFull(true, false);
                    break;

                case 'render_list':
                    this._syncFull(false, true);
                    break;

                case 'render_clear':
                    this._syncClearButton();
                    this._resizeInput();
                    break;

                case 'singleItem':
                    this._syncSingleItem();
                    break;

                case 'syncPlaceholder':
                    this._syncPlaceholder();
                    break;

                case 'removeMultiItemElement': {
                    if (p.showSelection) {
                        this._syncPlaceholder();
                    } else {
                        const valueProp = p.valueProp;
                        const item = op.data,
                            value = item[valueProp];

                        let idx = p.multiItemEls.findIndex(x => x[ItemSymbol][valueProp] === value);
                        if (idx !== -1) {
                            this._removeMultiItemElementByIndex(idx);
                        }
                    }
                }
                    break;

                case 'addMultiItemElement': {
                    if (!p.showSelection) {
                        this._syncPlaceholder();
                    } else {
                        this._addMultiItemElement(op.data);
                    }
                }
                    break;

                case 'addOrUpdateMultiItemRestElement': {
                    if (!p.showSelection) {
                        this._syncPlaceholder();
                    } else {
                        this._addMultiItemRestElement();
                    }
                }
                    break;

                case 'removeMultiItemRestElement': {
                    if (!p.showSelection) {
                        this._syncPlaceholder();
                    } else {
                        let itemEl = p.multiItemEls[p.multiItemEls.length - 1];
                        if (itemEl?.[ItemSymbol]?.[p.valueProp] === RestMultiItemsSymbol) {
                            this._removeMultiItemElementByIndex(p.multiItemEls.length - 1);
                        }
                    }
                }
                    break;

                case 'resize_input': {
                    this._resizeInput();
                }
                    break;
            }
        }
    }

    /** @private */
    _cleanupSingleWrapper() {
        const p = this._p;

        if (!p.singleWrapper) return;

        if (p.unrenderSingleItem && p.singleWrapper.childNodes.length > 0) {
            try {
                p.unrenderSingleItem(p.singleWrapper[ItemSymbol], p.singleWrapper);
            } catch (err) {
                console.error(err); // eslint-disable-line no-console
            }
        }

        delete p.singleWrapper[ItemSymbol];
        p.singleWrapper.innerHTML = '';
    }

    /**
     * @param {number} index
     * @private
     */
    _removeMultiItemElementByIndex(index) {
        const p = this._p, multiItemEls = p.multiItemEls;

        if (multiItemEls.length > index) {
            const itemEl = multiItemEls[index];
            const item = itemEl[ItemSymbol];

            let unrender = item?.[p.valueProp] === RestMultiItemsSymbol
                ? p.unrenderRestMultiItem ?? p.unrenderMultiItem
                : p.unrenderMultiItem;

            if (unrender && itemEl.childNodes.length > 0) {
                try {
                    unrender(item, itemEl);
                } catch (err) {
                    console.error(err); // eslint-disable-line no-console
                }
            }
            remove(itemEl);

            // fastpath
            if (index === multiItemEls.length - 1) multiItemEls.pop();
            else multiItemEls.splice(index, 1);
        }
    }

    /**
     * @param {DropList.ItemBase} item
     * @private
     */
    _renderSingleItemContent(item) {
        const p = this._p;

        if (!p.renderSingleItem || p.renderSingleItem(item, p.singleWrapper) === false) {
            const labelProp = p.labelProp,
                multiItemLabelProp = p.multiItemLabelProp;

            let label = item[multiItemLabelProp] || item[labelProp];
            if (label === null || label === undefined)
                label = '';

            p.singleWrapper.appendChild(document.createTextNode(label));
        }
    }

    /**
     * @param {DropList.ItemBase} item
     * @param {Element} itemEl
     * @private
     */
    _renderMultiItemContent(item, itemEl) {
        const p = this._p;

        let render = item[p.valueProp] === RestMultiItemsSymbol
            ? p.renderRestMultiItem ?? p.renderMultiItem
            : p.renderMultiItem;

        if (!render || render(item, itemEl) === false) {
            const labelProp = p.labelProp,
                multiItemLabelProp = p.multiItemLabelProp;
            const label = item[multiItemLabelProp] || item[labelProp];
            itemEl.appendChild(createElement('span', {
                textContent: label,
            }));
        }
    }

    /**
     * @param {DropList.ItemBase} item
     * @returns {boolean} true if rendered, false if not
     * @private
     */
    _addMultiItemElement(item) {
        const p = this._p;
        const itemEl = this._renderMultiItem(item);
        if (!itemEl) return false;

        before(p.inputWrapper, itemEl);
        p.multiItemEls.push(itemEl);

        return true;
    }

    /** @private */
    _addMultiItemRestElement() {
        const p = this._p;

        let items = p.selectedItems.slice(0);
        let count = (p.treatGroupSelectionAsItems ? items : items.filter(x => !x._group)).length - p.maxMultiItems;
        let label = p.multiItemsRestLabelProvider
            ? p.multiItemsRestLabelProvider(count, items)
            : `+ ${count}`;

        this._addMultiItemElement({
            items: items,
            [p.valueProp]: RestMultiItemsSymbol,
            [p.labelProp]: label,
        });
    }

    /** @private */
    _syncClearButton() {
        const p = this._p,
            multiItemLabelProp = p.multiItemLabelProp;

        // Set clear button
        if (p.selectedItems.length > 0 &&
            p.selectedItems.some(x => x[multiItemLabelProp] !== false) &&
            p.clearable && p.showSelection) {
            if (!p.clearButtonWrapper) {
                p.clearButtonWrapper = createElement(
                    p.multi ? 'li' : 'span',
                    { class: `${p.baseClassName}__clear` },
                    p.clearButton = createElement('button'));
                if (p.multi)
                    append(p.list, p.clearButtonWrapper);
                else append(p.el, p.clearButtonWrapper);
                p.el.classList.add(`${p.baseClassName}__has_clear`);

                p.sink.add(p.clearButton, 'click', () => {
                    if (this.isDisabled()) return;
                    this.clear();
                });
            }
        } else {
            if (p.clearButtonWrapper) {
                p.sink.remove(p.clearButton, 'click');

                remove(p.clearButtonWrapper);
                delete p.clearButtonWrapper;
                delete p.clearButton;
                p.el.classList.remove(`${p.baseClassName}__has_clear`);
            }
        }
    }

    /** @private */
    _syncPlaceholder() {
        const p = this._p,
            multiItemLabelProp = p.multiItemLabelProp;

        let placeholder = '';

        if (p.multi && !p.showSelection) {
            if (typeof p.multiPlaceholderFormatter === 'function') {
                placeholder = p.multiPlaceholderFormatter(p.selectedItems);
            } else {
                placeholder = p.selectedItems.length === 0
                    ? (p.placeholder || '')
                    : defaultMultiPlaceholderFormatter(p.selectedItems, p.labelProp);
            }
        } else if (p.selectedItems.length === 0 ||
            !p.showSelection ||
            p.selectedItems.every(x => x[multiItemLabelProp] === false)) {
            placeholder = p.placeholder == null ? '' : (p.placeholder + '');
        }

        // Set input placeholder
        p.input.setAttribute('placeholder', placeholder);

        if (p.showPlaceholderInTooltip) {
            p.input.setAttribute('title', placeholder);
        } else {
            p.input.removeAttribute('title');
        }
    }

    /** @private */
    _syncSingleItem() {
        const p = this._p;

        if (p.singleWrapper)
            this._cleanupSingleWrapper();

        const items = p.selectedItems;

        if (items.length > 0) {
            this._renderSingleItemContent(items[0]);
            p.singleWrapper[ItemSymbol] = items[0];
        }
    }

    /**
     * Syncs render state, selected items, and position
     * @param {boolean=false} fullItemsRender Should re-render all items?
     * @param {boolean=false} updateListItems Should call updateListItems?
     * @returns {SelectBox}
     */
    _syncFull(fullItemsRender, updateListItems) {
        const p = this._p,
            multiItemLabelProp = p.multiItemLabelProp;

        this._renderBase();
        this._syncClearButton();
        this._syncPlaceholder();

        fullItemsRender = p.multi &&
            p.showSelection &&
            (fullItemsRender || p.selectedItems.filter(x => x[multiItemLabelProp] !== false).length !== p.multiItemEls.length);

        if (fullItemsRender || !p.showSelection || !p.multi) {
            // Remove all item elements
            while (p.multiItemEls.length > 0) {
                // use fast path by removing in reverse
                this._removeMultiItemElementByIndex(p.multiItemEls.length - 1);
            }
        }

        if (p.multi) {
            if (fullItemsRender) {
                const items = p.selectedItems;
                const treatGroupSelectionAsItems = p.treatGroupSelectionAsItems;

                // Sort these
                if (p.sortSelectedItems) {
                    const labelProp = p.labelProp,
                        multiItemLabelProp = p.multiItemLabelProp,
                        valueProp = p.valueProp,
                        stickyValues = p.stickyValues;

                    const comparator = p.sortItemComparator || ((a, b) => {
                        if (stickyValues !== null) {
                            let sa = stickyValues.has(a[valueProp]);
                            let sb = stickyValues.has(b[valueProp]);
                            if (sa && !sb) return -1;
                            if (!sa && sb) return 1;
                        }

                        const aLabel = a[multiItemLabelProp] || a[labelProp];
                        const bLabel = b[multiItemLabelProp] || b[labelProp];
                        return aLabel < bLabel ? -1 : (aLabel > bLabel ? 1 : 0);
                    });

                    items.sort(comparator);

                    p.selectedValues = items.map(x => x[valueProp]);
                }

                let actualItemCount = 0;
                let max = p.maxMultiItems;
                let addRestItem = false;

                // Add item elements
                for (let i = 0; i < items.length; i++) {
                    if (!treatGroupSelectionAsItems && items[i]._group) continue;

                    if (max != null && actualItemCount === max) {
                        addRestItem = true;
                        break;
                    }

                    if (this._addMultiItemElement(items[i])) {
                        actualItemCount++;
                    }
                }

                if (addRestItem) {
                    this._addMultiItemRestElement();
                }
            }
        } else if (!p.multi) {
            this._syncSingleItem();
        }

        if (getRootNode(p.el) !== document)
            return this;

        toggleClass(p.el, `${p.baseClassName}__empty_selection`, p.selectedValues.length === 0);
        toggleClass(p.el, `${p.baseClassName}__has_selection`, p.selectedValues.length > 0);

        if (p.searchable) {
            if (p.input) p.input.readOnly = false;
            p.el.classList.add(`${p.baseClassName}__searchable`);
        } else {
            if (p.input) p.input.readOnly = true;
            p.el.classList.remove(`${p.baseClassName}__searchable`);
        }

        // Update input size
        this._resizeInput();

        if (updateListItems) {
            this._updateListItems();
        }

        return this;
    }

    /**
     * @param {string} event
     * @param {*} [data]
     * @private
     */
    _trigger(event, data) {
        const p = this._p;
        if (p === undefined)
            return;
        if (p.on)
            p.on(event, ...(data === undefined ? [] : [data]));
        p.mitt.emit(event, data);
    }

    /**
     * Render a multi item
     * @param {Object} item
     * @returns {Element|null}
     * @private
     */
    _renderMultiItem(item) {
        const p = this._p;

        const labelProp = p.labelProp,
            multiItemLabelProp = p.multiItemLabelProp;
        const label = item[multiItemLabelProp] ?? item[labelProp];
        if (label === false)
            return null;

        const itemEl = createElement('li',
            {
                class: `${p.baseClassName}__item`,
                tabindex: '0',
                title: label,
            },
            [
                createElement('span', {
                    class: `${p.baseClassName}__item_remove`,
                    role: 'presentation',
                }),
            ],
        );

        this._renderMultiItemContent(item, itemEl);

        itemEl[ItemSymbol] = item;

        return itemEl;
    }

    /**
     * Removes a specific multi item by user event
     * @param {Element} itemEl
     * @param {Event} originatingEvent
     * @returns {SelectBox}
     * @private
     */
    _removeMultiItemFromEvent(itemEl, originatingEvent) {
        const p = this._p;

        let nextFocus;
        if (/key/.test(originatingEvent.type)) {
            const kEvent = /**@type KeyboardEvent*/originatingEvent;
            if (kEvent.key === VALUE_DELETE) { // Delete
                nextFocus = next(itemEl, `.${p.baseClassName}__item,.${p.baseClassName}__search_wrapper`);
            } else if (kEvent.key === VALUE_BACK_SPACE) { // Backspace
                nextFocus = prev(itemEl, `.${p.baseClassName}__item,.${p.baseClassName}__search_wrapper`);
            }
        } else if (/click|mouse|touch/.test(originatingEvent.type)) {
            nextFocus = next(itemEl, `.${p.baseClassName}__item,.${p.baseClassName}__search_wrapper`);
        }

        const item = itemEl[ItemSymbol], value = item[p.valueProp];

        if (item !== undefined) {
            if (value === RestMultiItemsSymbol) {
                let items = (p.treatGroupSelectionAsItems ? p.selectedItems : p.selectedItems.filter(x => !x._group))
                    .slice(p.maxMultiItems);
                let itemsToRemove = [];

                for (let item of items) {
                    let removeselEvt = { value: value, item: item, cancel: false };
                    this._trigger('removesel:before', removeselEvt);
                    if (!removeselEvt.cancel)
                        itemsToRemove.push(item);
                }

                if (itemsToRemove.length > 0) {
                    // remove the "rest" element, we'll add that back later if necessary
                    this._removeMultiItemElementByIndex(p.multiItemEls.length - 1);

                    for (let item of itemsToRemove) {
                        // sync selection
                        let idx = p.selectedItems.indexOf(item);
                        if (idx === -1)
                            idx = p.selectedValues.indexOf(value[p.valueProp]);
                        if (idx !== -1) {
                            p.selectedItems.splice(idx, 1);
                            p.selectedValues.splice(idx, 1);
                            p.selectionChanged = true;
                            p.resortBySelectionNeeded = true;
                        }
                    }
                }

                // we have not removed the whole "rest", then add the "rest" element back
                if (items.length > itemsToRemove.length) {
                    this._addMultiItemRestElement();
                }

                if (itemsToRemove.length > 0) {
                    this._scheduleSync('render_list');
                }
            } else {
                let removeselEvt = { value: value, item: item, cancel: false };
                this._trigger('removesel:before', removeselEvt);
                if (removeselEvt.cancel)
                    return this;

                this._removeMultiItem(item);

                // trigger event
                this._trigger('removesel', { value: value, item: item });
            }
        }

        if (!nextFocus) {
            nextFocus = p.el.querySelector(`.${p.baseClassName}__item, .${p.baseClassName}__search_field`);
        }

        if (hasClass(nextFocus, `${p.baseClassName}__search_wrapper`)) {
            nextFocus = nextFocus.querySelector('input');
        }

        nextFocus && nextFocus.focus();

        return this;
    }

    /**
     * @param {DropList.ItemBase} item
     * @param {boolean} [populate]
     * @private
     */
    _removeMultiItem(item, populate = false) {
        const p = this._p;
        const valueProp = p.valueProp,
            labelProp = p.labelProp;
        const value = item[valueProp];

        // sync selection
        let idx = p.selectedItems.indexOf(item);
        if (idx === -1)
            idx = p.selectedValues.indexOf(value);
        if (idx !== -1) {
            p.selectedItems.splice(idx, 1);
            p.selectedValues.splice(idx, 1);
            p.selectionChanged = true;
            p.resortBySelectionNeeded = true;
        }

        // sync multi item element
        idx = p.multiItemEls.findIndex(x => x[ItemSymbol] === item);
        if (idx === -1)
            idx = p.multiItemEls.findIndex(x => x[ItemSymbol][valueProp] === value);
        if (idx !== -1) {
            this._removeMultiItemElementByIndex(idx);
        }

        if (populate) {
            this._setInputText(item[p.multiItemLabelProp] || item[labelProp]);

            p.input.focus();

            // Go to end of input
            p.input.selectionStart = p.input.selectionEnd = p.input.value.length;
        }

        // sync
        this._scheduleSync('render_list');
    }

    /**
     * @param {*} value
     * @private
     */
    _setInputText(value) {
        const p = this._p;

        p.input.value = value == null ? '' : String(value);

        p.filterTerm = '';
        p.dropList?.setSearchTerm('', true);
    }

    /**
     * Update input size to current state
     * @returns {SelectBox}
     * @private
     */
    _resizeInput() {
        const p = this._p, el = p.el;

        if (!el.parentNode || !document.body.contains(el))
            return this;

        const input = p.input, backBufferEl = p.inputBackBuffer;

        let inputValue = input.value || input.placeholder;
        toggleClass(el, `${p.baseClassName}__has_input`, !!inputValue);
        toggleClass(el, `${p.baseClassName}__empty_input`, !inputValue);

        let hasResize = false;

        if (p.multi && p.multiItemEls.length === 0 && p.showSelection) {
            // Full width of list wrapper
            input.style.width = ''; // reset first

            let beforeWidth = 0, afterWidth = 0;

            let beforeStyle = getComputedStyle(p.list || el, '::before');
            if (beforeStyle.content &&
                beforeStyle.content !== 'none' &&
                beforeStyle.position !== 'absolute' &&
                beforeStyle.float !== 'none') {
                beforeWidth = getPseudoElementWidth(p.list || el, '::before', true, true, true);
            }

            let afterStyle = getComputedStyle(p.list || el, '::after');
            if (afterStyle.content &&
                afterStyle.content !== 'none' &&
                afterStyle.position !== 'absolute' &&
                afterStyle.float !== 'none') {
                afterWidth = getPseudoElementWidth(p.list || el, '::after', true, true, true);
            }

            let contentWidth = getElementWidth(p.list || el); // calculate width
            contentWidth -= beforeWidth + afterWidth;

            input.style.width = `${contentWidth}px`;

            hasResize = true; // We may want to track the resize here better to avoid unnecessary event
        } else {
            // Introduce backbuffer to DOM
            setCssProps(backBufferEl, getCssProps(input, inputBackbufferCssProps));
            backBufferEl.textContent = inputValue;
            el.appendChild(backBufferEl);

            // Measure these
            const computedStyle = getComputedStyle(input);
            const paddingTotal = (parseFloat(computedStyle.paddingLeft) || 0) + (parseFloat(computedStyle.paddingRight) || 0);
            const minWidth = (parseFloat(computedStyle['font-size']) || 0) * 0.75 + paddingTotal;
            const backBufferWidth = getElementWidth(backBufferEl, true, true);
            const currentWidth = getElementWidth(input, true, true);
            let newWidth = Math.max(backBufferWidth, minWidth);

            // Compare
            if (newWidth !== currentWidth) {
                // Update if needed
                setElementWidth(input, newWidth, true, true);

                let bordersWidth = (parseFloat(computedStyle.borderLeftWidth) || 0) + (parseFloat(computedStyle.borderRightWidth) || 0);
                let scrollWidth = input.scrollWidth + bordersWidth;

                if (scrollWidth > newWidth) {
                    // consider scrollWidth delta
                    let delta = scrollWidth - newWidth;
                    input.style.width = `${parseFloat(input.style.width) + delta}px`;

                    newWidth += delta;
                }

                // sync the single value wrapper.
                // it is meant as a preview or spacer for single selection value, so its appropriate to sync it with this width
                if (p.singleWrapper) {
                    p.singleWrapper.style.width = '';

                    if (inputValue) {
                        let width = newWidth - paddingTotal - bordersWidth;
                        if (getElementWidth(p.singleWrapper, false, false) < width) {
                            setElementWidth(p.singleWrapper, width, false, false);
                        }
                    }
                }

                hasResize = true;
            }

            // Remove backbuffer from DOM
            remove(backBufferEl);
        }

        if (hasResize)
            this._trigger('input:resize');

        return this;
    }

    /**
     * Update autocomplete position if needed
     * @returns {SelectBox}
     * @private
     */
    _repositionDropList() {
        const p = this._p, el = p.el;

        if (!p.dropList || !p.dropListVisible || !p.dropList.isVisible())
            return this;

        const box = el.getBoundingClientRect();
        const serialized = box.left + ',' + box.top + ',' + box.right + ',' + box.bottom;

        if (p.dropList._lastSerializedBox !== serialized) {
            p.dropList.relayout();
            p.dropList._lastSerializedBox = serialized;
        }

        return this;
    }

    /**
     * @param {KeyboardEvent} event
     * @private
     */
    _handleInputKeydown(event) {
        const p = this._p;

        const target = (/**@type HTMLInputElement*/event.target);

        if (event.key === VALUE_BACK_SPACE && event.ctrlKey && target.value.length === 0) {
            this.clear();

            event.preventDefault();
        } else if (event.key === VALUE_BACK_SPACE && target.value.length === 0) {
            const itemEl = p.multiItemEls[p.multiItemEls.length - 1];
            if (!itemEl || itemEl[ItemSymbol].value === undefined)
                return;

            const item = itemEl[ItemSymbol], value = item[p.valueProp];

            let removeselEvt = { value: value, item: item, cancel: false };
            this._trigger('removesel:before', removeselEvt);
            if (removeselEvt.cancel)
                return;

            this._removeMultiItem(item, true);

            // trigger event
            this._trigger('removesel', { value: value, item: item });

            event.preventDefault();
        }
    }

    /**
     * @param {KeyboardEvent} event
     * @private
     */
    _handleMultiKeydown(event) {
        const p = this._p;

        if (p.disabled) return;

        const isRtl = getComputedStyle(p.el).direction === 'rtl';

        let nextFocus;

        if (event.key === (isRtl ? VALUE_LEFT : VALUE_RIGHT)) { // Next arrow
            nextFocus = next(/**@type Element*/event.target, `.${p.baseClassName}__item,.${p.baseClassName}__search_wrapper`);
            if (hasClass(nextFocus, `${p.baseClassName}__search_wrapper`)) {
                nextFocus = nextFocus.querySelector('input');
            }
            nextFocus && nextFocus.focus();

            event.preventDefault();
        } else if (event.key === (isRtl ? VALUE_RIGHT : VALUE_LEFT)) { // Prev arrow
            nextFocus = prev(/**@type Element*/event.target, `.${p.baseClassName}__item,.${p.baseClassName}__search_wrapper`);
            if (hasClass(nextFocus, `${p.baseClassName}__search_wrapper`)) {
                nextFocus = nextFocus.querySelector('input');
            }
            nextFocus && nextFocus.focus();

            event.preventDefault();
        } else if (event.key === VALUE_BACK_SPACE && event.ctrlKey) { // Ctrl + Backspace
            const multiItemEls = [];
            let itemEl = event.target;
            while (itemEl) {
                multiItemEls.push(itemEl);
                itemEl = prev(/**@type Element*/itemEl, `.${p.baseClassName}__item`);
            }

            while (multiItemEls.length) {
                this._removeMultiItemFromEvent(multiItemEls.shift(), event);
            }

            event.preventDefault();
        } else if (event.key === VALUE_DELETE || event.key === VALUE_BACK_SPACE) { // Delete / Backspace
            this._removeMultiItemFromEvent(closestUntil(event.target, `.${p.baseClassName}__item`, p.el), event);
            event.preventDefault();
        }
    }

    /**
     * @returns {DropList.PositionOptions}
     * @private
     */
    _getDropListPositionOptions() {
        const p = this._p;

        return {
            target: /**@type Element*/p.el,
            offset: { x: 0, y: 0 },
            anchor: { x: 'start', y: 'bottom' },
            position: { x: 'start', y: 'top' },
            updateWidth: true,
        };
    }

    /** @private */
    _startTrackingPresence() {
        const p = this._p;

        this._stopTrackingPresence();

        p.presenceInt = setInterval(function () {
            if (getRootNode(p.el) !== document)
                this.hide();
        }, 200);
    }

    /** @private */
    _stopTrackingPresence() {
        const p = this._p;

        if (p.presenceInt) {
            clearInterval(p.presenceInt);
            p.presenceInt = null;
        }
    }

    /**
     * Handles sorting, and putting checked items first (according to selectedValues, not item.checked)
     * @private
     * @param {DropList.ItemBase[]} items
     * @param {boolean=false} sort
     * @param {boolean=false} sortCheckedFirst
     * @param {boolean=false} splitCheckedGroups
     * @returns {DropList.ItemBase[]}
     */
    _sortItems(items, sort, sortCheckedFirst, splitCheckedGroups) {
        const p = this._p;

        if (!sort && !sortCheckedFirst)
            return items; // Nothing to do

        const labelProp = p.labelProp,
            multiItemLabelProp = p.multiItemLabelProp,
            valueProp = p.valueProp,
            stickyValues = p.stickyValues,
            comparator = p.sortItemComparator || ((a, b) => {
                if (stickyValues !== null) {
                    let sa = stickyValues.has(a[valueProp]);
                    let sb = stickyValues.has(b[valueProp]);
                    if (sa && !sb) return -1;
                    if (!sa && sb) return 1;
                }

                const aLabel = a[labelProp] || a[multiItemLabelProp];
                const bLabel = b[labelProp] || b[multiItemLabelProp];

                if (aLabel < bLabel) return -1;
                if (aLabel > bLabel) return 1;

                return 0;
            });

        let group = [], stickyGroup = null;
        let groups = [group];
        const selectedValuesSet = new Set(p.selectedValues);
        let item, i, len;

        // Split to groups
        for (i = 0, len = items.length; i < len; i++) {
            item = items[i];
            if (item._group && group.length) {
                group = [];
                groups.push(group);
            }
            group.push(item);
        }

        // Leftover
        if (!group.length) {
            groups.length = 0;
        }

        // Non-grouped sticky should be first
        if (stickyValues && items.length > 0 && !items[0]._group) {
            stickyGroup = groups[0].filter(x => stickyValues.has(x[valueProp]));
            if (stickyGroup.length > 0) {
                groups[0] = groups[0].filter(x => !stickyValues.has(x[valueProp]));

                if (groups[0].length === 0)
                    groups.shift();
            } else {
                stickyGroup = null;
            }
        }

        if (sort) {
            // Sort the groups
            groups.sort((a, b) => {
                a = a[0];
                b = b[0];

                if (stickyValues !== null) {
                    let sa = stickyValues.has(a[valueProp]);
                    let sb = stickyValues.has(b[valueProp]);
                    if (sa && !sb) return -1;
                    if (!sa && sb) return 1;
                }

                // A "group" without a group item will come first
                if (!a._group && b._group) return -1;
                if (a._group && !b._group) return 1;

                return comparator(a, b);
            });
        }

        if (stickyGroup) {
            groups.unshift(stickyGroup);
        }

        // Now we have an array of groups, possibly sorted.
        // Each group is an array that begins with the group item (group name/id).
        // A group could possible start with a normal item, if it's a "default group", which had no group item.

        const checkedGroups = [], uncheckedGroups = [];

        // Iterate groups
        for (let g = 0, glen = groups.length; g < glen; g++) {
            group = groups[g];

            // Sort each group
            group.sort((a, b) => {

                // Grouping items come first
                if (a._group && !b._group) return -1;
                if (!a._group && b._group) return 1;

                if (sortCheckedFirst) {
                    const aChecked = selectedValuesSet.has(a[valueProp]);
                    const bChecked = selectedValuesSet.has(b[valueProp]);

                    if (aChecked && !bChecked) return -1;
                    if (!aChecked && bChecked) return 1;
                }

                if (sort) {
                    return comparator(a, b);
                }

                return 0;
            });

            uncheckedGroups.push(group);
        }

        if (sortCheckedFirst && splitCheckedGroups) {

            let virtualGroup;

            // Iterate groups
            for (let g = 0, glen = groups.length; g < glen; g++) {
                group = groups[g];

                if (group === stickyGroup) {
                    checkedGroups.push(stickyGroup);
                    let sgi = uncheckedGroups.indexOf(stickyGroup);
                    if (sgi !== -1) {
                        uncheckedGroups.splice(sgi, 1);
                    }
                    continue;
                }

                virtualGroup = null;

                for (let gi = 0, gilen = group.length; gi < gilen; gi++) {
                    item = group[gi];
                    if (item._group) continue;
                    if (!selectedValuesSet.has(item[p.valueProp])) break;

                    if (!virtualGroup) {
                        virtualGroup = [];
                        if (group[0]._group) {
                            virtualGroup.push(group[0]);
                        }
                    }

                    virtualGroup.push(item);
                    group.splice(gi--, 1);
                    gilen--;
                }

                if (virtualGroup) {
                    checkedGroups.push(virtualGroup);
                    if (group.length === 0 || (group.length === 1 && group[0]._group)) {
                        groups.splice(g--, 1);
                        glen--;

                        let sgi = uncheckedGroups.indexOf(group);
                        if (sgi !== -1) {
                            uncheckedGroups.splice(sgi, 1);
                        }
                    }
                }
            }
        }

        // Prepare the target array
        const joined = [];
        joined.length = items.length;
        let itemIndex = 0;

        groups = checkedGroups.length ?
            checkedGroups.concat(uncheckedGroups) : // Concat both lists
            uncheckedGroups; // No need for concat

        for (let g = 0, glen = groups.length; g < glen; g++) {
            group = groups[g];

            for (i = 0, len = group.length; i < len; i++) {
                joined[itemIndex++] = group[i];
            }
        }

        return joined;
    }
}

export default SelectBox;
