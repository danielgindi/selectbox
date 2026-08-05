import escapeRegex from './utils/escapeRegex';
import {
    closestUntil,
    createElement,
} from '@danielgindi/dom-utils/lib/Dom';
import {
    remove,
    toggleClass,
} from '@danielgindi/dom-utils/lib/DomCompat';
import {
    setCssProps,
    getElementHeight,
    getElementWidth,
    setElementHeight,
    setElementWidth, getElementOffset, anchoredPosition,
    parseTransition,
} from '@danielgindi/dom-utils/lib/Css';
import DomEventsSink from '@danielgindi/dom-utils/lib/DomEventsSink';
import VirtualListHelper from '@danielgindi/virtual-list-helper';
import {
    VALUE_BACK_SPACE,
    VALUE_DOWN,
    VALUE_END,
    VALUE_ENTER, VALUE_ESCAPE,
    VALUE_HOME, VALUE_LEFT,
    VALUE_PAGE_DOWN,
    VALUE_PAGE_UP, VALUE_RIGHT,
    VALUE_SPACE,
    VALUE_UP,
} from 'keycode-js';
import throttle from './utils/throttle';
import type { Throttled } from './utils/throttle.js';
import type { DropListOptions, ItemBase, PositionOptions } from './types.js';
import reportError from './utils/reportError';
import mitt, { type Emitter } from 'mitt';

const ItemSymbol = Symbol('item');
const DestroyedSymbol = Symbol('destroyed');
const GhostSymbol = Symbol('ghost');
const NoResultsItemSymbol = Symbol('no_results_items');

const hasOwnProperty = Object.prototype.hasOwnProperty;

/**
 * The internal representation of an item, as kept in `_p.items` / `_p.filteredItems`.
 * Wraps the original consumer-supplied item (stored under `[ItemSymbol]`).
 * @internal
 */
interface InternalItem {
    value?: any;
    label?: string;
    _group?: boolean;
    _child?: boolean;
    _level?: number;
    _nocheck?: boolean;
    _nointeraction?: boolean;
    _checked?: boolean;
    _subitems?: ItemBase[];
    [ItemSymbol]: any;
}

/** @internal */
interface SubDropListState {
    item: InternalItem;
    itemElement: HTMLElement | null;
    droplist: DropList;
    showOptions: PositionOptions;
}

/**
 * The shape of `DropList#_p`, the internal state bag.
 *
 * Fields are required when the constructor guarantees they hold a real
 * value (possibly `null`) for the entire lifetime of the instance.
 * Fields stay optional (`?`) when their presence is genuinely conditional
 * on runtime state (e.g. only exists while a feature is toggled on, or is
 * `delete`d and re-created over the instance's lifetime).
 * @internal
 */
interface DropListState {
    ownsEl: boolean;
    elOriginalDisplay: string;

    baseClassName: string;
    additionalClasses?: string | string[];
    direction: 'ltr' | 'rtl' | 'auto';

    autoItemBlur: boolean;
    autoItemBlurDelay: number;
    capturesFocus: boolean;
    multi: boolean;
    singleSelectedValue?: any;
    keyDownHandler?: DropListOptions['keyDownHandler'];
    autoCheckGroupChildren: boolean;
    useExactTargetWidth: boolean;
    constrainToWindow: boolean;
    autoFlipDirection: boolean;
    estimatedItemHeight?: number;
    estimateWidth: boolean;
    virtualMinItems: number;
    labelProp: string;
    valueProp: string;
    renderItem?: DropListOptions['renderItem'];
    unrenderItem?: DropListOptions['unrenderItem'];
    renderNoResultsItem?: DropListOptions['renderNoResultsItem'];
    unrenderNoResultsItem?: DropListOptions['unrenderNoResultsItem'];
    on: DropListOptions['on'] | null;
    positionOptionsProvider: DropListOptions['positionOptionsProvider'] | null;
    /** no default in `DefaultOptions`; falls back to `console.error`/`console.warn` when unset */
    onError?: DropListOptions['onError'];

    searchable: boolean;
    searchPlaceholder: string;
    isHeaderVisible: boolean;
    isFooterVisible: boolean;

    silenceEvents: boolean;
    mitt: Emitter<Record<string, any>>;

    filterThrottleWindow: number;
    filterOnEmptyTerm: boolean;
    filterGroups: boolean;
    filterEmptyGroups: boolean;
    filterFn?: DropListOptions['filterFn'];
    filteredItems: InternalItem[] | null;
    filterTerm: string;
    needsRefilter: boolean;
    /** always assigned by the end of the constructor (via `setFilterThrottleWindow`) */
    throttledRefilterItems: Throttled<() => void> | null;

    focusItemIndex: number;
    focusItemEl: HTMLElement | null;

    sink: any;

    el: HTMLElement;
    menuEl: HTMLElement;
    headerEl: HTMLElement;
    footerEl: HTMLElement;
    /** only exists once `setSearchable(true)` has been called */
    searchInput?: HTMLInputElement | null;

    items: InternalItem[];
    groupCount: number;
    mouseHandled: boolean;

    virtualListHelper: any;

    hasNoResultsItem: boolean;
    noResultsText: string;

    /** unset until the first `relayout()` */
    currentDirection?: string;
    /** `delete`d on hide, so must stay optional */
    lastPositionOptions?: PositionOptions | null;
    /** `delete`d on hide, so must stay optional */
    lastPositionTarget?: Element;

    visible: boolean;
    hiding: boolean;

    singleSelectedItemEl: HTMLElement | null;

    onDocumentMouseDown: ((event: MouseEvent) => void) | null;

    blurTimer?: ReturnType<typeof setTimeout>;
    filterTimer?: ReturnType<typeof setTimeout>;
    /** `delete`d once the freetype buffer expires, so must stay optional */
    previousFilter?: string;
    lastKeyWasChar: boolean;

    currentSubDropList: SubDropListState | null;

    lastMeasureItemCount?: number;
    lastMeasureItemWidth?: number;
    lastMeasureLongestLabel?: number;
    lastMeasureLongestLabelText?: string;

    _isFocusingItem: boolean;
}

export const DefaultOptions: DropListOptions = {
    baseClassName: 'droplist',

    autoItemBlur: true,
    autoItemBlurDelay: 300,
    capturesFocus: true,
    multi: false,
    singleSelectedValue: undefined,
    keyDownHandler: null,
    autoCheckGroupChildren: true,
    useExactTargetWidth: false,

    constrainToWindow: true,
    autoFlipDirection: true,

    estimateWidth: false,
    virtualMinItems: 100,

    labelProp: 'label',
    valueProp: 'value',

    on: null,

    isHeaderVisible: false,
    isFooterVisible: false,
    searchable: false,
    searchPlaceholder: '',
    noResultsText: 'No matching results',
    filterThrottleWindow: 300,
    filterOnEmptyTerm: false,
    filterGroups: false,
    filterEmptyGroups: false,
};

/*
Emits the following events:
---------------------------

'itemfocus' {value, item, event?, el}: item gained focus.
'itemblur' {value, item}: item lost focus.
'select' {value, item, event?, el}: item was selected (in single mode).
'show:before': the drop list will show.
'show': the drop list has been shown.
'hide:before': the drop list will hide.
'hide': the drop list was hidden.
'hide:after': emitted after the hide css transition has ended, or immediately after 'hide'.
'check' {value, item, checked: boolean, isGroup: boolean, isCheckingGroup: boolean}: item was selected (in multi mode).
'groupcheck' {value, item, affectedCount: number}: item was selected (in multi mode).
'blur' {event}: element lost focus
'show_subitems {value, item, el, droplist: DropList}': subitems dropdown will show.
'hide_subitems {value, item, el, droplist: DropList}': subitems dropdown did hide.
'subitems:select' {value, item, event?, el}: item was selected (in single mode).
'subitems:blur' {event}: subitems element lost focus
 */

// noinspection JSUnusedGlobalSymbols
class DropList {
    /** @internal */
    _p: DropListState | null;
    /** @internal */
    [DestroyedSymbol]?: boolean;
    /** @internal */
    _mouseHandled?: boolean;
    /** @internal */
    silenceEvents?: boolean;

    /**
     * @param {DropList.Options} options
     */
    constructor(options: DropListOptions) {
        const o = { ...DefaultOptions };

        for (let [key, value] of Object.entries(/**@type Object*/options))
            if (value !== undefined)
                (o as any)[key] = value;

        const p = this._p = {
            ownsEl: true,
            elOriginalDisplay: '',

            baseClassName: o.baseClassName,
            additionalClasses: o.additionalClasses,
            direction: o.direction === 'ltr' ? 'ltr' : o.direction === 'rtl' ? 'rtl' : 'auto',

            autoItemBlur: o.autoItemBlur,
            autoItemBlurDelay: o.autoItemBlurDelay,
            capturesFocus: o.capturesFocus,
            multi: o.multi,
            singleSelectedValue: o.singleSelectedValue,
            keyDownHandler: o.keyDownHandler,
            autoCheckGroupChildren: o.autoCheckGroupChildren,
            useExactTargetWidth: o.useExactTargetWidth,
            constrainToWindow: o.constrainToWindow,
            autoFlipDirection: o.autoFlipDirection,
            estimatedItemHeight: o.estimatedItemHeight,
            estimateWidth: o.estimateWidth,
            virtualMinItems: o.virtualMinItems,
            labelProp: o.labelProp,
            valueProp: o.valueProp,
            renderItem: o.renderItem,
            unrenderItem: o.unrenderItem,
            renderNoResultsItem: o.renderNoResultsItem,
            unrenderNoResultsItem: o.unrenderNoResultsItem,
            on: o.on || null,
            positionOptionsProvider: o.positionOptionsProvider ?? null,
            onError: o.onError,

            searchable: o.searchable,
            searchPlaceholder: o.searchPlaceholder,
            isHeaderVisible: o.isHeaderVisible,
            isFooterVisible: o.isFooterVisible,

            silenceEvents: true,
            mitt: mitt<Record<string, any>>(),

            filterThrottleWindow: o.filterThrottleWindow,
            filterOnEmptyTerm: o.filterOnEmptyTerm,
            filterGroups: o.filterGroups,
            filterEmptyGroups: o.filterEmptyGroups,
            filterFn: o.filterFn,
            filteredItems: null,
            filterTerm: '',
            needsRefilter: false,
            throttledRefilterItems: null,

            focusItemIndex: -1,
            focusItemEl: null,

            sink: new DomEventsSink(),

            visible: false,
            hiding: false,

            singleSelectedItemEl: null,
            onDocumentMouseDown: null,

            lastKeyWasChar: false,

            currentSubDropList: null,

            _isFocusingItem: false,
        } as DropListState;

        const baseClass = p.baseClassName + '_wrapper';

        let classes = [baseClass];

        if (p.additionalClasses) {
            classes = classes.concat((p.additionalClasses + '').split(' ').filter(x => x));
        }

        const initialCss = {
            // make initial position not interfere with layout so it can be correctly calculated
            top: '-9999px',
        };

        let wrapperEl: HTMLElement = o.el as HTMLElement;

        if (wrapperEl instanceof Element) {
            p.elOriginalDisplay = wrapperEl.style.display || '';
            wrapperEl.classList.add(...classes);
            setCssProps(/**@type ElementCSSInlineStyle*/wrapperEl, initialCss);
            p.ownsEl = false;
        } else {
            wrapperEl = createElement('div', {
                class: classes.join(' '),
                css: initialCss,
            });
        }

        p.el = wrapperEl;

        let menuEl = createElement('ul');
        menuEl.role = 'menu';
        p.menuEl = menuEl;

        p.headerEl = createElement('div', {
            class: p.baseClassName + '_header',
        });

        p.footerEl = createElement('div', {
            class: p.baseClassName + '_footer',
        });

        if (o.searchable) {
            this.setSearchable(true);
        }

        if (o.isHeaderVisible)
            this.setHeaderVisible(o.isHeaderVisible);

        wrapperEl.appendChild(menuEl);

        if (o.isFooterVisible)
            this.setFooterVisible(o.isFooterVisible);

        p.items = [];
        p.groupCount = 0; // This will keep state of how many `group` items we have
        p.mouseHandled = false;

        p.virtualListHelper = new VirtualListHelper({
            list: p.menuEl,
            virtual: true,
            buffer: 5,
            estimatedItemHeight: o.estimatedItemHeight || 20,
            itemElementCreatorFn: () => {
                return createElement('li',
                    {
                        role: 'menuitem',
                        tabIndex: p.capturesFocus ? -1 : null,
                    },
                );
            },
            onItemRender: (itemEl: HTMLElement, index: any) => {
                let item;

                if ((/**@type any*/index) === GhostSymbol) {
                    item = {
                        label: p.lastMeasureLongestLabelText,
                        value: 'Measure',

                        [ItemSymbol]: {
                            [p.labelProp]: p.lastMeasureLongestLabelText,
                            [p.valueProp]: 'Measure',
                        },
                    };
                    itemEl.setAttribute('aria-hidden', 'true');
                } else {
                    const items = p.filteredItems ?? p.items;
                    if (items.length === 0 && p.noResultsText) {
                        item = {
                            value: NoResultsItemSymbol,
                            label: p.noResultsText,
                            _nointeraction: true,
                            _nocheck: true,

                            [ItemSymbol]: NoResultsItemSymbol,
                        };
                    } else {
                        item = items[index];
                    }
                }

                if (!item) {
                    reportError(p.onError, `onItemRender called for (${index}) which has no item`,
                        { source: 'renderItem', level: 'warn', index });
                }

                itemEl.className = `${p.baseClassName}__item`;

                const classList = itemEl.classList;

                if (item) {
                    if (p.multi) {
                        if (item._nocheck) {
                            classList.add(`${p.baseClassName}__item_multi_nocheck`);
                        } else {
                            classList.add(`${p.baseClassName}__item_multi`);

                            if (item._checked) {
                                classList.add(`${p.baseClassName}__item_checked`);
                            }
                        }
                    } else {
                        classList.add(`${p.baseClassName}__item_single`);

                        if (p.singleSelectedValue !== undefined && item.value === p.singleSelectedValue) {
                            classList.add(`${p.baseClassName}__item_selected`);
                            p.singleSelectedItemEl = itemEl;
                        } else if (p.singleSelectedItemEl === itemEl) {
                            p.singleSelectedItemEl = null;
                        }
                    }

                    if (item._group)
                        classList.add(`${p.baseClassName}__item_group`);

                    if (item._child)
                        classList.add(`${p.baseClassName}__item_child`);

                    if (item._nointeraction)
                        classList.add(`${p.baseClassName}__item_nointeraction`);
                }

                if (p.focusItemIndex === index) {
                    p.focusItemEl = itemEl;
                    classList.add(`${p.baseClassName}__item_focus`);
                }

                this._renderItemContent(item, itemEl);

                (itemEl as any)[ItemSymbol] = item;
            },
        });

        this._setupUnrenderFunction();

        if (p.capturesFocus) {
            wrapperEl.tabIndex = 0;
        }

        this.setFilterThrottleWindow(o.filterThrottleWindow);
        this.setNoResultsText(o.noResultsText);

        this._hookMouseEvents();
        this._hookTouchEvents();
        this._hookFocusEvents();
        this._hookKeyEvents();
        this._hookSearchEvents();

        this.silenceEvents = false;
    }

