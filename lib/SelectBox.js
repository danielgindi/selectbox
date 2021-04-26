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
import DropList from './DropList';
import debounce from './utils/debounce';
import {
    VALUE_BACK_SPACE,
    VALUE_DELETE, VALUE_DOWN, VALUE_ENTER,
    VALUE_ESCAPE,
    VALUE_LEFT, VALUE_PAGE_DOWN,
    VALUE_PAGE_UP,
    VALUE_RIGHT, VALUE_SPACE,
    VALUE_TAB,
    VALUE_UP,
} from 'keycode-js';

const ItemSymbol = Symbol('item');
const DestroyedSymbol = Symbol('destroyed');
const NoResultsItemSymbol = Symbol('no_results_items');

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
 * @property {boolean} [disabled=false] Should start as disabled?
 * @property {boolean} [clearable=true] Has clear button?
 * @property {boolean} [hasOpenIndicator=true] has open/close indicator?
 * @property {string} [placeholder=''] Placeholder text
 * @property {boolean} [sortSelectedItems=true] Should the selected items be sorted?
 * @property {boolean} [sortListItems=true] Sort list items
 * @property {boolean} [sortListCheckedFirst=true] When sorting - put checked items first (applicable to `multi` mode only)
 * @property {boolean} [splitListCheckedGroups=true] Split groups to "checked" and "unchecked", works with `sortCheckedFirst` only
 * @property {boolean|'touch'} [blurOnSingleSelection='touch']
 * @property {boolean} [multi=false] can multiple values be selected?
 * @property {boolean} [showSelection=true] show selection? if false, the placeholder will take effect
 * @property {function(items: DropList.ItemBase[]):string} [multiPlaceholderFormatter] formatter for placeholder for multi items mode
 * @property {boolean} [searchable=false] is it searchable?
 * @property {string} [noResultsText='No matching results'] text for no results (empty for none)
 * @property {number} [filterDebounce=300] debounce time (milliseconds) for filtering
 * @property {string} [labelProp='label']
 * @property {string} [valueProp='value']
 * @property {string} [multiItemLabelProp='short_label']
 * @property {DropList.ItemBase[]|null} [items]
 * @property {function(item: DropList.ItemBase, itemEl: Element):(*|false)} [renderSingleItem]
 * @property {function(item: DropList.ItemBase, itemEl: Element)} [unrenderSingleItem]
 * @property {function(item: DropList.ItemBase, itemEl: Element):(*|false)} [renderMultiItem]
 * @property {function(item: DropList.ItemBase, itemEl: Element)} [unrenderMultiItem]
 * @property {function(item: DropList.ItemBase, itemEl: Element):(*|false)} [renderNoResultsItem]
 * @property {function(item: DropList.ItemBase, itemEl: Element)} [unrenderNoResultsItem]
 * @property {function(items: DropList.ItemBase[], term: string):(DropList.ItemBase[]|null)} [filterFn]
 * @property {function(name: string, ...args)} [on]
 * @property {string|string[]} [additionalClasses]
 * */
