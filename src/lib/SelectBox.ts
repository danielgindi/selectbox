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
import reportError from './utils/reportError';
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
import mitt, { type Emitter } from 'mitt';
import type { SelectBoxOptions, ItemBase, DropListOptions, PositionOptions } from './types.js';

const DestroyedSymbol = Symbol('destroyed');
const RestMultiItemsSymbol = Symbol('rest_multi_items');

/**
 * The shape of `SelectBox#_p`, the internal state bag.
 *
 * Fields are required when the constructor guarantees they hold a real
 * value (possibly `null`) for the entire lifetime of the instance.
 * Fields stay optional (`?`) when their presence is genuinely conditional
 * on runtime state (e.g. only exists while a feature is toggled on, has no
 * default in `DefaultOptions`, or is `delete`d and re-created over the
 * instance's lifetime).
 * @internal
 */
interface SelectBoxState {
    ownsEl: boolean;
    baseClassName: string;
    additionalClasses?: string | string[];
    direction: 'ltr' | 'rtl' | 'auto';

    /** no default in `DefaultOptions` */
    listOptions?: DropListOptions;

    disabled: boolean;
    readOnly: boolean;
    clearable: boolean;
    hasOpenIndicator: boolean;
    placeholder: string;
    sortSelectedItems: boolean;
    sortListItems: boolean;
    sortListCheckedFirst: boolean;
    stickyValues: Set<any> | null;
    sortItemComparator: SelectBoxOptions['sortItemComparator'] | null;
    splitListCheckedGroups: boolean;
    treatGroupSelectionAsItems: boolean;
    blurOnSingleSelection: boolean | 'touch';
    multi: boolean;
    showSelection: boolean;
    showPlaceholderInTooltip: boolean;
    multiPlaceholderFormatter: SelectBoxOptions['multiPlaceholderFormatter'] | null;
    searchable: boolean;
    /** no default in `DefaultOptions` */
    allowTypeToSelect?: boolean;
    noResultsText: string;
    autoSelectTextOnCheck: boolean;

    labelProp: string;
    valueProp: string;
    multiItemLabelProp: string;
    multiItemRemovePosition: 'after' | 'before' | 'none';

    maxMultiItems: number | null;
    multiItemsRestLabelProvider: SelectBoxOptions['multiItemsRestLabelProvider'] | null;

    /** no default in `DefaultOptions` */
    renderSingleItem?: SelectBoxOptions['renderSingleItem'];
    unrenderSingleItem?: SelectBoxOptions['unrenderSingleItem'];
    renderMultiItem?: SelectBoxOptions['renderMultiItem'];
    unrenderMultiItem?: SelectBoxOptions['unrenderMultiItem'];
    renderRestMultiItem?: SelectBoxOptions['renderRestMultiItem'];
    unrenderRestMultiItem?: SelectBoxOptions['unrenderRestMultiItem'];

    on: SelectBoxOptions['on'] | null;
    silenceEvents: boolean;
    mitt: Emitter<Record<string, any>>;

    /** no default in `DefaultOptions`; falls back to `console.error`/`console.warn` when unset */
    onError?: SelectBoxOptions['onError'];

    isLoadingMode: boolean;
    closeListWhenLoading: boolean;
    clearInputWhen: string[];

    items: ItemBase[];
    itemsChanged: boolean;

    sink: any;

    resizeObserver: any;

    selectedItems: ItemBase[];
    selectedValues: any[];
    selectionChanged: boolean;
    resortBySelectionNeeded: boolean;

    filterThrottleWindow: number;
    filterOnEmptyTerm: boolean;
    filterFn: SelectBoxOptions['filterFn'] | null;
    /** always assigned by the end of the constructor (via `setFilterFn`) */
    actualFilterFn: SelectBoxOptions['filterFn'];
    filterTerm: string;

    el: HTMLElement;
    multiItemEls: HTMLElement[];
    input: HTMLInputElement;
    inputWrapper: HTMLElement;
    inputBackBuffer: HTMLElement;
    /** only exists in `multi` mode; `delete`d when switching to single mode */
    list?: HTMLElement;
    /** only exists in single-select mode; `delete`d when switching to multi mode */
    singleWrapper?: HTMLElement;
    /** `delete`d together with `clearButtonWrapper` */
    clearButton?: HTMLElement;
    /** `delete`d when the clear button is hidden */
    clearButtonWrapper?: HTMLElement;
    /** `delete`d when `hasOpenIndicator` is toggled off */
    openIndicator?: HTMLElement;
    /** `delete`d when `isLoadingMode` is toggled off */
    spinner?: HTMLElement;

    /** `delete`d and re-created whenever the dropdown menu is rebuilt */
    dropList?: DropList & { _lastSerializedBox?: string | null };
    dropListVisible: boolean;
    lastActiveElement: any;
    lastKeyAllowsNonTypeKeys: boolean;

    itemByValueMap: Map<any, ItemBase>;
    subitemByValueMap: Map<any, ItemBase> | null;

    /** only exists while a sync is queued; `delete`d once flushed */
    syncQueue?: any[];
    /** only exists while a sync is queued; `delete`d once flushed */
    syncTimeout?: ReturnType<typeof setTimeout>;
    presenceInt: ReturnType<typeof setInterval> | null;
}

const hasTouchCapability = !!('ontouchstart' in window
    || ((window as any).DocumentTouch && window.document instanceof (window as any).DocumentTouch)
    || window.navigator.maxTouchPoints
);