    destroy() {
        if (this[DestroyedSymbol])
            return;
        this[DestroyedSymbol] = true;

        const p = this._p;

        clearTimeout(p.blurTimer);
        clearTimeout(p.filterTimer);

        p.sink.remove();
        p.virtualListHelper.destroy();

        if (p.el?.parentNode) {
            remove(p.el);
        }

        if (p.currentSubDropList) {
            p.currentSubDropList?.droplist?.destroy();
            p.currentSubDropList = null;
        }

        if (p.throttledRefilterItems)
            p.throttledRefilterItems.cancel();

        if (!p.ownsEl) {
            for (let name of Array.from(p.el.classList)) {
                if (name.startsWith(p.baseClassName)) {
                    p.el.classList.remove(name);
                }
            }
            for (let key of ['position', 'left', 'top', 'right', 'bottom', 'z-index']) {
                (p.el.style as any)[key] = '';
            }
            p.el.style.display = p.elOriginalDisplay;
        }

        if (p.lastPositionTarget) {
            p.lastPositionTarget.classList.remove(
                `has_${p.baseClassName}`,
                `has_${p.baseClassName}_above`,
                `has_${p.baseClassName}_below`);
            delete p.lastPositionTarget;
        }

        delete p.lastPositionOptions;

        this._p = null;
    }

    get el(): HTMLElement | null {
        return this._p?.el ?? null;
    }

    /**
     * Returns true if other is an inclusive descendant of node, and false otherwise.
     * @param {Node} other
     * @param {boolean} [considerSubmenus=true]
     * @returns {boolean}
     */
    elContains(other: any, considerSubmenus = true): boolean {
        if (this.el.contains(other))
            return true;

        if (considerSubmenus && this._p.currentSubDropList?.droplist?.elContains(other))
            return true;

        return false;
    }

    /**
     * @param {string|string[]} classes
     * @returns {DropList}
     */
    setAdditionalClasses(classes: string | string[]): this {
        const p = this._p;
        p.additionalClasses = classes;
        this._syncBaseClasses();
        return this;
    }

    /**
     * Sets the appropriate direction for the droplist
     * @param {'ltr'|'rtl'|'auto'} direction
     * @return {DropList}
     */
    setDirection(direction: 'ltr' | 'rtl' | 'auto'): this {
        const p = this._p;
        p.direction = direction === 'ltr' ? 'ltr' : direction === 'rtl' ? 'rtl' : 'auto';
        this._syncBaseClasses();
        return this;
    }

    /**
     * Gets the supplied direction for the droplist
     * @return {'ltr'|'rtl'|'auto'}
     */
    getDirection(): 'ltr' | 'rtl' | 'auto' {
        const p = this._p;
        return p.direction;
    }

    /**
     * @param {string} prop
     * @returns {DropList}
     */
    setLabelProp(prop: string): this {
        const p = this._p;
        p.labelProp = prop;
        return this;
    }

    /**
     *
     * @property {function(item: DropList.ItemBase, itemEl: Element):(*|false)} [fn] Function to call when rendering an item element
     * @returns {DropList}
     */
    setRenderItem(fn: DropListOptions['renderItem']): this {
        const p = this._p;
        p.renderItem = fn;
        return this;
    }

    /**
     *
     * @property {function(item: DropList.ItemBase, itemEl: Element)} [fn] Function to call when rendering an item element
     * @returns {DropList}
     */
    setUnrenderItem(fn: DropListOptions['unrenderItem']): this {
        const p = this._p;
        p.unrenderItem = fn;
        this._setupUnrenderFunction();
        return this;
    }

    /**
     * @param {(function(item: DropList.ItemBase, itemEl: Element):(*|false))|null} render
     * @param {(function(item: DropList.ItemBase, itemEl: Element))|null} unrender
     * @returns {DropList}
     */
    setRenderNoResultsItem(render: DropListOptions['renderNoResultsItem'], unrender: DropListOptions['unrenderNoResultsItem']): this {
        const p = this._p;
        p.renderNoResultsItem = render;
        p.unrenderNoResultsItem = unrender;
        this._setupUnrenderFunction();
        return this;
    }

    /**
     * @private
     * @internal
     */
    _setupUnrenderFunction() {
        const p = this._p;

        if (typeof p.unrenderItem === 'function' || typeof p.unrenderNoResultsItem === 'function') {
            const fn = p.unrenderItem;
            const fnNoResults = p.unrenderNoResultsItem;
            p.virtualListHelper.setOnItemUnrender((el: any) => {
                const item = el[ItemSymbol];
                if (item === NoResultsItemSymbol) {
                    try {
                        fnNoResults(item, el);
                    } catch (err) {
                        reportError(p.onError, err, { source: 'unrenderNoResultsItem', item, el });
                    }
                } else {
                    try {
                        fn(item[ItemSymbol], el);
                    } catch (err) {
                        reportError(p.onError, err, { source: 'unrenderItem', item: item[ItemSymbol], el });
                    }
                }
                delete el[ItemSymbol];

                if (p.focusItemEl === el)
                    p.focusItemEl = null;
            });
        } else {
            p.virtualListHelper.setOnItemUnrender((el: any) => {
                delete el[ItemSymbol];

                if (p.focusItemEl === el)
                    p.focusItemEl = null;
            });
        }

        return this;
    }

    /**
     * @param {string} prop
     * @returns {DropList}
     */
    setValueProp(prop: string): this {
        const p = this._p;
        p.valueProp = prop;
        return this;
    }

    /** @internal */
    _syncBaseClasses() {
        const p = this._p, el = p.el;

        if (!el)
            return;

        const baseClass = p.baseClassName + '_wrapper';
        let classes = [baseClass];

        if (p.direction === 'ltr' || p.direction === 'rtl')
            classes.push(`${p.baseClassName}__` + p.direction);

        if (p.additionalClasses) {
            classes = classes.concat(p.additionalClasses);
        }

        el.className = classes.join(' ');
    }

    blurFocusedItem() {
        const p = this._p;

        clearTimeout(p.blurTimer);

        if (!this.hasFocusedItem()) {
            return;
        }

        let focusItemEl = p.focusItemEl;
        if (focusItemEl) {
            focusItemEl.classList.remove(`${p.baseClassName}__item_focus`);
            p.focusItemEl = null;
        }

        const items = p.filteredItems ?? p.items;
        const item = items[p.focusItemIndex];
        p.focusItemIndex = -1;

        if (!item) {
            return;
        }

        if (p.currentSubDropList) {
            this._hideSublist();
        }

        this._trigger('itemblur', { value: item.value, item: item[ItemSymbol] ?? item });
    }

    nextPage(event: Event) {
        this._move('next_page', event);
    }

    previousPage(event: Event) {
        this._move('prev_page', event);
    }

    goToFirst(event: Event) {
        this._move('first', event);
    }

    goToLast(event: Event) {
        this._move('last', event);
    }

    toggleFocusedItem(event?: Event) {
        const p = this._p;

        if (this.hasFocusedItem() && p.multi) {
            const items = p.filteredItems ?? p.items;
            let item = items[p.focusItemIndex];
            if (!item || item._nocheck || item._nointeraction) return this;

            item._checked = !item._checked;
            if (p.focusItemEl) {
                toggleClass(p.focusItemEl, `${p.baseClassName}__item_checked`, item._checked);
            }
            this._trigger('check', {
                value: item.value,
                item: item[ItemSymbol] ?? item,
                checked: item._checked,
                isGroup: item._group,
                isCheckingGroup: false,
            });

            this._updateGroupStateForItem(item);
        }

        return this;
    }

    triggerItemSelection(item: any, event: Event): boolean {
        const p = this._p;

        p.focusItemEl = p.focusItemEl || closestUntil(event.target, 'li', p.el);
        p.focusItemIndex = p.virtualListHelper.getItemIndexFromElement(p.focusItemEl);
        if (p.focusItemIndex === undefined)
            p.focusItemIndex = -1;

        item = item ?? (p.focusItemEl as any)[ItemSymbol];
        if (item._nointeraction) {
            return false;
        }

        if (item._subitems?.length) {
            this._showSublist(item, p.focusItemEl);
            return false;
        }

        if (p.multi) {
            if (this.hasFocusedItem()) {
                this.toggleFocusedItem();
            }
        } else {
            this._setSingleSelectedItemEl(p.focusItemEl, item ? item.value : undefined);

            this._trigger('select', {
                value: item ? item.value : undefined,
                item: item[ItemSymbol] ?? item,
                event: event,
                el: p.focusItemEl,
            });
        }

        return true;
    }

    /**
     *
     * @param {DropList.Item} item The item to add. It is copied.
     * @param {number} [atIndex=-1] The index to insert at (or -1)
     * @returns {DropList}
     */
    addItem(item: ItemBase, atIndex = -1): this {
        return this.addItems([item], atIndex);
    }