const defaultOptions = {
    el: null,
    baseClassName: 'selectbox',
    disabled: false,
    clearable: true,
    hasOpenIndicator: true,
    placeholder: '',
    sortSelectedItems: true,
    sortListItems: true,
    sortListCheckedFirst: true,
    splitListCheckedGroups: true,
    blurOnSingleSelection: 'touch',
    multi: false,
    showSelection: true,
    multiPlaceholderFormatter: null,
    searchable: true,
    noResultsText: 'No matching results',
    filterDebounce: 300,
    labelProp: 'label',
    valueProp: 'value',
    multiItemLabelProp: 'short_label',
    items: [],
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
'close': the drop list is closing
'addsel:before' {value, item, cancel: false}: an item selection is going to be added (in multi mode). return false to abort.
'removesel:before' {value, item, cancel: false}: an item selection is going to be removed (in multi mode). return false to abort.
'addsel' {value, item}: an item selection has been added (in multi mode)
'removesel' {value, item}: an item selection has been removed (in multi mode)
'select' {value, item}: an item has been selected (in single mode)
'search' {value}: input box value has changed
'search:focus': input box has gained focus
'search:blur': input box has lost focus
'input:resize': input box resized
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

            listOptions: o.listOptions,

            disabled: !!o.disabled,
            clearable: !!o.clearable,
            hasOpenIndicator: !!o.hasOpenIndicator,
            placeholder: o.placeholder,
            sortSelectedItems: !!o.sortSelectedItems,
            sortListItems: !!o.sortListItems,
            sortListCheckedFirst: !!o.sortListCheckedFirst,
            splitListCheckedGroups: !!o.splitListCheckedGroups,
            blurOnSingleSelection: o.blurOnSingleSelection,
            multi: o.multi,
            showSelection: o.showSelection,
            multiPlaceholderFormatter: o.multiPlaceholderFormatter,
            searchable: o.searchable,
            noResultsText: o.noResultsText,
            filterDebounce: o.filterDebounce,

            labelProp: o.labelProp,
            valueProp: o.valueProp,
            multiItemLabelProp: o.multiItemLabelProp,

            renderSingleItem: o.renderSingleItem,
            unrenderSingleItem: o.unrenderSingleItem,
            renderMultiItem: o.renderMultiItem,
            unrenderMultiItem: o.unrenderMultiItem,
            renderNoResultsItem: o.renderNoResultsItem,
            unrenderNoResultsItem: o.unrenderNoResultsItem,
            filterFn: o.filterFn,
            on: o.on,
            additionalClasses: o.additionalClasses,

            isLoadingMode: false,

            items: o.items || [],
            filteredItems: null,
            itemsChanged: true,

            sink: new DomEventsSink(),

            selectedItems: [],
            selectedValues: [],
            selectionChanged: true,

            debouncedUpdateListItems: debounce(() => this._updateListItems(), o.filterDebounce, true),
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
                if (closestUntil(evt.target, `.${p.baseClassName}__clear`, evt.currentTarget)) {
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

        this.setItems(p.items);

        this._scheduleSync();

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

        if (p.debouncedUpdateListItems)
            p.debouncedUpdateListItems.abort();

        this._cleanupSingleWrapper();

        if (p.unrenderMultiItem) {
            // Remove all tag elements
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

        this._p = null;
    }

    get el() {
        return this._p.el;
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
        p.filteredItems = null;
        p.itemsChanged = true;

        if (resetValues) {
            this.setSelectedValues(this.getSelectedValues());
        }

        return this;
    }

    updateItemByValue(value, newItem) {
        const p = this._p, valueProp = p.valueProp;

        let existingItem = p.items.find(x => x[valueProp] === value);
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
        this._scheduleSync();
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
        this._scheduleSync();
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
        this._scheduleSync();
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
            p.filteredItems = null;
            p.itemsChanged = true;

            this._trigger('search', { value: p.input.value });
            p.debouncedUpdateListItems();
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
        this._scheduleSync('full');
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
        p.filteredItems = null;
        p.itemsChanged = true;
        this._scheduleSync();
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
        if (p.sortCheckedFirst === sortListCheckedFirst)
            return this;

        p.sortCheckedFirst = sortListCheckedFirst;
        p.itemsChanged = true;
        this._scheduleSync();
        return this;
    }

    /**
     * @returns {boolean}
     */
    isSortListCheckedFirstEnabled() {
        return this._p.sortListCheckedFirst;
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
        this._scheduleSync();
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

        this._p.showSelection = showSelection;
        this._scheduleSync('full');
        return this;
    }

    /**
     * @returns {boolean}
     */
    isShowSelectionEnabled() {
        return this._p.showSelection;
    }

    /**
     * @param {function(items: DropList.ItemBase[]):string} formatter
     * @returns {SelectBox}
     */
    setMultiPlaceholderFormatter(formatter) {
        const p = this._p;

        if (p.multiPlaceholderFormatter === formatter)
            return this;

        this._p.multiPlaceholderFormatter = formatter;
        this._scheduleSync('full');
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

        this._p.blurOnSingleSelection = value;
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
        this._p.noResultsText = noResultsText;
        this._scheduleSync('full');
        return this;
    }

    /**
     * @returns {string}
     */
    getNoResultsText() {
        return this._p.noResultsText;
    }

    /**
     * @param {number} filterDebounce
     * @returns {SelectBox}
     */
    setFilterDebounce(filterDebounce) {
        const p = this._p;
        p.filterDebounce = filterDebounce;

        let isScheduled = p.debouncedUpdateListItems ? p.debouncedUpdateListItems.isScheduled() : false;

        if (p.debouncedUpdateListItems)
            p.debouncedUpdateListItems.abort();

        p.debouncedUpdateListItems = debounce(() => this._updateListItems(), p.filterDebounce, true);

        if (isScheduled)
            p.debouncedUpdateListItems();

        return this;
    }

    /**
     * @returns {number}
     */
    getFilterDebounce() {
        return this._p.filterDebounce;
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
    setRenderNoResultsItem(render, unrender) {
        const p = this._p;
        p.renderNoResultsItem = render;
        p.unrenderNoResultsItem = unrender;
        return this;
    }

    /**
     * @param {string} prop
     * @returns {SelectBox}
     */
    setLabelProp(prop) {
        const p = this._p;
        p.labelProp = prop;
        return this;
    }

    /**
     * @param {string} prop
     * @returns {SelectBox}
     */
    setValueProp(prop) {
        const p = this._p;
        p.valueProp = prop;
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
     * @param {function(items: DropList.ItemBase[], term: string):(DropList.ItemBase[]|null)} fn
     * @returns {SelectBox}
     */
    setFilterFn(fn) {
        const p = this._p;
        p.filterFn = fn;
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
        const p = this._p;

        let clearEvt = { cancel: false };
        this._trigger('clear:before', clearEvt);
        if (clearEvt.cancel)
            return this;

        p.selectedItems = [];
        p.selectedValues = [];
        p.selectionChanged = true;

        this._trigger('clear');

        if (this[DestroyedSymbol]) return this; // destroyed by event handler

        this._updateListItems();

        this._setInputText('');
        this._scheduleSync('full');

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

            let item = p.items.find(x => x[valueProp] === value);
            if (item !== undefined) {
                selectedItems.push(item);
            } else {
                selectedItems.push({ [p.valueProp]: value });
            }
        }

        p.selectedValues = selectedValues;
        p.selectedItems = selectedItems;
        p.selectionChanged = true;

        this._updateListItems();
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

        p.dropList.show();
        this._repositionDropList();

        // Another one in case the droplist position messed with screen layout.
        // If the out element's bounds stayed the same - nothing will be recalculated.
        // So this is *not* expensive.
        this._repositionDropList();

        if (p.dropList.hasFocusedItem()) {
            p.dropList.setFocusedItemAtIndex(p.dropList.getFocusedItemIndex());
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
        const p = this._p;
        let loading = on === undefined ? !this._p.isLoadingMode : !!on;

        if (p.isLoadingMode === loading)
            return this;

        p.isLoadingMode = loading;

        if (p.isLoadingMode && p.items.length === 0 && this.isListOpen()) {
            this.closeList();
        } else if (!p.isLoadingMode && document.activeElement &&
            ((p.multi || p.searchable) && p.input.contains(document.activeElement) ||
                (!p.multi && !p.searchable) && p.el.contains(document.activeElement))) {
            this.openList();
        }

        this._scheduleSync();
        return this;
    }
	
	
    /**
     * Can be called in case that the selectbox was attached to the dom late and has a weird size.
     * @returns {SelectBox}
     */
	refreshSize() {
		this._resizeInput();
		return this;
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

        if (p.searchable || p.multi)
            classes.push(`${p.baseClassName}__searchable`);

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
        }

        const renderNoResultsItem = p.renderNoResultsItem;
        const unrenderNoResultsItem = p.unrenderNoResultsItem;
        const customRenderItem = (p.listOptions || {}).renderItem;
        const customUnrenderItem = (p.listOptions || {}).unrenderItem;

        const renderItem = (renderNoResultsItem || customRenderItem) ? (item, itemEl) => {
            if (item && item[valueProp] === NoResultsItemSymbol) {
                if (renderNoResultsItem && renderNoResultsItem(item, itemEl) !== false) {
                    return true;
                }

                itemEl.appendChild(createElement('div', {
                    class: 'droplist-no-results-content',
                    textContent: p.noResultsText,
                }));
                return true;
            } else {
                if (customRenderItem)
                    return customRenderItem(item, itemEl);
            }
            return false;
        } : null;

        const unrenderItem = (unrenderNoResultsItem || customRenderItem) ? (item, itemEl) => {
            if (item && item[valueProp] === NoResultsItemSymbol) {
                if (unrenderNoResultsItem)
                    return unrenderNoResultsItem(item, itemEl);
            } else {
                if (customUnrenderItem)
                    return customUnrenderItem(item, itemEl);
            }
            return false;
        } : null;

        const dropList = p.dropList = new DropList({
            virtualMinItems: 10,

            ...p.listOptions,

            renderItem: renderItem,
            unrenderItem: unrenderItem,

            multi: p.multi,
            capturesFocus: false,

            labelProp: p.labelProp,
            valueProp: p.valueProp,

            on: (name, event) => {
                switch (name) {
                    case 'show:before': {
                        p.dropListVisible = true;
                        p.el.setAttribute('aria-expanded', 'true');
                        p.el.classList.add(`${p.baseClassName}__open_list`);
                        p.el.classList.remove(`${p.baseClassName}__closed_list`);

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
                            this._setInputText('');
                            this._scheduleSync();
                        }

                        this._trigger('close');

                        if (this[DestroyedSymbol]) return; // destroyed by event handler

                        this._stopTrackingPresence();
                        p.sink.remove(null, '.trackposition');
                    }
                        break;

                    case 'check': {
                        if (!p.multi) return;

                        const item = /**@type DropList.Item*/event.item;
                        const value = event.value;

                        let checked = item._checked;
                        if (item._group) return; // Ignore groups

                        let selEvt = { value: value, item: item, cancel: false };
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
                                if (dropList.itemCount() === 1) {
                                    this._setInputText('');
                                }

                                if (p.sortSelectedItems) {
                                    if (!hasGroupSync)
                                        this._scheduleSync('full');
                                } else {
                                    this._scheduleSync('addMultiItemElement', item);

                                    if (!hasGroupSync)
                                        this._scheduleSync();
                                }
                            } else {
                                this._scheduleSync('removeMultiItemElement', item);

                                if (!hasGroupSync)
                                    this._scheduleSync();
                            }
                        }

                        this._trigger(checked ? 'addsel' : 'removesel', { value: value, item: item });
                    }
                        break;

                    case 'groupcheck': {
                        if (!p.multi) return;

                        if (event.affectedItems) {
                            this._scheduleSync(p.sortSelectedItems ? 'full' : null);
                        }
                    }
                        break;

                    case 'select': {
                        if (p.multi) return;

                        const item = event.item;
                        const value = event.value;

                        let selectEvt = { value: value, item: item, cancel: false };
                        this._trigger('select:before', selectEvt);

                        if (selectEvt.cancel)
                            return;

                        if (this[DestroyedSymbol]) return; // destroyed by event handler

                        this._setSelectedItems([item]);
                        this._trigger('select', { value: value, item: item });

                        if (this[DestroyedSymbol]) return; // destroyed by event handler

                        this.closeList();

                        if (p.blurOnSingleSelection === 'touch' && hasTouchCapability ||
                            p.blurOnSingleSelection !== 'touch' && p.blurOnSingleSelection) {
                            p.input && p.input.blur();
                        }
                    }
                        break;
                }
            },
        });

        this._registerDropdownEvents();
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
            currentTouchId = null,
            suppressKeyPress = false,
            suppressKeyPressRepeat = false;

        const keyEventsTarget = p.multi || p.searchable ? p.input : p.el;

        p.sink
            .add(keyEventsTarget, 'keydown.dropdown', evt => {
                if ((/**@type HTMLInputElement*/evt.currentTarget).readOnly)
                    return;

                suppressKeyPress = false;
                suppressKeyPressRepeat = false;

                switch (evt.key) {
                    case VALUE_PAGE_UP:
                    case VALUE_PAGE_DOWN:
                    case VALUE_UP:
                    case VALUE_DOWN:
                        suppressKeyPress = true;
                        evt.preventDefault();

                        switch (evt.key) {
                            case VALUE_PAGE_UP:
                                dropList.previousPage(evt);
                                break;
                            case VALUE_PAGE_DOWN:
                                dropList.nextPage(evt);
                                break;
                            case VALUE_UP:
                                dropList.previous(evt);
                                break;
                            case VALUE_DOWN:
                                dropList.next(evt);
                                break;

                        }
                        break;

                    case VALUE_SPACE:
                        if (p.lastKeyAllowsSpaceToggle) {
                            if (dropList.hasFocusedItem()) {
                                suppressKeyPress = true;
                                suppressKeyPressRepeat = true;
                                if (p.multi)
                                    dropList.toggleFocusedItem(evt);
                                else dropList.triggerItemSelection(evt);
                                evt.preventDefault();
                            }
                        }
                        break;

                    case VALUE_ENTER:
                        if (dropList.isVisible() && dropList.hasFocusedItem()) {
                            suppressKeyPress = true;
                            suppressKeyPressRepeat = true;
                            evt.preventDefault();
                            dropList.triggerItemSelection(evt);
                        }

                        break;

                    case VALUE_TAB:
                        if (dropList.hasFocusedItem()) {
                            dropList.triggerItemSelection(evt);
                        }
                        break;

                    case VALUE_ESCAPE:
                        if (dropList.isVisible()) {
                            dropList.hide(evt);
                            evt.preventDefault();
                        }
                        break;

                    default:
                        suppressKeyPressRepeat = true;
                        dropList._keydownFreeType(evt);
                        break;
                }

                p.lastKeyAllowsSpaceToggle = evt.key === VALUE_UP ||
                    evt.key === VALUE_DOWN ||
                    evt.key === VALUE_PAGE_UP ||
                    evt.key === VALUE_PAGE_DOWN ||
                    (evt.key === VALUE_SPACE && !!p.lastKeyAllowsSpaceToggle);
            })
            .add(keyEventsTarget, 'keypress.dropdown', evt => {
                if (suppressKeyPress) {
                    suppressKeyPress = false;
                    evt.preventDefault();
                    return;
                }

                if (suppressKeyPressRepeat)
                    return;

                if (evt.key === VALUE_ENTER ||
                    (
                        evt.key === VALUE_SPACE &&
                        p.lastKeyAllowsSpaceToggle &&
                        !p.multi &&
                        !dropList.hasFocusedItem()
                    )
                ) {
                    this.toggleList();
                    evt.preventDefault();
                    evt.stopPropagation();
                    return;
                }

                switch (evt.key) {
                    case VALUE_PAGE_UP:
                    case VALUE_PAGE_DOWN:
                    case VALUE_UP:
                    case VALUE_DOWN:
                        evt.preventDefault();

                        switch (evt.key) {
                            case VALUE_PAGE_UP:
                                dropList.previousPage(evt);
                                break;
                            case VALUE_PAGE_DOWN:
                                dropList.nextPage(evt);
                                break;
                            case VALUE_UP:
                                dropList.previous(evt);
                                break;
                            case VALUE_DOWN:
                                dropList.next(evt);
                                break;

                        }
                        break;
                }
            });

        if (p.input) {
            p.sink
                .add(p.input, 'input.dropdown', () => {
                    p.filterTerm = p.input.value.trim();
                    p.filteredItems = null;
                    p.itemsChanged = true;

                    this._trigger('search', { value: p.input.value });

                    p.debouncedUpdateListItems();
                })
                .add(p.input, 'click.dropdown', () => {
                    if (!p.multi && p.searchable) {
                        this.openList();
                    }
                })
                .add(p.input, 'focus.dropdown', () => {
                    this._trigger('search:focus');

                    if (this[DestroyedSymbol]) return; // destroyed by event handler

                    avoidToggleFromClick = false;
                    this.openList();

                    avoidToggleFromClick = true;
                    setTimeout(() => { avoidToggleFromClick = false; }, 10);
                })
                .add(p.input, 'blur.dropdown', () => {
                    this._trigger('search:blur');

                    if (this[DestroyedSymbol]) return; // destroyed by event handler

                    if (p.debouncedUpdateListItems)
                        p.debouncedUpdateListItems.abort();

                    this.closeList();
                });
        }

        p.sink
            .add(p.el, 'mousedown.dropdown', () => {
                if (!p.multi && !p.searchable && !avoidToggleFromClick) {
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

    /** @private */
    _updateListItems() {
        const p = this._p;

        const dropList = p.dropList;
        if (!dropList || !p.dropListVisible)
            return;

        if (p.filterTerm && !p.filteredItems) {
            this._refilterItems();
        }

        if (p.itemsChanged || p.selectionChanged) {
            p.dropList._lastSerializedBox = null;
        }

        if (p.itemsChanged) {
            let items = p.filteredItems || p.items;
            if (p.sortListItems || (p.sortListCheckedFirst && p.multi)) {
                items = this._sortItems(items,
                    p.sortListItems,
                    p.sortListCheckedFirst && p.multi,
                    p.splitListCheckedGroups);
            }
            dropList.removeAllItems();

            if (items.length === 0 && p.noResultsText) {
                items = [{
                    [p.labelProp]: p.noResultsText,
                    [p.valueProp]: NoResultsItemSymbol,
                    _nointeraction: true,
                    _nocheck: true,
                }];
            }

            dropList.addItems(items);
            p.itemsChanged = false;
            p.selectionChanged = true;
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

                hasRefocusedItem = true && p.dropList.hasFocusedItem();
            }
            p.selectionChanged = false;
        }

        this._repositionDropList();

        if (hasRefocusedItem) {
            p.dropList.setFocusedItemAtIndex(p.dropList.getFocusedItemIndex());
        }
    }

    _refilterItems() {
        const p = this._p;

        const term = p.input.value.trim();
        if (p.filterTerm === term && p.filteredItems)
            return;

        p.filterTerm = term;

        if (term) {
            let fn = p.filterFn;

            let filteredItems;

            if (typeof fn === 'function') {
                filteredItems = p.filterFn(p.items, term);
            }

            if (!Array.isArray(filteredItems)) {
                const matcher = new RegExp(escapeRegex(term), 'i');
                const labelProp = p.labelProp,
                    multiItemLabelProp = p.multiItemLabelProp;

                filteredItems = p.items.filter(x => {
                    if (x._group) return true;
                    return matcher.test(x[labelProp] || x[multiItemLabelProp]);
                });
            }

            p.filteredItems = filteredItems;

            // Clean up groups without children

            let lastGroup = -1;
            let len = filteredItems.length;

            for (let i = 0; i < len; i++) {
                let item = filteredItems[i];

                if (item._group) {
                    if (lastGroup !== -1 && lastGroup === i - 1) {
                        // It was an empty group
                        filteredItems.splice(lastGroup, 1);
                        i--;
                        len--;
                    }

                    lastGroup = i;
                }
            }

            if (lastGroup !== -1) {
                if (lastGroup === len - 1) {
                    // It was an empty group
                    filteredItems.splice(lastGroup, 1);
                }
            }
        } else {
            p.filteredItems = null;
        }

        p.itemsChanged = true;
    }

    _setSelectedItems(items) {
        const p = this._p, valueProp = p.valueProp;

        if (p.multi) {
            p.selectedItems = items.filter(x => x[valueProp] !== undefined);
            p.selectedValues = p.selectedItems.map(x => x[valueProp]);
            p.selectionChanged = true;
        } else {
            p.selectedItems = items.slice(0, 1);
            p.selectedValues = items.slice(0, 1).map(x => x[valueProp]);
            p.selectionChanged = true;
        }

        this._updateListItems();
        this._scheduleSync('full');
    }

    _scheduleSync(mode, data) {
        const p = this._p;

        if (!p.syncQueue)
            p.syncQueue = [];

        if (mode === 'full')
            p.syncQueue.length = 0;

        if (p.syncQueue.length === 0 || p.syncQueue[0].mode !== 'full')
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

    _performSync(queue) {
        const p = this._p;

        if (this[DestroyedSymbol])
            return;

        for (let op of queue) {
            switch (op.mode) {
                case 'full':
                    this._syncFull(true);
                    break;

                case 'singleItem':
                    this._syncSingleItem();
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
                    if (p.showSelection) {
                        this._syncPlaceholder();
                    } else {
                        this._addMultiItemElement(op.data);
                    }
                }
                    break;

                case 'resize_input': {
                    this._resizeInput();
                }
                    break;

                default:
                    this._syncFull(false);
                    break;
            }
        }
    }

    _cleanupSingleWrapper() {
        const p = this._p;

        if (!p.singleWrapper) return;

        if (p.unrenderSingleItem && p.singleWrapper.childNodes.length > 0) {
            try {
                p.unrenderSingleItem(p.singleWrapper[ItemSymbol], p.singleWrapper);
            } catch (err) { console.error(err); } // eslint-disable-line no-console
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

            if (p.unrenderMultiItem && itemEl.childNodes.length > 0) {
                try {
                    p.unrenderMultiItem(itemEl[ItemSymbol], itemEl);
                } catch (err) { console.error(err); } // eslint-disable-line no-console
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

        if (!p.renderMultiItem || p.renderMultiItem(item, itemEl) === false) {
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
     * @private
     */
    _addMultiItemElement(item) {
        const p = this._p;
        const itemEl = this._renderMultiItem(item);
        before(p.inputWrapper, itemEl);
        p.multiItemEls.push(itemEl);
    }

    /** @private */
    _syncClearButton() {
        const p = this._p;

        // Set clear button
        if (p.selectedItems.length > 0 && p.clearable && p.showSelection) {
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
        const p = this._p;

        let placeholder = '';

        if (p.multi && !p.showSelection) {
            if (typeof p.multiPlaceholderFormatter === 'function') {
                placeholder = p.multiPlaceholderFormatter(p.selectedItems);
            } else {
                placeholder = defaultMultiPlaceholderFormatter(p.selectedItems, p.labelProp);
            }
        } else if (p.selectedItems.length === 0 || !p.showSelection) {
            placeholder = p.placeholder == null ? '' : (p.placeholder + '');
        }

        // Set input placeholder
        p.input.setAttribute('placeholder', placeholder);
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
     * @returns {SelectBox}
     */
    _syncFull(fullItemsRender) {
        const p = this._p;

        this._renderBase();
        this._syncClearButton();
        this._syncPlaceholder();

        fullItemsRender = p.multi && p.showSelection && (fullItemsRender || p.selectedItems.length !== p.multiItemEls.length);

        if (fullItemsRender || !p.showSelection || !p.multi) {
            // Remove all tag elements
            while (p.multiItemEls.length > 0) {
                // use fast path by removing in reverse
                this._removeMultiItemElementByIndex(p.multiItemEls.length - 1);
            }
        }

        if (p.multi) {
            if (fullItemsRender) {
                const items = p.selectedItems;

                // Sort these
                if (p.sortSelectedItems) {
                    const labelProp = p.labelProp,
                        multiItemLabelProp = p.multiItemLabelProp;
                    items.sort((a, b) => {
                        const aLabel = a[multiItemLabelProp] || a[labelProp];
                        const bLabel = b[multiItemLabelProp] || b[labelProp];
                        return aLabel < bLabel ? -1 : (aLabel > bLabel ? 1 : 0);
                    });
                }

                // Add tags
                for (let i = 0; i < items.length; i++) {
                    if (items[i]._group) continue;
                    this._addMultiItemElement(items[i]);
                }
            }
        } else if (!p.multi) {
            this._syncSingleItem();
        }

        if (getRootNode(p.el) !== document)
            return this;

        toggleClass(p.el, `${p.baseClassName}__empty_selection`, p.selectedValues.length === 0);
        toggleClass(p.el, `${p.baseClassName}__has_selection`, p.selectedValues.length > 0);

        if (p.searchable || p.multi) {
            if (p.input) p.input.readOnly = false;
            p.el.classList.add(`${p.baseClassName}__searchable`);
        } else {
            if (p.input) p.input.readOnly = true;
            p.el.classList.remove(`${p.baseClassName}__searchable`);
        }

        // Update input size
        this._resizeInput()._updateListItems();

        return this;
    }

    /**
     * @param {string} event
     * @param {*} [data]
     * @private
     */
    _trigger(event, data) {
        const p = this._p;
        if (p.on)
            p.on(event, ...(data === undefined ? [] : [data]));
    }

    /**
     * Render a multi item
     * @param {Object} item
     * @returns {Element}
     * @private
     */
    _renderMultiItem(item) {
        const p = this._p;

        const labelProp = p.labelProp,
            multiItemLabelProp = p.multiItemLabelProp;
        const label = item[multiItemLabelProp] || item[labelProp];

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
            let removeselEvt = { value: value, item: item, cancel: false };
            this._trigger('removesel:before', removeselEvt);
            if (removeselEvt.cancel)
                return this;

            this._removeMultiItem(item);

            // trigger event
            this._trigger('removesel', { value: value, item: item });
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
        this._scheduleSync();
    }

    /**
     * @param {*} value
     * @private
     */
    _setInputText(value) {
        const p = this._p;

        p.input.value = value == null ? '' : String(value);

        p.filterTerm = null;
        p.filteredItems = null;
        p.itemsChanged = true;
    }

    /**
     * Update input size to current state
     * @returns {SelectBox}
     * @private
     */
    _resizeInput() {
        const p = this._p;

        const input = p.input, backBufferEl = p.inputBackBuffer;

        let inputValue = input.value || input.placeholder;
        toggleClass(p.el, `${p.baseClassName}__has_input`, !!inputValue);
        toggleClass(p.el, `${p.baseClassName}__empty_input`, !inputValue);

        if (p.multi && p.multiItemEls.length === 0 && p.showSelection) {
            // Full width of list wrapper
            input.style.width = ''; // reset first

            let beforeWidth = 0, afterWidth = 0;

            let beforeStyle = getComputedStyle(p.list || p.el, '::before');
            if (beforeStyle.content &&
                beforeStyle.content !== 'none' &&
                beforeStyle.position !== 'absolute' &&
                beforeStyle.float !== 'none') {
                beforeWidth = getPseudoElementWidth(p.list || p.el, '::before', true, true, true);
            }

            let afterStyle = getComputedStyle(p.list || p.el, '::after');
            if (afterStyle.content &&
                afterStyle.content !== 'none' &&
                afterStyle.position !== 'absolute' &&
                afterStyle.float !== 'none') {
                afterWidth = getPseudoElementWidth(p.list || p.el, '::after', true, true, true);
            }

            let contentWidth = getElementWidth(p.list || p.el); // calculate width
            contentWidth -= beforeWidth + afterWidth;

            input.style.width = `${contentWidth}px`;
        } else {
            // Introduce backbuffer to DOM
            setCssProps(backBufferEl, getCssProps(input, inputBackbufferCssProps));
            backBufferEl.textContent = inputValue;
            p.el.appendChild(backBufferEl);

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
            }

            // Remove backbuffer from DOM
            remove(backBufferEl);
        }

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
            p.dropList.relayout(this._getDropListPositionOptions());
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
            valueProp = p.valueProp;

        let group = [];
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

        if (sort) {
            // Sort the groups
            groups.sort((a, b) => {
                a = a[0];
                b = b[0];

                // A "group" without a group item will come first
                if (!a._group && b._group) return -1;
                if (a._group && !b._group) return 1;

                const aLabel = a[labelProp] || a[multiItemLabelProp];
                const bLabel = a[labelProp] || a[multiItemLabelProp];

                if (aLabel < bLabel) return -1;
                if (aLabel > bLabel) return 1;

                return 0;
            });
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

                // Grouped items come first
                if (a._group && !b._group) return -1;
                if (!a._group && b._group) return 1;

                if (sortCheckedFirst) {
                    const aChecked = selectedValuesSet.has(a[valueProp]);
                    const bChecked = selectedValuesSet.has(b[valueProp]);

                    if (aChecked && !bChecked) return -1;
                    if (!aChecked && bChecked) return 1;
                }

                if (sort) {
                    const aLabel = a[labelProp] || a[multiItemLabelProp];
                    const bLabel = a[labelProp] || a[multiItemLabelProp];

                    if (aLabel < bLabel) return -1;
                    if (aLabel > bLabel) return 1;
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