const hasClass = function (el: any, className: string) {
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

export const DefaultOptions: SelectBoxOptions = {
    el: null,
    baseClassName: 'selectbox',
    disabled: false,
    readOnly: false,
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
    multiItemRemovePosition: 'after',
    maxMultiItems: null,
    multiItemsRestLabelProvider: null,
    items: [],
    selectedValues: undefined,
    value: undefined,
    isLoadingMode: false,
    closeListWhenLoading: true,
    clearInputWhen: ['single_close', 'multi_select_single'],
};

const defaultMultiPlaceholderFormatter = (items: any[], labelProp: string) => {
    if (items.length === 0)
        return '';

    let title = items[0][labelProp] + '';

    if (items.length > 1) {
        title += ` (+${items.length - 1})`;
    }

    return title;
};


function getFocusState(element: any) {
    if (!element)
        return null;

    const state: any = { element };

    if (typeof element.selectionStart === 'number' &&
        typeof element.selectionEnd === 'number') {
        state.selectionStart = element.selectionStart;
        state.selectionEnd = element.selectionEnd;
        state.selectionDirection = element.selectionDirection;
    }

    return state;
}

function restoreFocusState(state: any) {
    if (!state?.element || !document.body.contains(state.element))
        return false;

    state.element.focus();

    if (typeof state.selectionStart === 'number' &&
        typeof state.selectionEnd === 'number' &&
        typeof state.element.setSelectionRange === 'function') {
        state.element.setSelectionRange(
            state.selectionStart,
            state.selectionEnd,
            state.selectionDirection ?? 'none',
        );
    }

    return true;
}

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
'search:term': search term has been updated, before results were re-filtered
'input:resize': input box resized
'itemschanged' {term, mutated, count}: the current set of items has changed
 */

// noinspection JSUnusedGlobalSymbols
class SelectBox {
    /** @internal */
    _p: SelectBoxState | null;
    /** @internal */
    [DestroyedSymbol]?: boolean;
    /** @internal */
    silenceEvents?: boolean;

    constructor(options: SelectBoxOptions) {
        const o = { ...DefaultOptions };

        for (let [key, value] of Object.entries(/**@type Object*/options))
            if (value !== undefined)
                (o as any)[key] = value;

        const p = this._p = {
            ownsEl: true,

            baseClassName: o.baseClassName,
            additionalClasses: o.additionalClasses,
            direction: o.direction === 'ltr' ? 'ltr' : o.direction === 'rtl' ? 'rtl' : 'auto',

            listOptions: o.listOptions,

            disabled: !!o.disabled,
            readOnly: !!o.readOnly,
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
            allowTypeToSelect: o.allowTypeToSelect,
            noResultsText: o.noResultsText,
            autoSelectTextOnCheck: o.autoSelectTextOnCheck,

            labelProp: o.labelProp,
            valueProp: o.valueProp,
            multiItemLabelProp: o.multiItemLabelProp,
            multiItemRemovePosition: o.multiItemRemovePosition,

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
            mitt: mitt<Record<string, any>>(),

            onError: o.onError,

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

            dropListVisible: false,
            lastActiveElement: null,
            lastKeyAllowsNonTypeKeys: false,

            presenceInt: null,
        } as SelectBoxState;

        let el: HTMLElement = o.el as HTMLElement;
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
        this.setReadOnly(p.readOnly);

        this._setupDropdownMenu();

        // --- Hook click
        p.sink
            .add(el, 'click', (evt: any) => {
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
        p.sink.add(el, 'focus', (evt: any) => {
            const target = (/**Element*/evt.target);

            if (!el.contains(evt.relatedTarget) &&
                !hasClass(target, `${p.baseClassName}__search_field`) &&
                !hasClass(target, `${p.baseClassName}__item`)) {
                let field: HTMLElement | null = el.querySelector(`.${p.baseClassName}__search_field`);
                field && field.focus();
            }
        }, true);

        p.sink
            .add(p.input, 'keydown', (/**KeyboardEvent*/event: any) => {
                this._handleInputKeydown(event);
            })
            .add(p.input, 'input', () => {
                this._resizeInput();
            });

        const focusInOutHandler = (() => {
            let t: any;
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
            let lastSize: any = {
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

    get el(): HTMLElement | null {
        return this._p?.el ?? null;
    }

    get droplistInstance(): DropList | undefined {
        return this._p.dropList;
    }

    /**
     * Returns true if other is an inclusive descendant of droplist node, false otherwise, and undefined if the droplist is not initiated.
     */
    droplistElContains(other: any, considerSubmenus = true): boolean | undefined {
        return this._p.dropList?.elContains(other, considerSubmenus);
    }

    /**
     * Enables the control
     */
    enable(enabled: boolean = true): this {
        const p = this._p;

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
     */
    isEnabled() {
        return !this._p.disabled;
    }

    /**
     * Disables the control
     */
    disable(disabled: boolean = true): this {
        return this.enable(!disabled);
    }

    /**
     * Is the control disabled?
     */
    isDisabled() {
        return this._p.disabled;
    }

    /**
     * Sets read only mode
     */
    setReadOnly(readOnly: boolean = true): this {
        const p = this._p;

        p.readOnly = readOnly;
        p.el.setAttribute('aria-readOnly', p.readOnly.toString());
        p.input.readOnly = !(p.searchable || p.multi) || !!p.readOnly;

        return this;
    }

    /**
     * Is the control read only?
     */
    isReadOnly() {
        return this._p.readOnly;
    }

    setAdditionalClasses(classes: string | string[]): this {
        const p = this._p;
        p.additionalClasses = classes;
        this._syncBaseClasses();
        return this;
    }

    /**
     * @param items the items to set (not values)
     * @param resetValues should reset values to current values (essentially refresh the data based on items & values). If set to false, use setValue to set a fresh value
     */
    setItems(items?: ItemBase[], resetValues = true): this {
        const p = this._p;

        if (!items)
            items = [];

        p.items = items.slice(0);
        p.itemsChanged = true;

        this._refreshItemByValueMap();

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

    updateItemByValue(value: any, newItem: ItemBase) {
        const p = this._p;

        let existingItem = this._getItemByValue(value);
        if (existingItem) {
            const valueProp = existingItem[p.valueProp];
            if (p.itemByValueMap?.has(valueProp))
                p.itemByValueMap.delete(valueProp);

            Object.assign(existingItem, newItem);

            p.itemByValueMap.set(existingItem[p.valueProp], existingItem);
        }

        if (p.dropList) {
            p.dropList.updateItemByValue(value, newItem);
        }
    }

    getItems() {
        const p = this._p;
        return p.items;
    }

    setClearable(clearable: boolean): this {
        clearable = !!clearable;

        if (this._p.clearable === clearable)
            return this;

        this._p.clearable = !!clearable;
        this._scheduleSync('render_clear');
        return this;
    }

    getClearable() {
        return this._p.clearable;
    }

    setHasOpenIndicator(enabled: boolean): this {
        enabled = !!enabled;

        if (this._p.hasOpenIndicator === enabled)
            return this;

        this._p.hasOpenIndicator = enabled;
        this._scheduleSync('render_base');
        return this;
    }

    getHasOpenIndicator() {
        return this._p.hasOpenIndicator;
    }

    setPlaceholder(placeholder: string): this {
        this._p.placeholder = placeholder == null ? '' : String(placeholder);
        this._scheduleSync('render_base');
        return this;
    }

    getPlaceHolder() {
        return this._p.placeholder;
    }

    /**
     * @param term the search term to set
     * @param performSearch should actually perform the search, or just set the input's text?
     */
    setSearchTerm(term: string, performSearch = false): this {
        const p = this._p;

        if (!p.input) return this;

        p.input.value = term;

        this._scheduleSync('resize_input');

        if (performSearch) {
            p.filterTerm = p.input.value.trim();
            this._trigger('search:term', p.filterTerm);
            p.dropList?.setSearchTerm(p.filterTerm, performSearch);
        }

        return this;
    }

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

    setSortSelectedItems(sortSelectedItems: boolean): this {
        const p = this._p;
        sortSelectedItems = !!sortSelectedItems;
        if (p.sortSelectedItems === sortSelectedItems)
            return this;

        p.sortSelectedItems = sortSelectedItems;
        this._scheduleSync('render_items');
        return this;
    }

    isSortSelectedItemsEnabled() {
        return this._p.sortSelectedItems;
    }

    setSortListItems(sortListItems: boolean): this {
        const p = this._p;
        sortListItems = !!sortListItems;
        if (p.sortListItems === sortListItems)
            return this;

        p.sortListItems = sortListItems;
        p.itemsChanged = true;
        this._scheduleSync('render_list');
        return this;
    }

    isSortListItemsEnabled() {
        return this._p.sortListItems;
    }

    setSortListCheckedFirst(sortListCheckedFirst: boolean): this {
        const p = this._p;
        sortListCheckedFirst = !!sortListCheckedFirst;
        if (p.sortListCheckedFirst === sortListCheckedFirst)
            return this;

        p.sortListCheckedFirst = sortListCheckedFirst;
        p.itemsChanged = true;
        this._scheduleSync('render_list');
        return this;
    }

    isSortListCheckedFirstEnabled() {
        return this._p.sortListCheckedFirst;
    }

    setStickyValues(values: any[]): this {
        const p = this._p;

        p.stickyValues = Array.isArray(values) ? new Set(values) : null;
        p.itemsChanged = true;
        this._scheduleSync('render_list');
        return this;
    }

    getStickyValues() {
        return this._p.stickyValues ? Array.from(this._p.stickyValues) : null;
    }

    setSortItemComparator(comparator: SelectBoxOptions['sortItemComparator']): this {
        const p = this._p;
        if (p.sortItemComparator === comparator)
            return this;

        p.sortItemComparator = comparator;
        p.itemsChanged = true;
        this._scheduleSync('render_list');
        return this;
    }

    getSortItemComparator() {
        return this._p.sortItemComparator;
    }

    setTreatGroupSelectionAsItems(treatGroupSelectionAsItems: boolean): this {
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

    isTreatGroupSelectionAsItemsEnabled() {
        return !this._p.treatGroupSelectionAsItems;
    }

    setSplitListCheckedGroups(splitListCheckedGroups: boolean): this {
        const p = this._p;
        splitListCheckedGroups = !!splitListCheckedGroups;
        if (p.splitListCheckedGroups === splitListCheckedGroups)
            return this;

        p.splitListCheckedGroups = splitListCheckedGroups;
        p.itemsChanged = true;
        this._scheduleSync('render_list');
        return this;
    }

    isSplitListCheckedGroupsEnabled() {
        return this._p.splitListCheckedGroups;
    }

    setShowSelection(showSelection: boolean): this {
        const p = this._p;
        showSelection = !!showSelection;
        if (p.showSelection === showSelection)
            return this;

        p.showSelection = showSelection;
        this._scheduleSync('render_items');
        return this;
    }

    isShowSelectionEnabled() {
        return this._p.showSelection;
    }

    setShowPlaceholderInTooltip(showPlaceholderInTooltip: boolean): this {
        const p = this._p;
        showPlaceholderInTooltip = !!showPlaceholderInTooltip;
        if (p.showPlaceholderInTooltip === showPlaceholderInTooltip)
            return this;

        p.showPlaceholderInTooltip = showPlaceholderInTooltip;
        this._scheduleSync('render_base');
        return this;
    }

    isShowPlaceholderInTooltipEnabled() {
        return this._p.showPlaceholderInTooltip;
    }

    setMultiPlaceholderFormatter(formatter: SelectBoxOptions['multiPlaceholderFormatter']): this {
        const p = this._p;

        if (p.multiPlaceholderFormatter === formatter)
            return this;

        p.multiPlaceholderFormatter = formatter;
        this._scheduleSync('render_base');
        return this;
    }

    setBlurOnSingleSelection(value: boolean | 'touch'): this {
        const p = this._p;
        if (p.blurOnSingleSelection === value)
            return this;

        p.blurOnSingleSelection = value;
        return this;
    }

    getBlurOnSingleSelection() {
        return this._p.blurOnSingleSelection;
    }

    setMulti(multi: boolean): this {
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

    isMultiEnabled() {
        return this._p.multi;
    }

    setSearchable(searchable: boolean): this {
        const p = this._p;
        searchable = !!searchable;
        if (p.searchable === searchable)
            return this;

        p.searchable = searchable;
        this._scheduleSync('full');

        return this;
    }

    setAllowTypeToSelect(allowTypeToSelect: boolean): this {
        const p = this._p;
        allowTypeToSelect = !!allowTypeToSelect;
        if (p.allowTypeToSelect === allowTypeToSelect)
            return this;

        p.allowTypeToSelect = allowTypeToSelect;
        return this;
    }

    isSearchableEnabled() {
        return this._p.searchable;
    }

    setNoResultsText(noResultsText: string): this {
        this._p.dropList?.setNoResultsText(noResultsText);
        return this;
    }

    getNoResultsText() {
        return this._p.noResultsText;
    }

    setAutoSelectTextOnCheck(autoSelectTextOnCheck: boolean): this {
        this._p.autoSelectTextOnCheck = autoSelectTextOnCheck;
        return this;
    }

    getAutoSelectTextOnCheck() {
        return this._p.autoSelectTextOnCheck;
    }

    setFilterThrottleWindow(window: number): this {
        const p = this._p;
        p.filterThrottleWindow = window;
        p.dropList?.setFilterThrottleWindow(window);
        return this;
    }

    getFilterThrottleWindow() {
        return this._p.filterThrottleWindow;
    }

    setFilterOnEmptyTerm(value: boolean): this {
        const p = this._p;
        if (p.filterOnEmptyTerm === value)
            return this;
        p.dropList?.setFilterOnEmptyTerm(value);
        return this;
    }

    getFilterOnEmptyTerm() {
        return this._p.filterOnEmptyTerm;
    }

    setListOptions(listOptions: DropListOptions): this {
        const p = this._p;
        p.listOptions = listOptions;
        this._setupDropdownMenu();
        return this;
    }

    setRenderSingleItem(render: SelectBoxOptions['renderSingleItem'], unrender: SelectBoxOptions['unrenderSingleItem']): this {
        const p = this._p;
        p.renderSingleItem = render;
        p.unrenderSingleItem = unrender;
        return this;
    }

    setRenderMultiItem(render: SelectBoxOptions['renderMultiItem'], unrender: SelectBoxOptions['unrenderMultiItem']): this {
        const p = this._p;
        p.renderMultiItem = render;
        p.unrenderMultiItem = unrender;
        return this;
    }

    setRenderRestMultiItem(render: SelectBoxOptions['renderRestMultiItem'], unrender: SelectBoxOptions['unrenderRestMultiItem']): this {
        const p = this._p;
        p.renderRestMultiItem = render;
        p.unrenderRestMultiItem = unrender;
        return this;
    }

    setLabelProp(prop: string): this {
        const p = this._p;
        p.labelProp = prop;

        if (p.dropList)
            p.dropList.setLabelProp(prop);

        return this;
    }

    setValueProp(prop: string): this {
        const p = this._p;

        if (p.valueProp === prop)
            return this;

        p.valueProp = prop;

        if (p.dropList)
            p.dropList.setValueProp(prop);

        this._refreshItemByValueMap();

        return this;
    }

    setMultiItemLabelProp(prop: string): this {
        const p = this._p;
        p.multiItemLabelProp = prop;
        this._scheduleSync('render_items');
        return this;
    }

    setMultiItemRemovePosition(position: 'after' | 'before' | 'none'): this {
        const p = this._p;
        p.multiItemRemovePosition = position;
        this._scheduleSync('render_items');
        return this;
    }

    setMaxMultiItems(value: number | null | undefined): this {
        const p = this._p;
        p.maxMultiItems = value;
        return this;
    }

    setMultiItemsRestLabelProvider(value: SelectBoxOptions['multiItemsRestLabelProvider']): this {
        const p = this._p;
        p.multiItemsRestLabelProvider = value;
        return this;
    }

    setFilterFn(fn: SelectBoxOptions['filterFn'] | null): this {
        const p = this._p;

        fn ??= null;

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

    getFilterFn(): SelectBoxOptions['filterFn'] | null {
        return this._p.filterFn;
    }

    /**
     * Sets a handler to intercept internal errors/warnings (e.g. from a throwing `renderMultiItem`/`unrenderSingleItem`)
     * instead of the default `console.error`/`console.warn`. Also used as the default `onError` for the internal
     * `DropList`, unless `listOptions.onError` is set explicitly.
     */
    setOnError(fn?: SelectBoxOptions['onError'] | null): this {
        const p = this._p;
        p.onError = fn ?? undefined;
        p.dropList?.setOnError(p.listOptions?.onError ?? p.onError);
        return this;
    }

    /**
     * Gets the current `onError` handler, if any.
     */
    getOnError() {
        return this._p.onError;
    }

    /**
     * Focus on input element
     */
    focusInput() {
        const p = this._p;

        if (p.input)
            p.input.focus();

        return this;
    }

    /**
     * Remvoe focus from the input element
     */
    blurInput() {
        const p = this._p;

        if (p.input)
            p.input.blur();

        return this;
    }

    /**
     * Removes all selected items
     */
    clear() {
        if (!this._performClearWithEvent(true))
            return this;

        if (this[DestroyedSymbol]) return this; // destroyed by event handler

        return this;
    }

    /**
     * Returns a single value or an array of selected values - depending on `multi` prop
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
     * @param value - if `multi`, then an array of values to select, otherwise - a single value to select
     */
    setValue(value: any|any[]): this {
        const p = this._p;
        if (p.multi)
            return this.setSelectedValues(Array.isArray(value) ? value : value !== undefined ? [value] : []);
        else
            return this.setSelectedValues(value !== undefined ? [value] : []);
    }

    /**
     * Returns an array of selected values
     */
    getSelectedValues() {
        const p = this._p;
        return p.selectedValues.slice(0);
    }

    /**
     * Selects the specified values
     */
    setSelectedValues(values: any[]): this {
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

            let item = this._getItemByValue(value);
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
     */
    getSelectedValueCount() {
        const p = this._p;
        return p.selectedValues.length;
    }

    /**
     * Returns an array of selected items
     */
    getSelectedItems() {
        const p = this._p;
        return p.selectedItems.slice(0);
    }

    /**
     * Sets the specified items to "checked" mode.
     * An array of items is passed, not values, because we need to keep track if items,
     * and if we already have the array of items then this spares the process of searching for the items by values.
     */
    setSelectedItems(items: ItemBase[]): this {
        this._setSelectedItems(items);
        return this;
    }

    openList() {
        const p = this._p;

        if (p.dropList.isVisible())
            return this;

        if (p.isLoadingMode && p.items.length === 0)
            return this;

        this._trigger('open:before', { list: p.dropList });

        if (document.activeElement !== p.input)
            p.lastActiveElement = document.activeElement === document.body ? null : getFocusState(document.activeElement);

        // Propagate direction to droplist
        p.dropList.setDirection(getComputedStyle(p.el).direction as 'ltr' | 'rtl');

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

    closeList() {
        const p = this._p;

        if (this[DestroyedSymbol])
            return this;

        if (!p.dropList.isVisible())
            return this;

        p.dropList.hide();

        if (p.lastActiveElement) {
            if (!p.multi && !p.searchable)
                restoreFocusState(p.lastActiveElement);
            p.lastActiveElement = null;
        }

        return this;
    }

    toggleList(open?: boolean): this {
        const p = this._p;

        let shouldOpen = open === undefined ? !p.dropList.isVisible() : !!open;

        if (shouldOpen)
            return this.openList();
        else return this.closeList();
    }

    isListOpen() {
        return !!this._p.dropListVisible;
    }

    toggleLoading(on?: boolean): this {
        return this.setIsLoadingMode(on === undefined ? !this.getIsLoadingMode() : !!on);
    }

    setIsLoadingMode(isLoadingMode?: boolean): this {
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

    getIsLoadingMode() {
        return this._p.isLoadingMode;
    }

    /**
     * Sets whether to close the list when loading mode is enabled
     */
    setCloseListWhenLoading(closeListWhenLoading: boolean): this {
        this._p.closeListWhenLoading = closeListWhenLoading;
        return this;
    }

    getCloseListWhenLoading() {
        return this._p.closeListWhenLoading;
    }

    /**
     * Sets when to clear the input field
     */
    setClearInputWhen(clearInputWhen: string[]): this {
        this._p.clearInputWhen = Array.isArray(clearInputWhen) ? clearInputWhen.slice(0) : [];
        return this;
    }

    /**
     * Retrieves the settings for when to clear the input field
     */
    getClearInputWhen() {
        return this._p.clearInputWhen;
    }

    /**
     * Sets the appropriate direction for the selectbox
     */
    setDirection(direction: 'ltr' | 'rtl' | 'auto'): this {
        const p = this._p;
        p.direction = direction === 'ltr' ? 'ltr' : direction === 'rtl' ? 'rtl' : 'auto';
        this._syncBaseClasses();
        return this;
    }

    /**
     * Gets the supplied direction for the selectbox
     */
    getDirection() {
        const p = this._p;
        return p.direction;
    }

    /**
     * Can be called in case that the selectbox was attached to the dom late and has a weird size.
     */
    refreshSize() {
        this._resizeInput();
        return this;
    }

    /**
     * Register an event handler
     */
    on(event: string | '*', handler: (value: any) => void): this {
        this._p.mitt.on(event, handler);
        return this;
    }

    /**
     * Register a one time event handler
     */
    once(event: string | '*', handler: (value: any) => void): this {
        let wrapped = (value: any) => {
            this._p.mitt.off(event, wrapped);
            handler(value);
        };
        this._p.mitt.on(event, wrapped);
        return this;
    }

    /**
     * Remove an `handler` for `event`, all events for `event`, or all events completely.
     */
    off(event?: string | '*', handler?: (value: any) => void): this {
        if (!event && !event) {
            this._p.mitt.all.clear();
        } else {
            this._p.mitt.off(event, handler);
        }
        return this;
    }

    /**
     * Emit an event
     */
    emit(event: string, value?: any): this {
        this._p.mitt.emit(event, value);
        return this;
    }

    /**
     * Prepare the mapping between values and items.
     * This reduces search time greatly (i.e when checking items), especially when Vue proxies are in place.
     * @private
     * @internal
     */
    _refreshItemByValueMap() {
        const p = this._p;

        const itemByValueMap = p.itemByValueMap = new Map();
        const valueProp = p.valueProp;
        for (let item of p.items) {
            itemByValueMap.set(item[valueProp], item);
        }

        p.subitemByValueMap = null;
    }

    /**
     * @private
     * @internal
     */
    _getItemByValue(value: any): ItemBase | undefined {
        const p = this._p;
        let item = p.itemByValueMap.get(value);
        if (item !== undefined)
            return item;

        if (!p.subitemByValueMap)
            this._refreshSubitemByValueMap();

        return p.subitemByValueMap.get(value);
    }

    /** @private */
    /** @internal */
    _refreshSubitemByValueMap() {
        const p = this._p;
        const subitemByValueMap = p.subitemByValueMap = new Map();
        this._addSubitemsToValueMap(p.items, subitemByValueMap, p.valueProp);
    }

    /**
     * @private
     * @internal
     */
    _addSubitemsToValueMap(items: ItemBase[], itemByValueMap: Map<any, ItemBase>, valueProp: string) {
        for (let item of items) {
            if (!item._subitems?.length)
                continue;

            for (let subitem of item._subitems) {
                if (!itemByValueMap.has(subitem[valueProp]))
                    itemByValueMap.set(subitem[valueProp], subitem);
            }

            this._addSubitemsToValueMap(item._subitems, itemByValueMap, valueProp);
        }
    }

    /** @private */
    /** @internal */
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
                    readOnly: !(p.searchable || p.multi) || !!p.readOnly,
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
                    .add(p.list, 'click', (evt: any) => {
                        if (!closestUntil(evt.target, `.${p.baseClassName}__item_remove`, evt.currentTarget))
                            return;

                        if (p.disabled || p.readOnly) return;

                        this._removeMultiItemFromEvent(
                            /**@type Element*/
                            closestUntil(evt.target, `.${p.baseClassName}__item`, evt.currentTarget),
                            evt);
                    })
                    .add(p.list, 'keydown', (/**KeyboardEvent*/evt: any) => {
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
                p.el.classList.add(`${p.baseClassName}__has_open_indicator`);
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
     * @internal
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
    /** @internal */
    _setupDropdownMenu() {
        const p = this._p, valueProp = p.valueProp;

        if (p.dropList) {
            p.dropList.destroy();
            delete p.dropList;
            p.itemsChanged = true;
            p.selectionChanged = true;
            p.resortBySelectionNeeded = true;
        }

        const preventDropListMouseDownBlur = (event: any) => {
            const li = closestUntil(event.target, 'li', event.currentTarget);
            if (!li) return;

            event.preventDefault();
        };
        const dropList = p.dropList = new DropList({
            virtualMinItems: 10,

            searchable: false,
            ...p.listOptions,

            multi: p.multi,
            singleSelectedValue: !p.multi ? this.getValue() : undefined,
            capturesFocus: false,

            labelProp: p.labelProp,
            valueProp: p.valueProp,

            noResultsText: p.noResultsText,
            filterThrottleWindow: p.filterThrottleWindow,
            filterOnEmptyTerm: p.filterOnEmptyTerm,
            filterGroups: p.treatGroupSelectionAsItems,
            filterEmptyGroups: !p.treatGroupSelectionAsItems,
            filterFn: p.actualFilterFn,

            // `listOptions.onError`, if explicitly set, takes precedence over the SelectBox-level `onError`.
            onError: p.listOptions?.onError ?? p.onError,

            positionOptionsProvider: () => this._getDropListPositionOptions(),

            on: (name: any, event: any) => {
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

                        let parent: any = p.el.parentNode;
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

                        p.selectionChanged = true;
                        p.resortBySelectionNeeded = true;

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

                    case 'select':
                    case 'subitems:select': {
                        if (p.multi) return;

                        const item = event.item;
                        const value = event.value;

                        if (!this._performSelectWithEvent(item, value))
                            return;

                        if (this[DestroyedSymbol]) return; // destroyed by event handler

                        this.closeList();

                        if ((p.blurOnSingleSelection === 'touch' && hasTouchCapability ||
                                p.blurOnSingleSelection !== 'touch' && p.blurOnSingleSelection) &&
                            p.input && document.activeElement === p.input) {
                            p.input.blur();
                        }
                    }
                        break;

                    case 'show_subitems':
                        p.sink.add(event.droplist.el, 'mousedown.subitems', preventDropListMouseDownBlur);
                        break;

                    case 'hide_subitems':
                        p.sink.remove(event.droplist.el, '.subitems');
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

        p.sink.add(dropList.el, 'mousedown', preventDropListMouseDownBlur);

        this._registerDropdownEvents();
    }

    /** @internal */
    _handleOnBlur() {
        const p = this._p;

        setTimeout(() => {
            if (this[DestroyedSymbol]) return; // destroyed by event handler
            if (p.disabled || p.readOnly) return;

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

    /** @internal */
    _unregisterDropdownEvents() {
        const p = this._p;

        p.sink.remove(null, '.dropdown');
    }

    /** @internal */
    _registerDropdownEvents() {
        const p = this._p;

        this._unregisterDropdownEvents();

        const dropList = p.dropList;
        if (!dropList) return;

        let avoidToggleFromClick = false,
            currentTouchId: any = null;

        const keyEventsTarget = p.multi || p.searchable ? p.input : p.el;

        p.sink
            .add(keyEventsTarget, 'keydown.dropdown', (evt: any) => {
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
                        if (dropList.isVisible()) {
                            dropList._keydownFreeType(evt, false);
                        } else if (p.allowTypeToSelect) {
                            dropList._keydownFreeType(evt, true);
                        } else {
                            this.openList();
                            setTimeout(() => {
                                if (this[DestroyedSymbol]) return; // destroyed by event handler
                                dropList._keydownFreeType(evt, false);
                            });
                        }
                        break;
                }

                if (!suppressEnterSpaceToggle) {
                    if (evt.key === VALUE_ENTER || (
                        evt.key === VALUE_SPACE &&
                        p.lastKeyAllowsNonTypeKeys &&
                        !p.multi &&
                        !dropList.hasFocusedItem() &&
                        !p.disabled &&
                        !p.readOnly
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
                    if (p.disabled || p.readOnly) return;

                    p.filterTerm = p.input.value.trim();
                    this._trigger('search:term', p.filterTerm);
                    p.dropList?.setSearchTerm(p.filterTerm, true);
                })
                .add(p.input, 'click.dropdown', () => {
                    if (p.disabled || p.readOnly) return;

                    if (!p.multi && p.searchable) {
                        this.openList();
                    }
                })
                .add(p.input, 'focus.dropdown', () => {
                    if (p.disabled || p.readOnly) return;

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
                if (!p.multi && !p.searchable && !avoidToggleFromClick && !p.disabled && !p.readOnly) {
                    this.toggleList();
                }
                avoidToggleFromClick = false;
            })
            .add(p.el, 'touchstart.dropdown', (evt: any) => {
                if (currentTouchId) return;
                currentTouchId = evt.changedTouches[0].identifier;

                if (this.isDisabled() || this.isReadOnly())
                    return;

                if (closestUntil(evt.target, `.${p.baseClassName}__item,.${p.baseClassName}__clear`, p.el))
                    return;

                let onTouchCancel = () => {
                    currentTouchId = null;
                    p.sink.remove(p.el, '.dropdown_touchextra');
                };

                (p.input || p.el).focus();

                p.sink
                    .add(p.el, 'touchend.dropdown_touchextra', (tevt: any) => {
                        let touch = Array.prototype.find.call(evt.changedTouches,
                            touch => touch.identifier === currentTouchId);
                        if (!touch) return onTouchCancel();

                        tevt.preventDefault();
                        onTouchCancel();
                    })
                    .add(p.el, 'touchmove.dropdown_touchextra', (tevt: any) => {
                        tevt.preventDefault();
                    })
                    .add(p.el, 'touchcancel.dropdown_touchextra', onTouchCancel);
            });
    }

    /** @internal */
    _performSelectWithEvent(item: any, value: any): boolean {
        let cancellable = { value: value, item: item, cancel: false };
        this._trigger('select:before', cancellable);

        if (cancellable.cancel)
            return false;

        if (this[DestroyedSymbol]) return false; // destroyed by event handler

        this._setSelectedItems([item]);
        this._trigger('select', { value: value, item: item });

        return true;
    }

    /** @internal */
    _performClearWithEvent(clearInput = false): boolean {
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

    /** @internal */
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

    /** @internal */
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
    /** @internal */
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
                const singleValue = this.getValue();
                const singleItemIndex = p.dropList.itemIndexByValue(singleValue);

                p.dropList
                    .setFocusedItemAtIndex(singleItemIndex)
                    .setSingleSelectedItemByValue(singleValue);

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
    /** @internal */
    _setSelectedItems(items: ItemBase[]) {
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
    /** @internal */
    _scheduleSync(mode: string, data?: any) {
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
    /** @internal */
    _performSync(queue: any[]) {
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

                        let idx = p.multiItemEls.findIndex(x => (x as any)[ItemSymbol][valueProp] === value);
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
                        if ((itemEl as any)?.[ItemSymbol]?.[p.valueProp] === RestMultiItemsSymbol) {
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
    /** @internal */
    _cleanupSingleWrapper() {
        const p = this._p;

        if (!p.singleWrapper) return;

        if (p.unrenderSingleItem && p.singleWrapper.childNodes.length > 0) {
            try {
                p.unrenderSingleItem((p.singleWrapper as any)[ItemSymbol], p.singleWrapper);
            } catch (err) {
                reportError(p.onError, err, { source: 'unrenderSingleItem', item: (p.singleWrapper as any)[ItemSymbol], el: p.singleWrapper });
            }
        }

        delete (p.singleWrapper as any)[ItemSymbol];
        p.singleWrapper.innerHTML = '';
    }

    /**
     * @private
     * @internal
     */
    _removeMultiItemElementByIndex(index: number) {
        const p = this._p, multiItemEls = p.multiItemEls;

        if (multiItemEls.length > index) {
            const itemEl = multiItemEls[index];
            const item = (itemEl as any)[ItemSymbol];

            let unrender = item?.[p.valueProp] === RestMultiItemsSymbol
                ? p.unrenderRestMultiItem ?? p.unrenderMultiItem
                : p.unrenderMultiItem;

            if (unrender && itemEl.childNodes.length > 0) {
                try {
                    unrender(item, itemEl);
                } catch (err) {
                    reportError(p.onError, err, {
                        source: item?.[p.valueProp] === RestMultiItemsSymbol ? 'unrenderRestMultiItem' : 'unrenderMultiItem',
                        item,
                        el: itemEl,
                    });
                }
            }
            remove(itemEl);

            // fastpath
            if (index === multiItemEls.length - 1) multiItemEls.pop();
            else multiItemEls.splice(index, 1);
        }
    }

    /**
     * @private
     * @internal
     */
    _renderSingleItemContent(item: any) {
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
     * @private
     * @internal
     */
    _renderMultiItemContent(item: any, itemEl: HTMLElement) {
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
     * @returns {boolean} true if rendered, false if not
     * @private
     * @internal
     */
    _addMultiItemElement(item: any): boolean {
        const p = this._p;
        const itemEl = this._renderMultiItem(item);
        if (!itemEl) return false;

        before(p.inputWrapper, itemEl);
        p.multiItemEls.push(itemEl);

        return true;
    }

    /** @private */
    /** @internal */
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
    /** @internal */
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
                    if (this.isDisabled() || this.isReadOnly()) return;
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
    /** @internal */
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
    /** @internal */
    _syncSingleItem() {
        const p = this._p;

        if (p.singleWrapper)
            this._cleanupSingleWrapper();

        const items = p.selectedItems;

        if (items.length > 0) {
            this._renderSingleItemContent(items[0]);
            (p.singleWrapper as any)[ItemSymbol] = items[0];
        }
    }

    /**
     * Syncs render state, selected items, and position
     * @internal
     */
    _syncFull(fullItemsRender: boolean, updateListItems: boolean) {
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
            if (p.input) p.input.readOnly = p.readOnly;
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
     * @private
     * @internal
     */
    _trigger(event: string, data?: any) {
        const p = this._p;
        if (p === undefined)
            return;
        if (p.on)
            p.on(event, ...(data === undefined ? [] : [data]));
        p.mitt.emit(event, data);
    }

    /**
     * Render a multi item
     * @private
     * @internal
     */
    _renderMultiItem(item: any): HTMLElement | null {
        const p = this._p;

        const labelProp = p.labelProp,
            multiItemLabelProp = p.multiItemLabelProp;
        const label = item[multiItemLabelProp] ?? item[labelProp];
        if (label === false)
            return null;

        const elRemove = createElement('span', {
            class: `${p.baseClassName}__item_remove`,
            role: 'presentation',
        });

        const itemEl = createElement('li',
            {
                class: `${p.baseClassName}__item`,
                tabindex: '0',
                title: label,
            },
        );

        if (p.multiItemRemovePosition === 'before') {
            itemEl.appendChild(elRemove);
        }

        this._renderMultiItemContent(item, itemEl);

        if (p.multiItemRemovePosition === 'after') {
            itemEl.appendChild(elRemove);
        }

        (itemEl as any)[ItemSymbol] = item;

        return itemEl;
    }

    /**
     * Removes a specific multi item by user event
     * @private
     * @internal
     */
    _removeMultiItemFromEvent(itemEl: any, originatingEvent: any): this {
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

        const item = (itemEl as any)[ItemSymbol], value = item[p.valueProp];

        if (item !== undefined) {
            if (value === RestMultiItemsSymbol) {
                let items = (p.treatGroupSelectionAsItems ? p.selectedItems : p.selectedItems.filter(x => !x._group))
                    .slice(p.maxMultiItems);
                let itemsToRemove = [];

                for (let item of items) {
                    let removeselEvt = { value: item[p.valueProp], item: item, cancel: false };
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
                            idx = p.selectedValues.indexOf(item[p.valueProp]);
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
     * @private
     * @internal
     */
    _removeMultiItem(item: any, populate = false) {
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
        idx = p.multiItemEls.findIndex(x => (x as any)[ItemSymbol] === item);
        if (idx === -1)
            idx = p.multiItemEls.findIndex(x => (x as any)[ItemSymbol][valueProp] === value);
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
     * @private
     * @internal
     */
    _setInputText(value: any) {
        const p = this._p;

        p.input.value = value == null ? '' : String(value);

        p.filterTerm = '';
        this._trigger('search:term', p.filterTerm);
        p.dropList?.setSearchTerm('', true);
    }

    /**
     * Update input size to current state
     * @private
     * @internal
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
            const minWidth = (parseFloat((computedStyle as any)['font-size']) || 0) * 0.75 + paddingTotal;
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
     * @private
     * @internal
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
     * @private
     * @internal
     */
    _handleInputKeydown(event: any) {
        const p = this._p;

        const target = (/**@type HTMLInputElement*/event.target);

        if (event.key === VALUE_BACK_SPACE && event.ctrlKey && target.value.length === 0) {
            this.clear();

            event.preventDefault();
        } else if (event.key === VALUE_BACK_SPACE && target.value.length === 0) {
            const itemEl = p.multiItemEls[p.multiItemEls.length - 1];
            if (!itemEl)
                return;

            const item = (itemEl as any)[ItemSymbol], value = item[p.valueProp];
            if (value === undefined)
                return;

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
     * @private
     * @internal
     */
    _handleMultiKeydown(event: any) {
        const p = this._p;

        if (p.disabled || p.readOnly) return;

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
     * @private
     * @internal
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
    /** @internal */
    _startTrackingPresence() {
        const p = this._p;

        this._stopTrackingPresence();

        p.presenceInt = setInterval(() => {
            if (getRootNode(p.el) !== document)
                this.closeList();
        }, 200);
    }

    /** @private */
    /** @internal */
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
     * @internal
     */
    _sortItems(items: ItemBase[], sort: boolean, sortCheckedFirst: boolean, splitCheckedGroups: boolean): ItemBase[] {
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

        let group: any[] = [], stickyGroup: any = null;
        let groups = [group];
        let inGroup = false;
        const selectedValuesSet = new Set(p.selectedValues);
        let item, i, len;

        // Split to groups
        for (i = 0, len = items.length; i < len; i++) {
            item = items[i];

            if ((item._group && group.length) || (inGroup && !item._group && !item._child)) {
                inGroup = !!item._group;
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
            groups.sort((a: any, b: any) => {
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