    /**
     * Adds items to the menu and renders
     * @param {DropList.Item[]} itemsToAdd The items to add. These are copied.
     * @param {number} [atIndex=-1] The index to insert at (or -1)
     * @returns {DropList}
     */
    addItems(itemsToAdd: ItemBase[], atIndex = -1): this {
        const p = this._p, labelProp = p.labelProp, valueProp = p.valueProp;

        let isMulti = p.multi;
        const items = p.items;

        if (atIndex == null || atIndex < 0 || atIndex >= p.items.length) {
            atIndex = -1;
        }

        // Determine if the list is virtual or not
        this._determineVirtualMode(items.length + itemsToAdd.length);

        for (let i = 0, count = itemsToAdd.length; i < count; i++) {
            let oitem = itemsToAdd[i];
            //noinspection PointlessBooleanExpressionJS
            let item: InternalItem = {
                [ItemSymbol]: oitem,
                label: oitem[labelProp],
                value: oitem[valueProp],
                _nocheck: !!oitem._nocheck,
                _nointeraction: !!oitem._nointeraction,
                _subitems: oitem._subitems,
            };

            if (isMulti) {
                item._checked = !!oitem._checked;
            }

            if (oitem._group) {
                item._group = true;
                p.groupCount++;
            }

            if (typeof oitem._level === 'number') {
                item._level = oitem._level;
            }

            if (oitem._child) {
                // This is used for setting a child class,
                // But can be used to determine that current item is not part of above group,
                //   mainly where the groups are oddly sorted.
                item._child = true;
            }

            // Add the item to the list of them
            if (atIndex !== -1) {
                items.splice(atIndex, 0, item);
            } else {
                items.push(item);
            }

            if (atIndex !== -1) {
                atIndex++;
            }
        }

        if (!p.filteredItems) {
            let hadNoResultItem = p.hasNoResultsItem;
            p.hasNoResultsItem = p.items.length === 0 && !!p.noResultsText;
            if (p.hasNoResultsItem) {
                p.virtualListHelper
                    .setCount(1)
                    .render();
            } else {
                if (hadNoResultItem)
                    p.virtualListHelper.removeItemsAt(1, 0);

                p.virtualListHelper
                    .addItemsAt(itemsToAdd.length, atIndex === -1 ? atIndex : (atIndex - itemsToAdd.length))
                    .render();
            }
        } else {
            p.needsRefilter = true;
        }

        return this;
    }

    /**
     * Replaces all current items with the supplied items
     * @param {DropList.Item[]} items The items to set. These are copied.
     * @returns {DropList}
     */
    setItems(items: ItemBase[]): this {
        const p = this._p;

        p.items.length = 0;
        p.filteredItems = null;
        p.groupCount = 0;

        p.hasNoResultsItem = !!p.noResultsText;
        p.virtualListHelper.setCount(p.hasNoResultsItem ? 1 : 0);

        this.addItems(items);
        this.updateSublist();

        return this;
    }

    updateItemByValue(value: any, newItem: ItemBase): this {
        const p = this._p;

        // Look for the proper item
        let itemIndex = this.itemIndexByValue(value);
        if (itemIndex === -1) return this;

        let item = this.itemAtIndex(itemIndex);
        item[ItemSymbol] = newItem;

        if (hasOwnProperty.call(newItem, p.labelProp))
            item.label = newItem[p.labelProp];

        if (hasOwnProperty.call(newItem, p.valueProp))
            item.value = newItem[p.valueProp];

        if (hasOwnProperty.call(newItem, '_nocheck'))
            item._nocheck = !!newItem._nocheck;

        if (hasOwnProperty.call(newItem, '_nointeraction'))
            item._nointeraction = !!newItem._nointeraction;

        if (hasOwnProperty.call(newItem, '_subitems'))
            item._subitems = newItem._subitems;

        if (p.multi) {
            if (hasOwnProperty.call(newItem, '_checked'))
                item._checked = !!newItem._checked;
        }

        if (hasOwnProperty.call(newItem, '_group')) {
            if (!!newItem._group !== item._group) {
                if (item._group)
                    p.groupCount--;
                else p.groupCount++;

                item._group = !!newItem._group;
            }
        }

        if (hasOwnProperty.call(newItem, '_level')) {
            item._level = newItem._level;
        }

        if (hasOwnProperty.call(newItem, '_child'))
            item._child = !!newItem._child;

        let virtualItemIndex = itemIndex;
        if (p.filteredItems) {
            virtualItemIndex = p.filteredItems.indexOf(item);
            if (virtualItemIndex !== -1) {
                p.filteredItems.splice(virtualItemIndex, 1);
            }
        }

        if (virtualItemIndex !== -1 &&
            p.virtualListHelper.isItemRendered(virtualItemIndex)) {
            p.virtualListHelper
                .refreshItemAt(virtualItemIndex)
                .render();
        }

        return this;
    }

    removeItem(value: any, label?: string): this {
        const p = this._p;

        // Look for the proper item
        let itemIndex = this.itemIndexByValueOrLabel(value, label);
        if (itemIndex === -1) return this;

        let spliced = p.items.splice(itemIndex, 1);
        if (spliced[0]._group) {
            p.groupCount--;
        }

        let virtualItemIndex = itemIndex;
        if (p.filteredItems) {
            virtualItemIndex = p.filteredItems.indexOf(spliced[0]);
            if (virtualItemIndex !== -1) {
                p.filteredItems.splice(virtualItemIndex, 1);
            }
        }

        if (virtualItemIndex !== -1) {
            p.hasNoResultsItem = (p.filteredItems ?? p.items).length === 0 && !!p.noResultsText;

            if (p.hasNoResultsItem) {
                p.virtualListHelper
                    .setCount(1)
                    .render();
            } else {
                p.virtualListHelper
                    .removeItemsAt(virtualItemIndex, 1)
                    .render();
            }
        }

        return this;
    }

    removeAllItems() {
        const p = this._p;

        p.items.length = 0;
        p.filteredItems = null;
        p.groupCount = 0;

        p.hasNoResultsItem = !!p.noResultsText;

        p.virtualListHelper
            .setCount(p.hasNoResultsItem ? 1 : 0)
            .render();

        return this;
    }

    /**
     * Should only be used if the items array has been manually manipulated.
     * @return {DropList}
     */
    invalidate() {
        const p = this._p;

        p.virtualListHelper
            .invalidate()
            .render();

        return this;
    }

    itemDataByValue(value: any): any {
        const p = this._p;

        for (let i = 0, count = p.items.length; i < count; i++) {
            let item = p.items[i];
            if (item.value === value) {
                return item[ItemSymbol];
            }
        }

        return null;
    }

    itemIndexByValue(value: any): number {
        const p = this._p;

        const items = p.items;
        for (let i = 0, count = items.length; i < count; i++) {
            let item = items[i];
            if (item.value === value) {
                return i;
            }
        }

        return -1;
    }

    filteredItemIndexByValue(value: any): number {
        const p = this._p;

        const items = p.filteredItems ?? p.items;
        for (let i = 0, count = items.length; i < count; i++) {
            let item = items[i];
            if (item.value === value) {
                return i;
            }
        }

        return -1;
    }

    itemIndexByValueOrLabel(value: any, label?: string): number {
        const p = this._p;

        const items = p.items;
        for (let i = 0, count = items.length; i < count; i++) {
            let item = items[i];
            if (item.value === value || item.label === label) {
                return i;
            }
        }

        return -1;
    }

    filteredItemIndexByValueOrLabel(value: any, label?: string): number {
        const p = this._p;

        const items = p.filteredItems ?? p.items;
        for (let i = 0, count = items.length; i < count; i++) {
            let item = items[i];
            if (item.value === value || item.label === label) {
                return i;
            }
        }

        return -1;
    }

    itemIndexByItem(item: ItemBase): number {
        const p = this._p;

        const items = p.items;

        for (let i = 0, count = items.length; i < count; i++) {
            let it = items[i];
            if (it[ItemSymbol] === item) {
                return i;
            }
        }

        return -1;
    }

    filteredItemIndexByItem(item: ItemBase): number {
        const p = this._p;

        const items = p.filteredItems ?? p.items;

        for (let i = 0, count = items.length; i < count; i++) {
            let it = items[i];
            if (it[ItemSymbol] === item) {
                return i;
            }
        }

        return -1;
    }

    items(): ItemBase[] {
        return this._p.items.map(x => x[ItemSymbol]);
    }

    itemsReference(): InternalItem[] {
        return this._p.items;
    }

    itemCount(): number {
        return this._p.items.length;
    }

    itemAtIndex(index: number): any {
        return this._p.items[index]?.[ItemSymbol];
    }

    filteredItemAtIndex(index: number): any {
        const p = this._p;
        const items = p.filteredItems ?? p.items;
        return items[index]?.[ItemSymbol];
    }

    /**
     * Return the item element at the given original index, if it exists.
     * The item may not be currently rendered, and null will be returned
     * @param index
     * @returns {HTMLElement|null}
     */
    itemElementAtIndex(index: number): HTMLElement | null {
        const p = this._p;
        if (!p.filteredItems)
            return this.filteredElementItemAtIndex(index);

        index = p.filteredItems.indexOf(this._p.items[index]);

        const li = p.virtualListHelper.getItemElementAt(index);
        return li ?? null;
    }

    /**
     * Return the item element at the given index, if it exists.
     * The item may not be currently rendered, and null will be returned
     * @param index
     * @returns {HTMLElement|null}
     */
    filteredElementItemAtIndex(index: number): HTMLElement | null {
        const p = this._p;
        const li = p.virtualListHelper.getItemElementAt(index);
        return li ?? null;
    }

    /**
     * @param {function(dropList: DropList):DropList.PositionOptions} fn
     * @returns {DropList}
     */
    setPositionOptionsProvider(fn: DropListOptions['positionOptionsProvider']): this {
        const p = this._p;
        if (p.positionOptionsProvider === fn)
            return this;
        p.positionOptionsProvider = fn ?? null;
        this.relayout();
        return this;
    }

    /**
     * @returns {function(dropList: DropList):DropList.PositionOptions|null}
     */
    getPositionOptionsProvider() {
        const p = this._p;
        return p.positionOptionsProvider;
    }

    /**
     * Sets a handler to intercept internal errors/warnings (e.g. from a throwing `renderItem`/`unrenderItem`)
     * instead of the default `console.error`/`console.warn`.
     * @param {DropList.LibraryErrorHandler|null} [fn]
     * @returns {DropList}
     */
    setOnError(fn?: DropListOptions['onError'] | null): this {
        const p = this._p;
        p.onError = fn ?? undefined;
        return this;
    }

    /**
     * @returns {DropList.LibraryErrorHandler|undefined}
     */
    getOnError() {
        return this._p.onError;
    }

    /**
     * @param {string} term
     * @param {boolean} [performSearch=false] should actually perform the search, or just set the input's text?
     * @returns {DropList}
     */
    setSearchTerm(term: string, performSearch = false): this {
        const p = this._p;

        if (p.searchInput) {
            p.searchInput.value = term;
        }

        if (performSearch) {
            p.filterTerm = term.trim();
            p.filteredItems = null;

            this._trigger('search', { value: term });
            p.throttledRefilterItems();
        }

        return this;
    }

    isFilterPending() {
        const p = this._p;

        return !!(p.throttledRefilterItems.isScheduled() ||
            (!p.filteredItems && (p.filterTerm || (p.filterOnEmptyTerm && p.filterFn))));
    }

    /** @private */
    /** @internal */
    _refilterItems() {
        const p = this._p;

        const term = p.filterTerm;
        const filterGroups = p.filterGroups;
        const filterEmptyGroups = p.filterEmptyGroups;

        if (term || (p.filterOnEmptyTerm && p.filterFn)) {
            let fn = p.filterFn;

            let filteredItems;

            if (typeof fn === 'function') {
                // Send the original items to the filter function
                filteredItems = p.filterFn(
                    p.items.map(x => {
                        const y = x[ItemSymbol];
                        if (y !== undefined) {
                            // Seal it to avoid object finding issues when wrapped in proxies by Vue or other libs
                            y[ItemSymbol] = Object.seal({
                                [ItemSymbol]: x,
                            });
                            return y;
                        }

                        return x;
                    }),
                    term);

                if (Array.isArray(filteredItems)) {
                    // And back
                    filteredItems = filteredItems.map((oitem: any) => {
                        let our = oitem[ItemSymbol]?.[ItemSymbol]; // double-unwrap sealed->item
                        if (!our) {
                            our = {
                                [ItemSymbol]: oitem,
                                label: oitem[p.labelProp],
                                value: oitem[p.valueProp],
                                _nocheck: !!oitem._nocheck,
                                _nointeraction: !!oitem._nointeraction,
                                _subitems: oitem._subitems,
                                _group: !!oitem._group,
                                _level: !!oitem._level,
                                _checked: !!oitem._checked,
                            };
                        }
                        return our;
                    });
                }
            }

            // If there was no filter function, or it gave up on filtering.
            if (!Array.isArray(filteredItems)) {
                if (term) {
                    const matcher = new RegExp(escapeRegex(term), 'i');

                    filteredItems = p.items.filter(x => {
                        if (!filterGroups && x._group) return true;
                        return matcher.test(x.label);
                    });
                } else {
                    filteredItems = null;
                }
            }

            p.filteredItems = filteredItems;

            if (filteredItems && filterEmptyGroups) {
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
            }
        } else {
            p.filteredItems = null;
        }

        p.needsRefilter = false;

        const items = p.filteredItems ?? p.items;
        p.hasNoResultsItem = items.length === 0 && !!p.noResultsText;
        p.virtualListHelper
            .setCount(items.length + (p.hasNoResultsItem ? 1 : 0))
            .render();

        this._trigger('itemschanged', { term: term, mutated: false, count: this.getFilteredItemCount() });
        this.relayout();
    }

    invokeRefilter() {
        const p = this._p;
        if (!p.filterTerm && !p.filterOnEmptyTerm && !p.filteredItems)
            return this;
        p.filteredItems = null;
        p.throttledRefilterItems();
        return this;
    }

    rushRefilter() {
        const p = this._p;
        if (p.needsRefilter)
            this._refilterItems();
        return this;
    }

    getFilteredItemCount() {
        const p = this._p;

        this.rushRefilter();

        if (p.filteredItems)
            return p.filteredItems.length;

        if (p.items)
            return p.items.length;

        return 0;
    }

    /**
     * @param {string} noResultsText
     * @returns {DropList}
     */
    setNoResultsText(noResultsText: string): this {
        const p = this._p;

        p.noResultsText = noResultsText;

        if (p.hasNoResultsItem) {
            p.virtualListHelper.refreshItemAt(0).render();
        }

        return this;
    }

    /**
     * @returns {string}
     */
    getNoResultsText() {
        return this._p.noResultsText;
    }

    /**
     * @param {number} window
     * @returns {DropList}
     */
    setFilterThrottleWindow(window: number): this {
        const p = this._p;
        p.filterThrottleWindow = window;

        let isScheduled = p.throttledRefilterItems ? p.throttledRefilterItems.isScheduled() : false;

        if (p.throttledRefilterItems)
            p.throttledRefilterItems.cancel();

        p.throttledRefilterItems = throttle(() => this._refilterItems(), p.filterThrottleWindow, true);

        if (isScheduled)
            p.throttledRefilterItems();

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
     * @returns {DropList}
     */
    setFilterOnEmptyTerm(value: boolean): this {
        const p = this._p;
        if (p.filterOnEmptyTerm === value)
            return this;
        p.filterOnEmptyTerm = value;
        p.throttledRefilterItems();
        return this;
    }

    /**
     * @returns {boolean}
     */
    getFilterOnEmptyTerm() {
        return this._p.filterOnEmptyTerm;
    }

    /**
     * @param {boolean} value
     * @returns {DropList}
     */
    setFilterGroups(value: boolean): this {
        const p = this._p;
        if (p.filterGroups === value)
            return this;
        p.filterGroups = value;
        p.throttledRefilterItems();
        return this;
    }

    /**
     * @returns {boolean}
     */
    getFilterGroups() {
        return this._p.filterGroups;
    }

    /**
     * @param {boolean} value
     * @returns {DropList}
     */
    setFilterEmptyGroups(value: boolean): this {
        const p = this._p;
        if (p.filterEmptyGroups === value)
            return this;
        p.filterEmptyGroups = value;
        p.throttledRefilterItems();
        return this;
    }

    /**
     * @returns {boolean}
     */
    getFilterEmptyGroups() {
        return this._p.filterEmptyGroups;
    }

    /**
     * @param {function(items: DropList.ItemBase[], term: string):(DropList.ItemBase[]|null)} fn
     * @returns {DropList}
     */
    setFilterFn(fn: DropListOptions['filterFn']): this {
        const p = this._p;
        if (p.filterFn === fn)
            return this;
        p.filterFn = fn;
        p.throttledRefilterItems();
        return this;
    }

    /**
     * @returns {function(items: DropList.ItemBase[], term: string):(DropList.ItemBase[]|null)}
     */
    getFilterFn() {
        return this._p.filterFn;
    }

    /**
     *
     * @param {DropList.PositionOptions} [positionOptions]
     * @returns {DropList}
     * @public
     */
    relayout(positionOptions?: PositionOptions | null): this {
        const p = this._p, el = p.el, menuEl = p.menuEl;

        if (!this.isVisible()) return this;

        let w = window;

        if (!positionOptions)
            positionOptions = p.positionOptionsProvider?.() ?? p.lastPositionOptions;

        // Supply some default for extreme cases, no crashing
        if (!positionOptions) {
            positionOptions = {
                targetOffset: {
                    left: window.innerWidth / 2,
                    top: window.innerHeight / 2,
                },
                targetWidth: 0,
                targetHeight: 0,
                position: { x: 'center', y: 'center' },
                anchor: { x: 'center', y: 'center' },
                targetRtl: getComputedStyle(document.body).direction === 'rtl',
            };
        }

        let targetBox: { left?: number; top?: number; height?: number; width?: number; bottom?: number } = {};

        let offset = positionOptions.targetOffset || getElementOffset(positionOptions.target);
        targetBox.left = offset.left;
        targetBox.top = offset.top;
        targetBox.height = positionOptions.targetHeight == null
            ? getElementHeight(positionOptions.target, true, true)
            : positionOptions.targetHeight;
        targetBox.width = positionOptions.targetWidth == null
            ? getElementWidth(positionOptions.target, true, true)
            : positionOptions.targetWidth;
        targetBox.bottom = targetBox.top + targetBox.height;

        let viewport: { top?: number; left?: number; width?: number; height?: number; bottom?: number; right?: number } = {};
        viewport.top = w.pageYOffset;
        viewport.left = w.pageXOffset;
        viewport.width = w.innerWidth;
        viewport.height = w.innerHeight;
        viewport.bottom = viewport.top + viewport.height;
        viewport.right = viewport.left + viewport.width;

        let defaultVerticalDirection = (positionOptions.position && positionOptions.position.y === 'bottom')
            ? 'above'
            : 'below';

        // Reset dropdown width
        el.style.width = '';

        // Make estimations
        if (p.estimateWidth ||
            p.virtualListHelper.isVirtual()) {
            this._measureItem();
        }

        // Calculate virtual viewport size
        if (p.virtualListHelper.isVirtual()) {
            // Avoid extremely high size which will cause laying out the whole list
            menuEl.style.height = Math.min(el.clientHeight, document.body.clientHeight) + 'px';
            p.virtualListHelper.render();
        }

        // Now set the width of the dropdown
        if (positionOptions.updateWidth || typeof positionOptions.updateWidth === 'number') {
            this._updateWidth(positionOptions);
        } else {
            this._updateWidth();
        }

        // Update estimated item heights after width is set
        if (p.virtualListHelper.isVirtual()) {
            p.virtualListHelper.render();
        }

        // How much space is there above, and how much below?
        let roomAbove = targetBox.top - viewport.top;
        let roomBelow = viewport.bottom - targetBox.bottom;

        // Calculate height for dropdown

        let maxViewHeight: number;

        const elComputedStyle = getComputedStyle(el);

        let isBoxing = elComputedStyle.boxSizing === 'border-box';
        let verticalPadding = (parseFloat(elComputedStyle.paddingTop) || 0) +
            (parseFloat(elComputedStyle.paddingBottom) || 0);
        let verticalBorderWidth = (parseFloat(elComputedStyle.borderTopWidth) || 0) +
            (parseFloat(elComputedStyle.borderBottomWidth) || 0);

        let headerHeight = 0;
        if (p.headerEl) {
            headerHeight = getElementHeight(p.headerEl, true, true);
        }

        let footerHeight = 0;
        if (p.footerEl) {
            footerHeight = getElementHeight(p.footerEl, true, true);
        }

        if (p.virtualListHelper.isVirtual()) {
            maxViewHeight =
                p.virtualListHelper.estimateFullHeight() +
                verticalPadding +
                verticalBorderWidth +
                headerHeight +
                footerHeight;
        } else {
            // Another method to calculate height is measuring the whole thing at once.
            // This causes relayout of course.
            el.style.height = '';
            menuEl.style.height = '';
            el.style.top = '-9999px';

            maxViewHeight = Math.max(getElementHeight(p.el), menuEl.scrollHeight);
            maxViewHeight += verticalPadding + verticalBorderWidth;
        }

        // Consider css max-height

        let maxHeight = parseFloat(elComputedStyle.maxHeight);
        if (!isNaN(maxHeight)) {
            if (!isBoxing) {
                maxHeight += verticalPadding + verticalBorderWidth;
            }

            maxViewHeight = Math.min(maxViewHeight, maxHeight);
        }

        // Figure out the direction

        let enoughRoomAbove = roomAbove >= maxViewHeight;
        let enoughRoomBelow = roomBelow >= maxViewHeight;

        let newDirection = p.currentDirection || defaultVerticalDirection;
        if (newDirection === 'above' && !enoughRoomAbove && enoughRoomBelow) {
            newDirection = 'below';
        } else if (newDirection === 'below' && !enoughRoomBelow && enoughRoomAbove) {
            newDirection = 'above';
        } else if (enoughRoomAbove && enoughRoomBelow) {
            if (newDirection !== defaultVerticalDirection &&
                ((defaultVerticalDirection === 'above' && roomAbove >= roomBelow) ||
                    (defaultVerticalDirection === 'below' && roomBelow >= roomAbove))) {
                newDirection = defaultVerticalDirection;
            }
        } else if (!enoughRoomAbove && !enoughRoomBelow) {
            if (roomAbove > roomBelow) {
                newDirection = 'above';
            } else if (roomBelow > roomAbove) {
                newDirection = 'below';
            }
        }
        p.currentDirection = newDirection;

        // Figure out that final view size
        let viewSize = {
            width: getElementWidth(el, true, true),
            height: Math.min(maxViewHeight, Math.max(roomAbove, roomBelow, 0)),
        };

        let isTargetRtl = positionOptions.targetRtl !== undefined ?
            positionOptions.targetRtl :
            (positionOptions.target == null ? false : getComputedStyle(positionOptions.target).direction === 'rtl');
        let isRtlDocument = getComputedStyle(document.documentElement).direction === 'rtl';

        let anchor = anchoredPosition(positionOptions.target,
            positionOptions.anchor ? positionOptions.anchor.x : 'start',
            positionOptions.anchor ? positionOptions.anchor.y : 'bottom',
            targetBox, isTargetRtl);
        let position = anchoredPosition(el,
            positionOptions.position ? positionOptions.position.x : 'start',
            positionOptions.position ? positionOptions.position.y : 'top',
            viewSize, isTargetRtl);

        // If it's not in the direction that the user expected, invert it
        let invertYPos =
            (position.ySpec === 'top' && newDirection === 'above') ||
            (position.ySpec === 'bottom' && newDirection === 'below') ||
            (position.ySpec !== 'bottom' && position.ySpec !== 'top' && newDirection === 'above');

        let scrollLeft =
            (w.pageXOffset !== undefined) ?
                w.pageXOffset :
                ((document.documentElement || document.body.parentNode || document.body) as HTMLElement).scrollLeft;
        scrollLeft = Math.abs(scrollLeft);
        if (isRtlDocument) {
            scrollLeft = document.documentElement.scrollWidth - scrollLeft - document.documentElement.clientWidth;
        }

        let minX = scrollLeft,
            maxX = document.documentElement.clientWidth + scrollLeft - viewSize.width;

        let viewCss: { position: string; left: any; top: any } = {
            'position': 'absolute',
            'left': targetBox.left,
            'top': targetBox.top + (invertYPos ? (anchor.bottom - position.bottom) : (anchor.top - position.top)),
        };

        if (isRtlDocument) {
            viewCss.left -= document.documentElement.clientWidth - document.documentElement.scrollWidth;
        }

        viewCss.left += anchor.left - position.left;

        if (positionOptions.offset) {
            if (positionOptions.offset.y) {
                if (invertYPos) {
                    viewCss.top -= positionOptions.offset.y;
                } else {
                    viewCss.top += positionOptions.offset.y;
                }
            }

            if (positionOptions.offset.x) {
                let rtl = elComputedStyle.direction === 'rtl';
                viewCss.left += rtl
                    ? -positionOptions.offset.x
                    : positionOptions.offset.x;
            }
        }

        if (p.autoFlipDirection) {
            if ((position.xSpec === 'right' &&
                    viewCss.left < minX &&
                    (Math.max(viewCss.left, minX) + viewSize.width - targetBox.left) / targetBox.width > 0.5) ||
                (position.xSpec === 'left' &&
                    viewCss.left > maxX &&
                    (Math.min(viewCss.left, maxX) - targetBox.left) / targetBox.width < 0.5)) {
                viewCss.left -= anchor.left - position.left;
                viewCss.left += anchor.right - position.right;
            }
        }

        // Constrain to the window if required
        if (p.constrainToWindow) {
            for (let which of (isRtlDocument ? ['min', 'max'] : ['max', 'min'])) {
                if (which === 'min' && viewCss.left < minX)
                    viewCss.left = minX;
                else if (which === 'max' && viewCss.left > maxX)
                    viewCss.left = maxX;
            }
        }

        // Set position CSS
        viewCss.left += 'px';
        viewCss.top += 'px';
        setCssProps(el, viewCss);
        setElementHeight(el, viewSize.height, true, true);

        if (menuEl !== el) {
            let menuHeight = viewSize.height - headerHeight - footerHeight - verticalBorderWidth - verticalPadding;
            setElementHeight(menuEl, menuHeight, true, true);
        }

        // Update the scroll position for virtual lists
        p.virtualListHelper.render();

        // Update position classes
        if (positionOptions && positionOptions.target) {
            p.lastPositionTarget = positionOptions.target;

            toggleClass(positionOptions.target, `has_${p.baseClassName}`, true);
            toggleClass(positionOptions.target, `has_${p.baseClassName}_below`, newDirection === 'below');
            toggleClass(positionOptions.target, `has_${p.baseClassName}_above`, newDirection === 'above');

            toggleClass(el, `${p.baseClassName}__is_below`, newDirection === 'below');
            toggleClass(el, `${p.baseClassName}__is_above`, newDirection === 'above');
        }

        return this;
    }

    /**
     * Set the checked mode of a specific value.
     * @public
     * @param {*} value - array of values to check
     * @param {boolean} checked - will the value be checked?
     * @returns {DropList} self
     */
    setItemChecked(value: any, checked: boolean): this {
        const p = this._p;

        checked = !!checked;

        let index = this.itemIndexByValue(value);
        if (index === -1) return this;

        let li = p.virtualListHelper.getItemElementAt(index);
        if (!li) return this;

        let item = li[ItemSymbol];

        checked = checked && !item._nocheck;

        if (item._checked !== checked) {
            item._checked = checked;

            toggleClass(li, `${p.baseClassName}__item_checked`, item._checked);

            this._updateGroupStateForItem(item);
        }

        return this;
    }

    /**
     * Set the checked values. All the other values will be unchecked,
     * @public
     * @param {Array<*>} values - array of values to check
     * @returns {DropList} self
     */
    setCheckedValues(values: any[]): this {
        const p = this._p;

        this.rushRefilter();

        let groupIndexes = [];

        for (let i = 0, count = p.items.length; i < count; i++) {
            let item = p.items[i];
            let checked = !item._nocheck && values.indexOf(item.value) !== -1;

            let itemIndex = p.filteredItems ? p.filteredItems.indexOf(item) : i;

            if (item._group && itemIndex !== -1) {
                groupIndexes.push(itemIndex);
            }

            if (item._checked === checked) continue;

            item._checked = checked;

            if (itemIndex === -1) continue;

            let li = p.virtualListHelper.getItemElementAt(itemIndex);
            if (!li) continue;

            toggleClass(li, `${p.baseClassName}__item_checked`, item._checked);
        }

        if (p.autoCheckGroupChildren) {
            for (let i = 0, count = groupIndexes.length; i < count; i++) {
                this._updateGroupCheckedState(groupIndexes[i], false);
            }
        }

        return this;
    }

    /**
     * Get all checked values. Returns array of item values.
     * @public
     * @param {boolean} excludeGroups=false Exclude group items
     * @returns {Array<*>} self
     */
    getCheckedValues(excludeGroups?: boolean): any[] {
        const p = this._p;

        excludeGroups = excludeGroups && p.groupCount > 0;

        let values = [];

        for (let i = 0, count = p.items.length; i < count; i++) {
            let item = p.items[i];
            if (!item._checked) continue;
            if (excludeGroups && item._group) continue;
            values.push(item.value);
        }

        return values;
    }

    /**
     * Get all checked items. Returns array of actual item data object.
     * @public
     * @param {boolean} excludeGroups=false Exclude group items
     * @returns {DropList.Item[]}
     */
    getCheckedItems(excludeGroups?: boolean): ItemBase[] {
        const p = this._p;

        excludeGroups = excludeGroups && p.groupCount > 0;

        const items = [];

        for (let i = 0, count = p.items.length; i < count; i++) {
            let item = p.items[i];
            if (!item._checked) continue;
            if (excludeGroups && item._group) continue;
            items.push(item[ItemSymbol]);
        }

        return items;
    }

    /**
     *
     * @param {DropList.PositionOptions?} [positionOptions]
     * @returns {DropList}
     * @public
     */
    show(positionOptions?: PositionOptions | null): this {
        const p = this._p;

        p.hiding = false;

        if (!this.isVisible()) {
            this._trigger('show:before');
        }

        p.mouseHandled = false;

        setTimeout(() => { // Skip the end of a 'click' event
            if (this[DestroyedSymbol]) return;

            if (!p.onDocumentMouseDown) {
                // Detect mouse tap outside of the droplist, to blur the focused item
                p.sink.add(document, 'mousedown', p.onDocumentMouseDown = (event) => {
                    if (!this.elContains(event.target, true))
                        this._delayBlurItemOnBlur();
                });
            }
        });

        this.rushRefilter();

        const el = p.el;
        el.style.position = 'absolute';
        el.classList.remove(`${p.baseClassName}__is-hiding`);
        document.body.appendChild(el);

        p.visible = true;

        p.el.style.display = '';
        if (getComputedStyle(p.el).display === 'none')
            p.el.style.display = 'block';

        p.lastPositionOptions = null;

        if (positionOptions === undefined) {
            positionOptions = p.positionOptionsProvider?.() ?? p.lastPositionOptions;
        } else {
            p.lastPositionOptions = positionOptions;
        }

        if (positionOptions) {
            const elComputedStyle = getComputedStyle(el);

            // Set max height to avoid adding scrollbars to page
            const originalMaxHeight = el.style.maxHeight;
            let maxHeight = document.body.clientHeight -
                (parseFloat(elComputedStyle.marginTop) || 0) -
                (parseFloat(elComputedStyle.marginBottom) || 0) -
                (elComputedStyle.boxSizing === 'border-box'
                    ? 0
                    : ((parseFloat(elComputedStyle.borderTopWidth) || 0) +
                        (parseFloat(elComputedStyle.borderBottomWidth) || 0)));

            el.style.maxHeight = Math.min(maxHeight, parseFloat(elComputedStyle.maxHeight) || maxHeight) + 'px';

            this.relayout(positionOptions);

            // Restore original max-height
            el.style.maxHeight = originalMaxHeight;
        } else {
            // Calculate virtual viewport size
            if (p.virtualListHelper.isVirtual()) {
                p.virtualListHelper.render();
            }
        }

        if (this.isVisible()) {
            this._trigger('show');
        }

        return this;
    }

    hide(event?: Event) {
        const p = this._p, el = p.el;

        if (p.onDocumentMouseDown) {
            p.sink.remove(document, 'mousedown', p.onDocumentMouseDown);
            p.onDocumentMouseDown = null;
        }

        if (this.isVisible()) {
            this._trigger('hide:before');

            p.hiding = true;

            if (this.isFilterPending()) {
                p.throttledRefilterItems.cancel();
                p.needsRefilter = true;
            }

            if (el) {

                el.classList.add(`${p.baseClassName}__is-hiding`);

                // support for hide transition in css
                const maxTransitionDuration = parseTransition(getComputedStyle(p.el).transition)
                    .reduce((p: number, v: any) => Math.max(p, v.delay + v.duration), 0);

                if (maxTransitionDuration > 0) {
                    setTimeout(() => {
                        if (this[DestroyedSymbol]) return;

                        if (this._p && el.parentNode && p.hiding) {
                            remove(el);
                            el.classList.remove(`${p.baseClassName}__is-hiding`);
                            p.visible = false;
                            this._trigger('hide:after');
                        }
                    });
                } else {
                    if (el.parentNode)
                        remove(el);
                    el.classList.remove(`${p.baseClassName}__is-hiding`);
                }
            }

            p.visible = false;

            this.blurFocusedItem();
            this._trigger('hide');

            if (this[DestroyedSymbol]) return;
            this._trigger('hide:after');

            if (p.currentSubDropList) {
                this._hideSublist();
            }
        }

        if (p.lastPositionTarget) {
            p.lastPositionTarget.classList.remove(
                `has_${p.baseClassName}`,
                `has_${p.baseClassName}_above`,
                `has_${p.baseClassName}_below`);
            delete p.lastPositionTarget;
        }

        return this;
    }

    isVisible() {
        const p = this._p;
        if (!p.visible)
            return false;
        return p.el.parentNode && getComputedStyle(p.el).display !== 'none';
    }

    /**
     * Change visibility of the header element
     * You should probably call `relayout()` after this.
     * @param {boolean} visible
     */
    setHeaderVisible(visible: boolean) {
        let isVisible = this.isHeaderVisible();
        if (isVisible === !!visible)
            return;

        if (visible) {
            this._p.el.insertBefore(this._p.headerEl, this._p.el.firstChild ?? null);
        } else {
            this._p.headerEl.remove();
        }
    }

    /**
     * Is the header element visible?
     * @returns {boolean}
     */
    isHeaderVisible() {
        return !!this._p.headerEl.parentNode;
    }

    /**
     * Get a reference to the header element in order to add custom content.
     * @returns {Element}
     */
    getHeaderElement() {
        return this._p.headerEl;
    }

    /**
     * Change visibility of the footer element
     * You should probably call `relayout()` after this.
     * @param {boolean} visible
     */
    setFooterVisible(visible: boolean) {
        let isVisible = this.isFooterVisible();
        if (isVisible === !!visible)
            return;

        if (visible) {
            this._p.el.appendChild(this._p.footerEl);
        } else {
            this._p.footerEl.remove();
        }
    }

    /**
     * Is the footer element visible?
     * @returns {boolean}
     */
    isFooterVisible() {
        return !!this._p.footerEl.parentNode;
    }

    /**
     * Get a reference to the footer element in order to add custom content.
     * @returns {Element}
     */
    getFooterElement() {
        return this._p.footerEl;
    }

    /**
     * Set inline search visibility
     * You should probably call `relayout()` after this.
     * @param {boolean} searchable
     */
    setSearchable(searchable: boolean) {
        const p = this._p;

        if (!!p.searchInput === !!searchable)
            return;

        if (searchable) {
            p.searchInput = createElement('input', {
                type: 'search',
                role: 'searchbox',
                tabindex: '0',
                autocorrect: 'off',
                autocomplete: 'off',
                autocapitalize: 'off',
                spellcheck: 'false',
                'aria-autocomplete': 'list',
                placeholder: p.searchPlaceholder || '',
            });

            p.headerEl.appendChild(p.searchInput);
        } else {
            if (p.searchInput.parentNode)
                p.searchInput.remove();
            p.searchInput = null;
        }

        this.setHeaderVisible(searchable);
    }

    /**
     * Set the placeholder text of the inline search box
     * @param {string} placeholder
     */
    setSearchPlaceholder(placeholder: string) {
        const p = this._p;

        p.searchPlaceholder = placeholder || '';

        if (p.searchInput) {
            p.searchInput.placeholder = p.searchPlaceholder;
        }
    }

    hasFocusedItem() {
        return this._p.focusItemIndex > -1 && this._p.focusItemIndex < this._p.items.length;
    }

    getFocusedItemIndex() {
        if (!this.hasFocusedItem())
            return -1;
        return this._p.focusItemIndex;
    }

    setFocusedItemAtIndex(itemIndex: number): this {
        const p = this._p;

        this.rushRefilter();

        if (p.filteredItems) {
            const item = p.filteredItems[itemIndex];
            itemIndex = p.items.indexOf(item);
        }

        p.focusItemIndex = itemIndex;

        const items = p.filteredItems ?? p.items;

        let item = null;
        if (itemIndex > -1)
            item = items[itemIndex];
        if (item && item._nointeraction)
            item = null;
        if (itemIndex > -1) {
            this._scrollItemIndexIntoView(itemIndex);
        }
        let itemElement = item ? p.virtualListHelper.getItemElementAt(itemIndex) : null;

        if (p.focusItemEl !== itemElement) {
            if (p.focusItemEl) {
                p.focusItemEl.classList.remove(`${p.baseClassName}__item_focus`);
                p.focusItemEl = null;
            }

            if (itemElement) {
                itemElement.classList.add(`${p.baseClassName}__item_focus`);
                p.focusItemEl = itemElement;

                const item = itemElement[ItemSymbol];

                this._trigger('itemfocus', {
                    value: item.value,
                    item: item[ItemSymbol] ?? item,
                    event: null,
                    el: itemElement,
                });

                this._showSublist(item, itemElement);
            }
        }

        return this;
    }

    /** @internal */
    _showSublist(item: InternalItem, itemElement: HTMLElement) {
        if (!item._subitems?.length) return;

        const p = this._p;
        if (p.currentSubDropList?.item === item)
            return;

        const droplist = new DropList({
            baseClassName: p.baseClassName,
            additionalClasses: p.additionalClasses,
            direction: p.direction,
            autoItemBlur: p.autoItemBlur,
            autoItemBlurDelay: p.autoItemBlurDelay,
            capturesFocus: p.capturesFocus,
            multi: p.multi,
            keyDownHandler: p.keyDownHandler,
            autoCheckGroupChildren: p.autoCheckGroupChildren,
            useExactTargetWidth: p.useExactTargetWidth,
            constrainToWindow: p.constrainToWindow,
            autoFlipDirection: p.autoFlipDirection,
            estimatedItemHeight: p.estimatedItemHeight,
            estimateWidth: p.estimateWidth,
            virtualMinItems: p.virtualMinItems,
            singleSelectedValue: p.singleSelectedValue,
            labelProp: p.labelProp,
            valueProp: p.valueProp,
            renderItem: p.renderItem,
            unrenderItem: p.unrenderItem,
            positionOptionsProvider: () => p.currentSubDropList.showOptions,
        });

        let onBlur = (event: any) => {
            if (this[DestroyedSymbol]) return;

            if (event.relatedTarget && this.elContains(event.relatedTarget, true))
                return;

            this._delayBlurItemOnBlur();
            this._trigger('subitems:blur', event);
        };

        droplist
            .on('select', event => {
                this._trigger('subitems:select', event);
            })
            .on('subitems:select', event => {
                this._trigger('subitems:select', event);
            })
            .on('show_subitems', event => {
                this._trigger('show_subitems', event);
            })
            .on('hide_subitems', event => {
                this._trigger('hide_subitems', event);
            })
            .on('blur', onBlur)
            .on('subitems:blur', onBlur)
            .on('_back_key_pressed', () => {
                this._hideSublist();
            });

        droplist.setItems(item._subitems);

        this._trigger('show_subitems', {
            value: item.value,
            item: item[ItemSymbol] ?? item,
            el: itemElement,
            droplist: droplist,
        });

        p.currentSubDropList = {
            item: item,
            itemElement: itemElement,
            droplist: droplist,
            showOptions: {
                target: itemElement,
                position: { x: 'start', y: 'top' },
                anchor: { x: 'end', y: 'top' },
                offset: { x: 0, y: 0 },
                updateWidth: false,
            },
        };

        droplist.show();

        droplist.el.focus();
    }

    /** @internal */
    _hideSublist() {
        const p = this._p;

        if (!p.currentSubDropList)
            return;

        const data = p.currentSubDropList;

        let subHadFocus = !!document.activeElement && data.droplist.elContains(document.activeElement, true);

        data.droplist.hide();
        data.droplist.destroy();
        p.currentSubDropList = null;

        if (subHadFocus && !this[DestroyedSymbol]) {
            this.el.focus();
        }

        this._trigger('hide_subitems', {
            value: data.item.value,
            item: data.item,
            el: data.itemElement,
            droplist: data.droplist,
        });
    }

    /**
     * Updates the current open sublist with new subitems if changed
     */
    updateSublist() {
        const p = this._p;

        if (!p.currentSubDropList)
            return;

        const originalItem = p.currentSubDropList.item;

        const data = p.currentSubDropList;
        const newItem = p.items.find(x => x === originalItem) ||
            p.items.find(x => x.value === data.item.value);
        if (newItem) {
            p.currentSubDropList.item = newItem;
            const itemElement = p.virtualListHelper.getItemElementAt(this._getItemIndex(newItem));
            p.currentSubDropList.itemElement = itemElement;

            if (newItem._subitems) {
                p.currentSubDropList.droplist.setItems(newItem._subitems);

                if (itemElement) {
                    p.currentSubDropList.showOptions.target = itemElement;
                    p.currentSubDropList.droplist.relayout();
                }
            }
        }
    }

    setFocusedItem(item: any) {
        const p = this._p;

        let itemIndex = item._nointeraction ? -1 : this._getItemIndex(item);

        const items = p.items;
        if (itemIndex > -1 && items[itemIndex]._nointeraction)
            itemIndex = -1;

        return this.setFocusedItemAtIndex(itemIndex);
    }

    setFocusedItemByValue(value: any) {
        return this.setFocusedItemAtIndex(this.itemIndexByValue(value));
    }

    setSingleSelectedItemAtIndex(itemIndex: number, value?: any): this {
        const p = this._p;

        this.rushRefilter();

        let itemEl = null;
        let item;

        if (itemIndex > -1 && !p.items[itemIndex]._nointeraction) {
            item = p.items[itemIndex];
            value = item.value;

            if (p.filteredItems) {
                itemIndex = p.filteredItems.indexOf(item);
            }

            if (itemIndex > -1) {
                itemEl = p.virtualListHelper.getItemElementAt(itemIndex);
            }
        }

        this._setSingleSelectedItemEl(itemEl, value);

        return this;
    }

    setSingleSelectedItem(item: any) {
        const p = this._p;

        let itemIndex = item._nointeraction ? -1 : this._getItemIndex(item);

        const items = p.items;
        if (itemIndex > -1 && items[itemIndex]._nointeraction)
            itemIndex = -1;

        return this.setSingleSelectedItemAtIndex(itemIndex);
    }

    setSingleSelectedItemByValue(value: any) {
        return this.setSingleSelectedItemAtIndex(this.itemIndexByValue(value), value);
    }

    next(event: Event) {
        this._move('next', event);
    }

    previous(event: Event) {
        this._move('prev', event);
    }

    isFirstItem() {
        const p = this._p;
        const items = p.filteredItems ?? p.items;
        return p.focusItemIndex === 0 && p.focusItemIndex < items.length;
    }

    isLastItem() {
        const p = this._p;
        const items = p.filteredItems ?? p.items;
        return p.focusItemIndex > -1 && p.focusItemIndex === items.length - 1;
    }

    scrollItemIndexIntoView(itemIndex: number): this {
        const p = this._p;

        if (this._hasScroll()) {
            if (p.filteredItems) {
                const item = p.items[itemIndex];
                itemIndex = p.items.indexOf(item);
            }

            if (itemIndex !== -1) {
                this._scrollItemIndexIntoView(itemIndex);
            }
        }

        return this;
    }

    /** @internal */
    _scrollItemIndexIntoView(itemIndex: number) {
        const p = this._p;

        if (this._hasScroll()) {
            const menuEl = p.menuEl, scrollTop = menuEl.scrollTop;

            let itemPos, previousPos = -1;
            let maxIterations = 30; // Some zoom/scroll issues can make it so that it takes almost forever

            while (maxIterations-- > 0) {
                itemPos = p.virtualListHelper.getItemPosition(itemIndex);

                if (itemPos === previousPos)
                    break;

                previousPos = itemPos;

                let itemSize = p.virtualListHelper.getItemSize(itemIndex);

                let listHeight = menuEl.clientHeight;

                if (itemPos < scrollTop) {
                    menuEl.scrollTop = itemPos;
                } else if (itemPos + itemSize > scrollTop + listHeight) {
                    menuEl.scrollTop = itemPos + itemSize - listHeight;
                }

                // force update items, until the positions and sizes are final
                p.virtualListHelper.render();
            }
        }
    }

    /**
     * Register an event handler
     * @param {(string|'*')?} event
     * @param {function(any)} handler
     * @returns {DropList}
     */
    on(event: string | '*', handler: (value: any) => void): this {
        this._p.mitt.on(event, handler);
        return this;
    }

    /**
     * Register a one time event handler
     * @param {(string|'*')?} event
     * @param {function(any)} handler
     * @returns {DropList}
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
     * @param {(string|'*')?} event
     * @param {function(any)} handler
     * @returns {DropList}
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
     * @param {string} event
     * @param {any} value
     * @returns {DropList}
     */
    emit(event: string, value?: any): this {
        this._p.mitt.emit(event, value);
        return this;
    }

    /** @internal */
    _getItemIndex(item: any): number {
        const p = this._p;

        let itemIndex = -1;

        if (item) {
            const items = p.filteredItems ?? p.items;
            itemIndex = items.indexOf(item);
            if (itemIndex === -1) {
                let value = (item && item.value !== undefined) ? item.value : item;
                let label = (item && item.label) ? item.label : value;
                itemIndex = this.itemIndexByValueOrLabel(value, label);
            }
        }

        return itemIndex;
    }

    /** @internal */
    _setSingleSelectedItemEl(itemEl: HTMLElement | null, value: any): this {
        const p = this._p;

        if (p.singleSelectedItemEl) {
            p.singleSelectedItemEl.classList.remove(`${p.baseClassName}__item_selected`);
            p.singleSelectedItemEl = null;
        }

        p.singleSelectedValue = value;

        if (itemEl && value !== undefined) {
            itemEl.classList.add(`${p.baseClassName}__item_selected`);
            p.singleSelectedItemEl = itemEl;
        }

        return this;
    }

    /**
     * @param {string} event
     * @param {*} [data]
     * @private
     * @internal
     */
    _trigger(event: string, data?: any) {
        const p = this._p;
        if (p.on)
            p.on(event, ...(data === undefined ? [] : [data]));
        p.mitt.emit(event, data);
    }

    /** @internal */
    _itemUpAction(event: any, itemEl: HTMLElement) {
        if (closestUntil(event.target, '.requires-pointer-events,button', itemEl)) return;

        let p = this._p;

        if (!this._mouseHandled) {

            this.triggerItemSelection(null, event);

            // If we are destroyed in response to a click/select, cease all actions
            if (this[DestroyedSymbol])
                return;

            if (document.activeElement !== this.el && p.focusItemEl) {
                clearTimeout(p.blurTimer);
            }

            setTimeout(() => {
                this._mouseHandled = false;
            }, 0);
        }
    }

    /** @internal */
    _hookMouseEvents() {
        const p = this._p;

        p.sink
            .add(p.el, 'mouseup', (event: any) => {
                const li = closestUntil(event.target, 'li', event.currentTarget);
                if (!li) return;

                if (event.button !== 0) return;

                this._itemUpAction(event, li);
            })
            .add(p.el, 'mouseover', (event: any) => {
                const li = closestUntil(event.target, 'li', event.currentTarget);
                if (!li) return;

                this._handleMouseOver(event, li);
            });
    }

    /** @internal */
    _handleMouseOver(event: any, itemEl: HTMLElement) {
        this._focus(event, itemEl, null, true);
    }

    /** @internal */
    _hookTouchEvents() {
        const p = this._p;

        let currentTouchId: any;

        p.sink.add(p.el, 'touchstart', (event: any) => {
            const li = closestUntil(event.target, 'li', event.currentTarget);
            if (!li) return;

            if (currentTouchId) return;
            if (closestUntil(event.target, '.requires-pointer-events,button', li)) return;

            currentTouchId = event.changedTouches[0].identifier;

            // Simulate mouseover event
            this._handleMouseOver(event, li);

            // Track scrolling
            let didScroll = false;
            let onScroll = () => {
                didScroll = true;
            };
            let onTouchCancel = () => {
                currentTouchId = null;
                p.sink.remove(null, '.dropdown_touchextra');
            };

            let elToTrackScroll = li.parentNode;
            while (elToTrackScroll) {
                p.sink.add(elToTrackScroll, 'scroll.dropdown_touchextra', onScroll);
                elToTrackScroll = elToTrackScroll.parentNode;
            }
            p.sink.add(window, 'scroll.dropdown_touchextra', onScroll);

            p.sink.add(window, 'touchcancel.dropdown_touchextra', onTouchCancel);

            p.sink.add(p.el, 'touchend.dropdown_touchextra', (event: any) => {
                const li = closestUntil(event.target, 'li', event.currentTarget);
                if (!li) return onTouchCancel();

                let touch = Array.prototype.find.call(event.changedTouches, (touch: any) => {
                    return touch.identifier === currentTouchId;
                });
                if (!touch) return onTouchCancel();

                onTouchCancel();

                if (!didScroll) {
                    this._itemUpAction(event, li);
                    event.preventDefault();
                }
            });
        });
    }

    /** @internal */
    _hookFocusEvents() {
        const p = this._p;

        p.sink
            .add(p.el, 'focus', (event: any) => {
                if (event.target === this.el && p.searchable)
                    p.searchInput.focus();

                if (event.relatedTarget &&
                    this.elContains(event.relatedTarget, true) &&
                    this.elContains(event.target, true))
                    return;

                let itemEl = (p.focusItemEl || // focused item
                    p.el.firstChild) as HTMLElement | null; // or the first item

                this._focus(event, itemEl, null, false);
            }, true)
            .add(p.el, 'blur', (event: any) => {
                if (event.relatedTarget &&
                    this.elContains(event.relatedTarget, true) &&
                    this.elContains(event.target, true))
                    return;

                setTimeout(() => {
                    if (this[DestroyedSymbol]) return;

                    if (document.activeElement && this.elContains(document.activeElement, true)) {
                        return;
                    }

                    this._delayBlurItemOnBlur();
                    this._trigger('blur', event);
                });
            }, true);
    }

    /** @internal */
    _hookKeyEvents() {
        const p = this._p;

        p.sink.add(p.el, 'keydown', (evt: any) => this._keydown(evt));
    }

    /** @internal */
    _hookSearchEvents() {
        const p = this._p;

        if (!p.searchInput)
            return;

        p.sink.add(p.searchInput, 'input', () => {
            p.filterTerm = p.searchInput.value.trim();
            p.filteredItems = null;

            this._trigger('search', { value: p.searchInput.value });
            p.throttledRefilterItems();
        });
    }

    /** @internal */
    _keydown(event: any) {
        const p = this._p;

        if (p.keyDownHandler && p.keyDownHandler.call(this, event)) {
            return;
        }

        let preventDefault = true;

        switch (event.key) {
            case VALUE_PAGE_UP:
            case VALUE_PAGE_DOWN:
            case VALUE_HOME:
            case VALUE_END:
            case VALUE_UP:
            case VALUE_DOWN:
                p.lastKeyWasChar = false;

                event.preventDefault();

                switch (event.key) {
                    case VALUE_PAGE_UP:
                        this.previousPage(event);
                        break;
                    case VALUE_PAGE_DOWN:
                        this.nextPage(event);
                        break;
                    case VALUE_HOME:
                        this._move('first', event);
                        break;
                    case VALUE_END:
                        this._move('last', event);
                        break;
                    case VALUE_UP:
                        this.previous(event);
                        break;
                    case VALUE_DOWN:
                        this.next(event);
                        break;
                }
                break;

            case VALUE_LEFT:
            case VALUE_RIGHT:
                p.lastKeyWasChar = false;
                if (event.key === VALUE_RIGHT && getComputedStyle(event.target).direction !== 'rtl' ||
                    event.key === VALUE_LEFT && getComputedStyle(event.target).direction === 'rtl') {
                    const items = p.filteredItems ?? p.items;
                    let item = items[p.focusItemIndex];
                    if (p.focusItemIndex > -1 && item._subitems)
                        this._showSublist(item, p.focusItemEl);
                } else {
                    if (p.currentSubDropList) {
                        this._hideSublist();
                        preventDefault = false;
                    } else {
                        this._trigger('_back_key_pressed');
                    }
                }
                break;

            case VALUE_ENTER:
                p.lastKeyWasChar = false;
                this.triggerItemSelection(null, event);
                event.preventDefault();
                break;

            case VALUE_SPACE:
                if (event.target.tagName === 'BUTTON' ||
                    event.target.tagName === 'INPUT' && p.lastKeyWasChar) return;

                this.toggleFocusedItem();
                event.preventDefault();
                break;

            case VALUE_ESCAPE:
                p.lastKeyWasChar = false;
                event.preventDefault();
                this.hide();
                break;

            default: {
                if (event.target.tagName === 'INPUT' ||
                    event.target.tagName === 'TEXTAREA') {
                    const character = event.key || String.fromCharCode(event.keyCode);
                    p.lastKeyWasChar = character.length === 1 || event.key === VALUE_BACK_SPACE;
                }

                // Inline search box not available, then support typing to focus by first letters
                if (!p.searchable)
                    this._keydownFreeType(event, !this.isVisible());

                preventDefault = false;
            }
        }
    }

    /** @internal */
    _keydownFreeType(evt: any, autoSelect?: boolean) {
        const p = this._p;

        // noinspection JSDeprecatedSymbols
        const character = evt.key || String.fromCharCode(evt.keyCode);
        const isChar = character.length === 1;
        p.lastKeyWasChar = isChar || evt.key === VALUE_BACK_SPACE;
        if (!isChar) return;

        clearTimeout(p.filterTimer);

        // Accumulate text to find from keystrokes
        let keyword = (p.previousFilter || '') + character;

        let regex = new RegExp(`^${escapeRegex(keyword)}`, 'i');

        let matchIndex = -1;
        let item;

        let focusItemIndex = p.focusItemIndex;

        const items = p.filteredItems ?? p.items;

        // These are all the possible matches for the text typed in so far
        for (let i = 0, count = items.length; i < count; i++) {
            if (matchIndex !== -1 && i < focusItemIndex)
                continue; // We are only interested in first match + match after the focused item

            item = items[i];
            if (regex.test(item.label)) {
                matchIndex = i;
                if (focusItemIndex === -1 || i >= focusItemIndex)
                    break;
            }
        }

        // Did we find anything?
        if (matchIndex === -1) {
            // No... So start over with this character as the only one.
            keyword = character;
            regex = new RegExp(`^${escapeRegex(keyword)}`, 'i');

            for (let i = 0, count = items.length; i < count; i++) {
                if (matchIndex !== -1 && i < focusItemIndex)
                    continue; // We are only interested in first match + match after the focused item

                item = items[i];
                if (regex.test(item.label)) {
                    matchIndex = i;
                    if (focusItemIndex === -1 || i >= focusItemIndex)
                        break;
                }
            }
        }

        if (matchIndex > -1) {
            let next = p.virtualListHelper.getItemElementAt(matchIndex);
            this._focus(evt, next || null, matchIndex, true);

            if (autoSelect) {
                this.triggerItemSelection(next ? null : items[matchIndex], evt);
            }

            // Record the last filter used
            p.previousFilter = keyword;

            // Clear the last filter - a second from now.
            p.filterTimer = setTimeout(() => {
                delete p.previousFilter;
            }, 1000);

        } else {
            delete p.previousFilter;
        }
    }

    /** @internal */
    _focus(event: any, itemEl: HTMLElement | null, itemIndex: number | undefined, openSubitems: boolean) {
        const p = this._p;

        if (p._isFocusingItem)
            return;
        p._isFocusingItem = true;

        if (!itemIndex && itemEl) {
            itemIndex = p.virtualListHelper.getItemIndexFromElement(itemEl);
        }

        if (itemIndex > -1 && (itemEl as any)?.[ItemSymbol]?.[ItemSymbol] === NoResultsItemSymbol) {
            itemIndex = undefined;
        }

        if (itemIndex > -1) {
            this.scrollItemIndexIntoView(itemIndex);
        } else if (itemIndex === undefined) {
            itemEl = null;
        }

        let focusItemEl = itemEl || p.virtualListHelper.getItemElementAt(itemIndex);
        if (!focusItemEl || focusItemEl[ItemSymbol]._nointeraction) {
            p._isFocusingItem = false;
            this.blurFocusedItem();
            return;
        }

        if (focusItemEl === p.focusItemEl) {
            p._isFocusingItem = false;
            clearTimeout(p.blurTimer);
            return;
        }

        this.blurFocusedItem();

        focusItemEl.classList.add(`${p.baseClassName}__item_focus`);
        p.focusItemEl = focusItemEl;
        p.focusItemIndex = itemIndex;

        const items = p.filteredItems ?? p.items;
        const item = items[itemIndex];
        this._trigger('itemfocus', {
            value: item.value,
            item: item[ItemSymbol] ?? item,
            event: event,
            el: focusItemEl,
        });

        p._isFocusingItem = false;

        if (openSubitems)
            this._showSublist(item, focusItemEl);
    }

    /** @internal */
    _delayBlurItemOnBlur() {
        if (this[DestroyedSymbol])
            return;

        const p = this._p;

        if (!p.autoItemBlur)
            return;

        clearTimeout(p.blurTimer);

        p.blurTimer = setTimeout(() => {
            if (this[DestroyedSymbol]) return;
            this.blurFocusedItem();
        }, p.autoItemBlurDelay);
    }

    /** @internal */
    _move(direction: string, event: Event): void {
        const p = this._p;

        let next, nextIndex, directionUp;
        const items = p.filteredItems ?? p.items;

        if (direction === 'first') {
            nextIndex = 0;
            directionUp = false;
        } else if (direction === 'last') {
            nextIndex = items.length - 1;
            directionUp = true;
        } else if (direction === 'prev') {
            if (!this.hasFocusedItem())
                return this._move('last', event);

            nextIndex = p.focusItemIndex - 1;
            if (nextIndex === -1) {
                nextIndex = items.length - 1;
            }

            directionUp = true;
        } else if (direction === 'next') {
            if (!this.hasFocusedItem())
                return this._move('first', event);

            nextIndex = p.focusItemIndex + 1;
            if (nextIndex === items.length) {
                nextIndex = 0;
            }

            directionUp = false;
        } else if (direction === 'prev_page' || direction === 'next_page') {

            if (!this.hasFocusedItem()) {
                return this._move(direction === 'prev_page' ? 'prev' : 'next', event);
            }

            if ((direction === 'prev_page' && this.isFirstItem()) ||
                (direction === 'next_page' && this.isLastItem())) return;

            if (this._hasScroll()) {

                if (p.virtualListHelper.isVirtual()) {
                    let visibleItemCount = p.virtualListHelper.getVisibleItemCount();

                    nextIndex = p.focusItemIndex;

                    if (direction === 'prev_page') {
                        nextIndex -= visibleItemCount;
                    } else {
                        nextIndex += visibleItemCount;
                    }

                    if (nextIndex < 0) {
                        nextIndex = 0;
                    } else if (nextIndex >= items.length) {
                        nextIndex = items.length;
                    }
                } else if (p.focusItemEl) {
                    let base = getElementOffset(p.focusItemEl).top;
                    let height = getElementHeight(p.el, true);

                    while (true) {
                        next = p.focusItemEl.nextElementSibling;
                        if (!next) return;
                        if (next.tagName !== 'LI') continue;

                        if (direction === 'prev_page') {
                            if (getElementOffset(next).top - base + height <= 0)
                                break;
                        } else {
                            if (getElementOffset(next).top - base - height >= 0)
                                break;
                        }
                    }

                    if (next) {
                        nextIndex = p.virtualListHelper.getItemIndexFromElement(next);

                        if (nextIndex === undefined)
                            nextIndex = -1;
                    }
                }

            } else {
                return this._move(direction === 'prev_page' ? 'first' : 'last', event);
            }

            directionUp = direction === 'prev_page';
        } else {
            return;
        }

        let itemCount = items.length;

        if (nextIndex >= itemCount) {
            return;
        }

        let item = items[nextIndex];
        // noinspection UnnecessaryLocalVariableJS
        let startedAtIndex = nextIndex;

        while (item && item._nointeraction) {
            if (directionUp) {
                nextIndex--;
                if (nextIndex === -1) {
                    nextIndex = itemCount;
                }
            } else {
                nextIndex++;
                if (nextIndex === itemCount) {
                    nextIndex = 0;
                }
            }

            item = items[nextIndex];

            if (nextIndex === startedAtIndex) {
                break;
            }
        }

        next = p.virtualListHelper.getItemElementAt(nextIndex);
        this._focus(event, next || null, nextIndex, false);

        if (!this.isVisible()) {
            this.triggerItemSelection(item, event);
        }
    }

    /** @internal */
    _hasScroll() {
        const p = this._p;
        const menuEl = p.menuEl;
        return menuEl.clientHeight < menuEl.scrollHeight;
    }

    /** @internal */
    _updateGroupStateForItem(item: InternalItem) {
        const p = this._p;

        if (!p.multi)
            return this;

        if (item._group) {
            // Now loop through children below the group

            let affectedCount = 0;

            if (p.autoCheckGroupChildren) {
                const items = p.filteredItems ?? p.items;
                let groupIndex = items.indexOf(item);
                const groupLevel = item._level;

                for (let i = groupIndex + 1, len = items.length; i < len; i++) {
                    let next = items[i];

                    // Hit the next group, break out
                    if ((!next._child && items[i - 1]._child) ||
                        (groupLevel === undefined ? next._group || next._level !== undefined : next._level <= groupLevel))
                        break;

                    // No change, skip
                    if (!!next._checked === item._checked)
                        continue;

                    // Update state
                    next._checked = item._checked;

                    affectedCount++;

                    // Update DOM
                    let nextEl = p.virtualListHelper.getItemElementAt(i);
                    if (nextEl) {
                        toggleClass(nextEl, `${p.baseClassName}__item_checked`, item._checked);
                    }

                    // Fire event
                    this._trigger('check', {
                        value: next.value,
                        item: next[ItemSymbol] ?? next,
                        checked: next._checked,
                        isGroup: next._group,
                        isCheckingGroup: true,
                    });
                }
            }

            // Fire event
            this._trigger('groupcheck', {
                value: item.value,
                item: item[ItemSymbol] ?? item,
                affectedCount: affectedCount,
            });
        } else if (p.groupCount > 0 && p.autoCheckGroupChildren) {
            const items = p.filteredItems ?? p.items;
            let itemIndex = items.indexOf(item);
            let groupIndex = -1;

            // Find the group index
            for (let i = itemIndex - 1; i >= 0; i--) {
                if (items[i]._group) {
                    groupIndex = i;
                    break;
                }
            }

            if (groupIndex > -1) {
                this._updateGroupCheckedState(groupIndex, true);
            }
        }

        return this;
    }

    /** @internal */
    _updateGroupCheckedState(groupIndex: number, fireEvents: boolean) {
        const p = this._p;

        if (!(p.multi && p.autoCheckGroupChildren && groupIndex > -1))
            return this;

        const items = p.filteredItems ?? p.items;
        let groupItem = items[groupIndex];

        if (!groupItem || !groupItem._group) return this;

        let next, hasChecked = false, hasUnchecked = false;

        const groupLevel = groupItem._level;

        for (let i = groupIndex + 1, len = items.length; i < len; i++) {
            next = items[i];

            // Hit the next group, break out
            if ((!next._child && items[i - 1]._child) ||
                (groupLevel === undefined ? next._group || next._level !== undefined : next._level <= groupLevel))
                break;

            if (next._checked) {
                hasChecked = true;
            } else if (!next._checked) {
                hasUnchecked = true;
            }
        }

        if (!hasChecked && !hasUnchecked) {
            // No items to check or uncheck, keep current state
            return this;
        }

        let shouldCheckGroup = hasChecked && !hasUnchecked;
        if (!!groupItem._checked !== shouldCheckGroup) {
            // Update state
            groupItem._checked = shouldCheckGroup;

            // Update DOM
            let nextEl = p.virtualListHelper.getItemElementAt(groupIndex);
            if (nextEl) {
                toggleClass(nextEl, `${p.baseClassName}__item_checked`, groupItem._checked);
            }

            if (fireEvents) {
                // Fire event
                this._trigger('check', {
                    value: groupItem.value,
                    item: groupItem[ItemSymbol] ?? groupItem,
                    checked: groupItem._checked,
                    isGroup: groupItem._group,
                    isCheckingGroup: false,
                });
            }
        }

        return this;
    }

    /**
     * @private
     * @returns {DropList} self
     * @internal
     */
    _measureItem() {
        const p = this._p;

        if (p.lastMeasureItemCount !== p.items.length) {
            let longestLabel = p.lastMeasureLongestLabel || 1,
                longestLabelText = p.lastMeasureLongestLabelText || '';

            for (let i = 0, items = p.items, count = items.length;
                 i < count;
                 i++) {

                const item = items[i];
                let text = item.label;
                if (text == null)
                    text = item.value;
                if (text == null)
                    text = '';

                let length = text.length;
                if (length > longestLabel) {
                    longestLabel = length;
                    longestLabelText = text;
                }
            }

            p.lastMeasureItemCount = p.items.length;
            p.lastMeasureLongestLabel = longestLabel;
            p.lastMeasureLongestLabelText = longestLabelText;
        }

        if (p.estimateWidth || p.virtualListHelper.isVirtual()) {
            p.virtualListHelper.createGhostItemElement(GhostSymbol, true, (itemEl: HTMLElement) => {
                let measureScroll = createElement('span', {
                    css: {
                        display: 'block',
                        width: '100px',
                        height: '100px',
                        overflow: 'scroll',
                        position: 'absolute',
                    },
                });
                let measureScrollParent = createElement('span', {
                    css: {
                        display: 'block',
                        position: 'relative',
                        width: '0',
                        height: '0',
                        overflow: 'hidden',
                    },
                }, [measureScroll]);
                itemEl.appendChild(measureScrollParent);
                let vertScrollBarWidth = measureScroll.offsetWidth - measureScroll.clientWidth;
                itemEl.removeChild(measureScrollParent);

                p.lastMeasureItemWidth = getElementWidth(itemEl, true, true) + vertScrollBarWidth;
            });
        }

        return this;
    }

    /**
     * Determines whether the list should be in virtual mode, depending on the item count.
     * @param {number?} targetItemCount - item count we are expecting. Defaults to current item count
     * @returns {DropList}
     * @private
     * @internal
     */
    _determineVirtualMode(targetItemCount?: number) {
        const p = this._p;

        const items = p.filteredItems ?? p.items;
        if (targetItemCount === undefined) {
            targetItemCount = items.length;
        }

        let shouldBeVirtual = targetItemCount >= p.virtualMinItems;

        if (shouldBeVirtual !== p.virtualListHelper.isVirtual()) {
            p.virtualListHelper.setVirtual(shouldBeVirtual).render();
        }

        return this;
    }

    /** @internal */
    _renderItemContent(item: InternalItem, itemEl: HTMLElement) {
        const p = this._p;

        // NOTE: a "measure" item will not have full data of original item.
        //      so for a custom renderer - we try to send original item, and fallback to our private list item.

        const originalItem = item[ItemSymbol];

        if (originalItem === NoResultsItemSymbol) {
            if (p.renderNoResultsItem && p.renderNoResultsItem(item, itemEl) !== false) {
                return true;
            }

            itemEl.appendChild(createElement('div', {
                class: 'droplist-no-results-content',
                textContent: p.noResultsText,
            }));
            return;
        }

        if (!p.renderItem || p.renderItem(originalItem || item, itemEl) === false) {
            itemEl.appendChild(createElement('span', {
                class: `${p.baseClassName}__item_label`,
                textContent: item.label,
            }));

            if (p.multi) {
                if (!item._nocheck) {
                    itemEl.insertBefore(
                        createElement('span', { class: 'checkbox' }),
                        itemEl.firstChild,
                    );
                }
            }
        }
    }

    /** @internal */
    _updateWidth(positionOptions?: PositionOptions): number {
        const p = this._p, el = p.el;

        let targetWidth = 0;

        if (positionOptions) {
            if (typeof positionOptions.updateWidth === 'number') {
                // Set from width specified
                targetWidth = positionOptions.updateWidth;
            } else if (positionOptions.targetWidth != null) {
                // Set from simulated target width
                targetWidth = positionOptions.targetWidth;
            } else {
                // Measure target
                targetWidth = getElementWidth(positionOptions.target, true, true);
            }
        }

        let autoWidth = 0;
        if (!p.useExactTargetWidth || !targetWidth) {
            if (p.estimateWidth || p.virtualListHelper.isVirtual()) {
                autoWidth = p.lastMeasureItemWidth;
            } else {
                el.style.width = ''; // Reset width
                autoWidth = getElementWidth(el, true, true);
            }
        }

        let newOuterWidth = Math.max(autoWidth, targetWidth);

        setElementWidth(el, newOuterWidth, true, true);

        const elComputedStyle = getComputedStyle(el);
        let extraElWidth = (parseFloat(elComputedStyle.borderLeftWidth) || 0) +
            (parseFloat(elComputedStyle.borderRightWidth) || 0)+
            (parseFloat(elComputedStyle.paddingLeft) || 0)+
            (parseFloat(elComputedStyle.paddingRight) || 0);
        let scrollWidth = el.scrollWidth + extraElWidth;
        if (scrollWidth > newOuterWidth) {
            // consider scrollWidth delta
            let delta = scrollWidth - newOuterWidth;
            el.style.width = `${parseFloat(el.style.width) + delta}px`;
            newOuterWidth = scrollWidth;
        }

        return newOuterWidth;
    }
}

export default DropList;
export { ItemSymbol };
