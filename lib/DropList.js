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
    VALUE_DOWN,
    VALUE_END,
    VALUE_ENTER, VALUE_ESCAPE,
    VALUE_HOME, VALUE_LEFT,
    VALUE_PAGE_DOWN,
    VALUE_PAGE_UP, VALUE_RIGHT,
    VALUE_SPACE,
    VALUE_UP,
} from 'keycode-js';
import mitt from 'mitt';

const ItemSymbol = Symbol('item');
const DestroyedSymbol = Symbol('destroyed');
const GhostSymbol = Symbol('ghost');

const hasOwnProperty = Object.prototype.hasOwnProperty;

/**
 * @typedef {Object} DropList.Options
 * @property {Element} [el] An element to attach to, instead of creating a new one
 * @property {string} [baseClassName='droplist'] class name for the menu root element
 * @property {string|string[]} [additionalClasses]
 * @property {'ltr'|'rtl'|'auto'} [direction='auto']
 * @property {boolean} [autoItemBlur=true] Should we automatically blur the focused item when the droplist loses focus?
 * @property {number} [autoItemBlurDelay=300] How long to wait before deciding to blur the focused item (when the droplist loses focus)?
 * @property {boolean} [capturesFocus=true] Should this DropList be added to the TAB-key stack?
 * @property {boolean} [multi=false] Does this DropList show checkboxes for multiple item selection?
 * @property {function} [keyDownHandler=null] An alternative "keydown" event handler. Return true to prevent default behaviour.
 * @property {boolean} [autoCheckGroupChildren=true] When a group is checked/unchecked - all items beneath it will update accordingly
 * @property {boolean} [useExactTargetWidth=false] Use the exact target's width, do not allow growing
 * @property {boolean} [constrainToWindow=true] Should the position be constrained to the window, attaching to window's borders if needed?
 * @property {Boolean} [autoFlipDirection=true] Should the position/anchor be flipped automatically when there's no space in the required direction?
 * @property {number} [estimatedItemHeight=20] An estimated row height, for approximating scroll height.
 * @property {boolean} [estimateWidth=false] Use an estimation for the width instead of measuring. May be faster - needs testing and may depend on the CSS.
 * @property {number} [virtualMinItems=100] Turns into a virtual list - with items being created and showing up on viewport only. The value specified the minimum item count where a virtual list will be created.
 * @property {string} [labelProp='label']
 * @property {string} [valueProp='value']
 * @property {function(item: DropList.ItemBase, itemEl: Element):(*|false)} [renderItem] Function to call when rendering an item element
 * @property {function(item: DropList.ItemBase, itemEl: Element)} [unrenderItem] Function to call when rendering an item element
 * @property {function(name: string, data: *)} [on]
 * */
/** */

/**
 * @typedef {Object} DropList.PositionAnchor
 * @property {'left'|'center'|'right'|'start'|'end'|string|number} x - horizontal anchor specification (could be either `'left'|'center'|'right'|'start'|'end'` or a percentage `'50%'` or a fixed decimal `Number`)
 * @property {'top'|'center'|'bottom'|string|number} y - vertical anchor specification (could be either `'top'|'center'|'bottom'` or a percentage `'50%'` or a fixed decimal `Number`)
 * */
/** */

/**
 * @typedef {Object} DropList.PositionOptions
 * @property {Element?} [target] Target element to act as anchor
 * @property {{left: number, top: number}?} [targetOffset] Override the offset of target. Automatically calculated if unspecified.
 * @property {number?} [targetHeight] Override height of the target
 * @property {number?} [targetWidth] Override width of the target
 * @property {DropList.PositionAnchor?} [position]
 * @property {DropList.PositionAnchor?} [anchor]
 * @property {boolean|number?} [updateWidth=false] `true` to set width of the menu according to `target`'s width, or specify an arbitrary number.
 * @property {string?} [targetRtl] Override for rtl mode of the target
 * @property {{x: number, y: number}} [offset=undefined] Extra rtl-aware offset to the target
 * */
/** */

/**
 * @typedef {Object} DropList.ItemBase
 * @property {string} [value]
 * @property {string} [label]
 * @property {boolean} [_group=false]
 * @property {boolean} [_child=false]
 * @property {boolean} [_nocheck=false]
 * @property {boolean} [_nointeraction=false]
 * @property {DropList.ItemBase[]} [_subitems]
 * */

/**
 * @typedef {DropList.ItemBase} DropList.Item
 * @property {boolean} [_checked=false]
 * */
/** */

/** @type {DropList.Options} */
let defaultOptions = {
    baseClassName: 'droplist',

    autoItemBlur: true,
    autoItemBlurDelay: 300,
    capturesFocus: true,
    multi: false,
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
'groupcheck' {value, item, affectedItems}: item was selected (in multi mode).
'show_subitems {value, item, el, droplist: DropList}': subitems dropdown will show.
'hide_subitems {value, item, el}': subitems dropdown did hide.
'subitems:select' {value, item, event?, el}: item was selected (in single mode).
 */

// noinspection JSUnusedGlobalSymbols
class DropList {

    /**
     * @param {DropList.Options} options
     */
    constructor(options) {
        const o = { ...defaultOptions };

        for (let [key, value] of Object.entries(/**@type Object*/options))
            if (value !== undefined)
                o[key] = value;

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
            on: o.on || null,
            silenceEvents: true,
            mitt: mitt(),

            focusItemIndex: -1,
            focusItemEl: null,

            sink: new DomEventsSink(),
        };

        let classes = [p.baseClassName];

        if (p.additionalClasses) {
            classes = classes.concat((p.additionalClasses + '').split(' ').filter(x => x));
        }

        const initialCss = {
            // make initial position not interfere with layout so it can be correctly calculated
            top: '-9999px',
        };

        let el = o.el;
        if (el instanceof Element) {
            p.elOriginalDisplay = el.style.display || '';
            el.classList.add(...classes);
            el.role = 'menu';
            setCssProps(/**@type ElementCSSInlineStyle*/el, initialCss);
            p.ownsEl = false;
        } else {
            el = createElement('ul', {
                class: classes.join(' '),
                role: 'menu',
                css: initialCss,
            });
        }

        p.el = el;

        p.items = [];

        p.groupCount = 0; // This will keep state of how many `group` items we have

        p.mouseHandled = false;

        p.virtualListHelper = new VirtualListHelper({
            list: p.el,
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
            onItemRender: (itemEl, index) => {
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
                    item = p.items[index];
                }

                if (!item) {
                    // eslint-disable-next-line no-console
                    console.warn('onItemRender called for (' + index + ') which has no item');
                }

                itemEl.className = `${p.baseClassName}__item`;

                const classList = itemEl.classList;

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
                }

                if (item._group)
                    classList.add(`${p.baseClassName}__item_group`);

                if (item._child)
                    classList.add(`${p.baseClassName}__item_child`);

                if (item._nointeraction)
                    classList.add(`${p.baseClassName}__item_nointeraction`);

                if (p.focusItemIndex === index) {
                    p.focusItemEl = itemEl;
                    classList.add(`${p.baseClassName}__item_focus`);
                }

                this._renderItemContent(item, itemEl);

                itemEl[ItemSymbol] = item;
            },
        });

        if (typeof p.unrenderItem === 'function') {
            const fn = p.unrenderItem;
            p.virtualListHelper.setOnItemUnrender(el => {
                try {
                    fn(el[ItemSymbol][ItemSymbol], el);
                } catch (err) {
                    console.error(err); // eslint-disable-line no-console
                }
                delete el[ItemSymbol];

                if (p.focusItemEl === el)
                    p.focusItemEl = null;
            });
        } else {
            p.virtualListHelper.setOnItemUnrender(el => {
                delete el[ItemSymbol];

                if (p.focusItemEl === el)
                    p.focusItemEl = null;
            });
        }

        if (p.capturesFocus) {
            el.tabIndex = 0;
        }

        this._hookMouseEvents();
        this._hookTouchEvents();
        this._hookFocusEvents();
        this._hookKeyEvents();

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

        if (p.el) {
            remove(p.el);
        }

        if (p.currentSubDropList) {
            p.currentSubDropList?.droplist?.destroy();
            p.currentSubDropList = null;
        }

        if (!p.ownsEl) {
            for (let name of Array.from(p.el.classList)) {
                if (name.startsWith(p.baseClassName)) {
                    p.el.classList.remove(name);
                }
            }
            p.el.removeAttribute('role');
            for (let key of ['position', 'left', 'top', 'right', 'bottom', 'z-index']) {
                p.el.style[key] = '';
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

        this._p = null;
    }

    get el() {
        return this._p.el;
    }

    /**
     * Returns true if other is an inclusive descendant of node, and false otherwise.
     * @param {Node} other
     * @param {boolean} [considerSubmenus=true]
     * @returns {boolean}
     */
    elContains(other, considerSubmenus = true) {
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
    setAdditionalClasses(classes) {
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
    setDirection(direction) {
        const p = this._p;
        p.direction = direction === 'ltr' ? 'ltr' : direction === 'rtl' ? 'rtl' : 'auto';
        this._syncBaseClasses();
        return this;
    }

    /**
     * Gets the supplied direction for the droplist
     * @return {'ltr'|'rtl'|'auto'}
     */
    getDirection() {
        const p = this._p;
        return p.direction;
    }

    /**
     * @param {string} prop
     * @returns {DropList}
     */
    setLabelProp(prop) {
        const p = this._p;
        p.labelProp = prop;
        return this;
    }

    /**
     *
     * @property {function(item: DropList.ItemBase, itemEl: Element):(*|false)} [fn] Function to call when rendering an item element
     * @returns {DropList}
     */
    setRenderItem(fn) {
        const p = this._p;
        p.renderItem = fn;
        return this;
    }

    /**
     *
     * @property {function(item: DropList.ItemBase, itemEl: Element)} [fn] Function to call when rendering an item element
     * @returns {DropList}
     */
    setUnrenderItem(fn) {
        const p = this._p;

        p.unrenderItem = fn;

        if (typeof p.unrenderItem === 'function') {
            const fn = p.unrenderItem;
            p.virtualListHelper.setOnItemUnrender(el => {
                try {
                    fn(el[ItemSymbol][ItemSymbol], el);
                } catch (err) {
                    console.error(err); // eslint-disable-line no-console
                }
                delete el[ItemSymbol];

                if (p.focusItemEl === el)
                    p.focusItemEl = null;
            });
        } else {
            p.virtualListHelper.setOnItemUnrender(el => {
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
    setValueProp(prop) {
        const p = this._p;
        p.valueProp = prop;
        return this;
    }

    _syncBaseClasses() {
        const p = this._p, el = p.el;

        if (!el)
            return;

        let classes = [p.baseClassName];

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

        const item = p.items[p.focusItemIndex];
        p.focusItemIndex = -1;

        if (!item)
            return;

        if (p.currentSubDropList) {
            this._hideSublist();
        }

        this._trigger('itemblur', { value: item.value, item: item[ItemSymbol] ?? item });
    }

    nextPage(event) {
        this._move('next_page', event);
    }

    previousPage(event) {
        this._move('prev_page', event);
    }

    goToFirst(event) {
        this._move('first', event);
    }

    goToLast(event) {
        this._move('last', event);
    }

    toggleFocusedItem() {
        const p = this._p;

        if (this.hasFocusedItem() && p.multi) {
            let item = p.items[p.focusItemIndex];
            if (item._nocheck || item._nointeraction) return this;

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

    triggerItemSelection(item, event) {
        const p = this._p;

        p.focusItemEl = p.focusItemEl || closestUntil(event.target, 'li', p.el);
        p.focusItemIndex = p.virtualListHelper.getItemIndexFromElement(p.focusItemEl);
        if (p.focusItemIndex === undefined)
            p.focusItemIndex = -1;

        item = item ?? p.focusItemEl[ItemSymbol];
        if (item._nointeraction) {
            return false;
        }

        if (!p.multi) {
            this._setSingleSelectedItemEl(p.focusItemEl);
        }

        this._trigger('select', {
            value: item ? item.value : undefined,
            item: item[ItemSymbol] ?? item,
            event: event,
            el: p.focusItemEl,
        });

        return true;
    }

    /**
     *
     * @param {DropList.Item} item The item to add. It is copied.
     * @param {number} [atIndex=-1] The index to insert at (or -1)
     * @returns {DropList}
     */
    addItem(item, atIndex = -1) {
        return this.addItems([item], atIndex);
    }

    /**
     * Adds items to the menu and renders
     * @param {DropList.Item[]} itemsToAdd The items to add. These are copied.
     * @param {number} [atIndex=-1] The index to insert at (or -1)
     * @returns {DropList}
     */
    addItems(itemsToAdd, atIndex = -1) {
        const p = this._p, labelProp = p.labelProp, valueProp = p.valueProp;

        let isMulti = p.multi;
        let items = p.items;

        if (atIndex == null || atIndex < 0 || atIndex >= p.items.length) {
            atIndex = -1;
        }

        // Determine if the list is virtual or not
        this._determineVirtualMode(items.length + itemsToAdd.length);

        for (let i = 0, count = itemsToAdd.length; i < count; i++) {
            let oitem = itemsToAdd[i];
            //noinspection PointlessBooleanExpressionJS
            let item = {
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

        p.virtualListHelper
            .addItemsAt(itemsToAdd.length, atIndex === -1 ? atIndex : (atIndex - itemsToAdd.length))
            .render();

        return this;
    }

    /**
     * Replaces all current items with the supplied items
     * @param {DropList.Item[]} items The items to set. These are copied.
     * @returns {DropList}
     */
    setItems(items) {
        const p = this._p;

        p.items.length = 0;
        p.groupCount = 0;

        p.virtualListHelper.setCount(0);

        return this.addItems(items);
    }

    updateItemByValue(value, newItem) {
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
            item._subitems = !!newItem._subitems;

        if (p.multi) {
            if (hasOwnProperty.call(newItem, '_checked'))
                item._checked = !!newItem._checked;
        }

        if (hasOwnProperty.call(newItem, '_group')) {
            if (!!newItem._group !== item._group) {
                if (item._group)
                    p.groupCount--;
                else p.groupCount++;

                newItem._group = !!item._group;
            }
        }

        if (hasOwnProperty.call(newItem, '_child'))
            item._child = !!newItem._child;

        if (p.virtualListHelper.isItemRendered(itemIndex)) {
            p.virtualListHelper
                .refreshItemAt(itemIndex)
                .render();
        }

        return this;
    }

    removeItem(value, label) {
        const p = this._p;

        // Look for the proper item
        let itemIndex = this.itemIndexByValueOrLabel(value, label);
        if (itemIndex === -1) return this;

        let spliced = p.items.splice(itemIndex, 1);
        if (spliced[0]._group) {
            p.groupCount--;
        }

        p.virtualListHelper
            .removeItemsAt(itemIndex, 1)
            .render();

        return this;
    }

    removeAllItems() {
        const p = this._p;

        p.items.length = 0;
        p.groupCount = 0;

        p.virtualListHelper
            .setCount(0)
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

    itemDataByValue(value) {
        const p = this._p;

        for (let i = 0, count = p.items.length; i < count; i++) {
            let item = p.items[i];
            if (item.value === value) {
                return item[ItemSymbol];
            }
        }

        return null;
    }

    itemIndexByValue(value) {
        const p = this._p;

        for (let i = 0, count = p.items.length; i < count; i++) {
            let item = p.items[i];
            if (item.value === value) {
                return i;
            }
        }

        return -1;
    }

    itemIndexByValueOrLabel(value, label) {
        const p = this._p;

        for (let i = 0, count = p.items.length; i < count; i++) {
            let item = p.items[i];
            if (item.value === value || item.label === label) {
                return i;
            }
        }

        return -1;
    }

    items() {
        return this._p.items.map(x => x[ItemSymbol]);
    }

    itemsReference() {
        return this._p.items;
    }

    itemCount() {
        return this._p.items.length;
    }

    itemAtIndex(index) {
        return this._p.items[index]?.[ItemSymbol];
    }

    /**
     *
     * @param {DropList.PositionOptions} positionOptions
     * @returns {DropList}
     * @public
     */
    relayout(positionOptions) {
        const p = this._p, el = p.el;

        if (!this.isVisible()) return this;

        let w = window;

        let targetBox = {};

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

        let viewport = {};
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
            p.virtualListHelper.render();
        }

        // Now set the width of the dropdown
        if (positionOptions.updateWidth || typeof positionOptions.updateWidth === 'number') {
            this._updateWidth(positionOptions);
        }

        // How much space is there above, and how much below?
        let roomAbove = targetBox.top - viewport.top;
        let roomBelow = viewport.bottom - targetBox.bottom;

        // Calculate height for dropdown

        let maxViewHeight;

        const elComputedStyle = getComputedStyle(el);

        let isBoxing = elComputedStyle.boxSizing === 'border-box';
        let verticalPadding = (parseFloat(elComputedStyle.paddingTop) || 0) +
            (parseFloat(elComputedStyle.paddingBottom) || 0);
        let verticalBorderWidth = (parseFloat(elComputedStyle.borderTopWidth) || 0) +
            (parseFloat(elComputedStyle.borderBottomWidth) || 0);

        if (p.virtualListHelper.isVirtual()) {
            maxViewHeight =
                p.virtualListHelper.estimateFullHeight() +
                verticalPadding +
                verticalBorderWidth;
        } else {
            // Another method to calculate height is measuring the whole thing at once.
            // This causes relayout of course.
            el.style.height = '';
            el.style.top = '-9999px';

            maxViewHeight = Math.max(getElementHeight(p.el), el.scrollHeight);
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
                (document.documentElement || document.body.parentNode || document.body).scrollLeft;
        scrollLeft = Math.abs(scrollLeft);
        if (isRtlDocument) {
            scrollLeft = document.documentElement.scrollWidth - scrollLeft - document.documentElement.clientWidth;
        }

        let minX = scrollLeft,
            maxX = document.documentElement.clientWidth + scrollLeft - viewSize.width;

        let viewCss = {
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
    setItemChecked(value, checked) {
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
    setCheckedValues(values) {
        const p = this._p;

        let groupIndexes = [];

        for (let i = 0, count = p.items.length; i < count; i++) {
            let item = p.items[i];
            let checked = !item._nocheck && values.indexOf(item.value) !== -1;

            if (item._group) {
                groupIndexes.push(i);
            }

            if (item._checked === checked) continue;

            item._checked = checked;

            let li = p.virtualListHelper.getItemElementAt(i);
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
    getCheckedValues(excludeGroups) {
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
    getCheckedItems(excludeGroups) {
        const p = this._p;

        excludeGroups = excludeGroups && p.groupCount > 0;

        let items = [];

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
     * @param {DropList.PositionOptions?} positionOptions
     * @returns {DropList}
     * @public
     */
    show(positionOptions) {
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
                    if (!p.el.contains(event.target))
                        this._delayBlurItemOnBlur();
                });
            }
        });

        const el = p.el;
        el.style.position = 'absolute';
        el.classList.remove(`${p.baseClassName}__is-hiding`);
        document.body.appendChild(el);

        p.visible = true;

        p.el.style.display = '';
        if (getComputedStyle(p.el).display === 'none')
            p.el.style.display = 'block';

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

    hide() {
        const p = this._p, el = p.el;

        if (p.onDocumentMouseDown) {
            p.sink.remove(document, 'mousedown', p.onDocumentMouseDown);
            p.onDocumentMouseDown = null;
        }

        if (this.isVisible()) {
            this._trigger('hide:before');

            p.hiding = true;

            if (el) {

                el.classList.add(`${p.baseClassName}__is-hiding`);

                // support for hide transition in css
                const maxTransitionDuration = parseTransition(getComputedStyle(p.el).transition)
                    .reduce((p, v) => Math.max(p, v.delay + v.duration), 0);

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

    hasFocusedItem() {
        return this._p.focusItemIndex > -1;
    }

    getFocusedItemIndex() {
        if (!this.hasFocusedItem())
            return -1;
        return this._p.focusItemIndex;
    }

    setFocusedItemAtIndex(itemIndex) {
        const p = this._p;

        p.focusItemIndex = itemIndex;

        let item = null;
        if (itemIndex > -1)
            item = p.items[itemIndex];
        if (item && item._nointeraction)
            item = null;
        if (itemIndex > -1) {
            this.scrollItemIndexIntoView(itemIndex);
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

    _showSublist(item, itemElement) {
        if (!item._subitems?.length) return;

        const p = this._p;

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
            labelProp: p.labelProp,
            valueProp: p.valueProp,
            renderItem: p.renderItem,
            unrenderItem: p.unrenderItem,
        });

        droplist
            .on('select', event => {
                this._trigger('subitems:select', event);
            })
            .on('subitems:select', event => {
                this._trigger('subitems:select', event);
            })
            .on('_back_key_pressed', () => {
                this._hideSublist();

                if (!this[DestroyedSymbol])
                    this.el.focus();
            });

        droplist.setItems(item._subitems);

        this._trigger('show_subitems', {
            value: item.value,
            item: item[ItemSymbol] ?? item,
            el: itemElement,
            droplist: droplist,
        });

        droplist.show( {
            target: itemElement,
            position: { x: 'start', y: 'top' },
            anchor: { x: 'end', y: 'top' },
            offset: { x: 0, y: 0 },
            updateWidth: false,
        });

        p.currentSubDropList = {
            item: item,
            itemElement: itemElement,
            droplist: droplist,
        };

        droplist.el.focus();
    }

    _hideSublist() {
        const p = this._p;

        if (!p.currentSubDropList)
            return;

        const data = p.currentSubDropList;
        data.droplist.hide();
        data.droplist.destroy();
        p.currentSubDropList = null;

        this._trigger('hide_subitems', {
            value: data.item.value,
            item: data.item,
            el: data.itemElement,
        });
    }

    setFocusedItem(item) {
        const p = this._p;

        let itemIndex = item._nointeraction ? -1 : this._getItemIndex(item);

        if (itemIndex > -1 && p.items[itemIndex]._nointeraction)
            itemIndex = -1;

        return this.setFocusedItemAtIndex(itemIndex);
    }

    setFocusedItemByValue(value) {
        return this.setFocusedItemAtIndex(this.itemIndexByValue(value));
    }

    setSingleSelectedItemAtIndex(itemIndex) {
        const p = this._p;

        let itemEl = null;

        if (itemIndex > -1 && !p.items[itemIndex]._nointeraction) {
            itemEl = p.virtualListHelper.getItemElementAt(itemIndex);
        }

        this._setSingleSelectedItemEl(itemEl);

        return this;
    }

    setSingleSelectedItem(item) {
        const p = this._p;

        let itemIndex = item._nointeraction ? -1 : this._getItemIndex(item);

        if (itemIndex > -1 && p.items[itemIndex]._nointeraction)
            itemIndex = -1;

        return this.setSingleSelectedItemAtIndex(itemIndex);
    }

    setSingleSelectedItemByValue(value) {
        return this.setSingleSelectedItemAtIndex(this.itemIndexByValue(value));
    }

    next(event) {
        this._move('next', event);
    }

    previous(event) {
        this._move('prev', event);
    }

    isFirstItem() {
        const p = this._p;
        return p.focusItemIndex === 0 && p.focusItemIndex < p.items.length;
    }

    isLastItem() {
        const p = this._p;
        return p.focusItemIndex > -1 && p.focusItemIndex === p.items.length - 1;
    }

    scrollItemIndexIntoView(itemIndex) {
        const p = this._p;

        if (this._hasScroll()) {
            const el = p.el, scrollTop = el.scrollTop;

            let itemPos, previousPos = -1;
            let maxIterations = 30; // Some zoom/scroll issues can make it so that it takes almost forever

            // eslint-disable-next-line no-constant-condition
            while (maxIterations-- > 0) {
                itemPos = p.virtualListHelper.getItemPosition(itemIndex);

                if (itemPos === previousPos)
                    break;

                previousPos = itemPos;

                let itemSize = p.virtualListHelper.getItemSize(itemIndex);

                let listHeight = el.clientHeight;

                if (itemPos < scrollTop) {
                    el.scrollTop = itemPos;
                } else if (itemPos + itemSize > scrollTop + listHeight) {
                    el.scrollTop = itemPos + itemSize - listHeight;
                }

                // force update items, until the positions and sizes are final
                p.virtualListHelper.render();
            }
        }

        return this;
    }

    /**
     * Register an event handler
     * @param {(string|'*')?} event
     * @param {function(any)} handler
     * @returns {DropList}
     */
    on(/**string|'*'*/event, /**Function?*/handler) {
        this._p.mitt.on(event, handler);
        return this;
    }

    /**
     * Register a one time event handler
     * @param {(string|'*')?} event
     * @param {function(any)} handler
     * @returns {DropList}
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
     * @returns {DropList}
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
     * @returns {DropList}
     */
    emit(/**string|'*'*/event, /**any?*/value) {
        this._p.mitt.emit(event, value);
        return this;
    }

    _getItemIndex(item) {
        const p = this._p;

        let itemIndex = -1;

        if (item) {
            itemIndex = p.items.indexOf(item);
            if (itemIndex === -1) {
                let value = (item && item.value !== undefined) ? item.value : item;
                let label = (item && item.label) ? item.label : value;
                itemIndex = this.itemIndexByValueOrLabel(value, label);
            }
        }

        return itemIndex;
    }

    _setSingleSelectedItemEl(itemEl) {
        const p = this._p;

        if (p.singleSelectedItemEl) {
            p.singleSelectedItemEl.classList.remove(`${p.baseClassName}__item_checked`);
            p.singleSelectedItemEl = null;
        }

        if (itemEl) {
            itemEl.classList.add(`${p.baseClassName}__item_checked`);
            p.singleSelectedItemEl = itemEl;
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
        if (p.on)
            p.on(event, ...(data === undefined ? [] : [data]));
        p.mitt.emit(event, data);
    }

    _itemUpAction(event, itemEl) {
        if (closestUntil(event.target, '.requires-pointer-events,button', itemEl)) return;

        let p = this._p;

        if (!this._mouseHandled) {

            this.triggerItemSelection(null, event);

            // If we are destroyed in response to a click/select, cease all actions
            if (this[DestroyedSymbol])
                return;

            this.toggleFocusedItem();

            if (document.activeElement !== this.el && p.focusItemEl) {
                clearTimeout(p.blurTimer);
            }

            setTimeout(() => {
                this._mouseHandled = false;
            }, 0);
        }
    }

    _hookMouseEvents() {
        const p = this._p;

        p.sink
            .add(p.el, 'mouseup', (event) => {
                const li = closestUntil(event.target, 'li', event.currentTarget);
                if (!li) return;

                if (event.button !== 0) return;

                this._itemUpAction(event, li);
            })
            .add(p.el, 'mouseover', (event) => {
                const li = closestUntil(event.target, 'li', event.currentTarget);
                if (!li) return;

                this._handleMouseOver(event, li);
            });
    }

    _handleMouseOver(event, itemEl) {
        this._focus(event, itemEl, null, true);
    }

    _hookTouchEvents() {
        const p = this._p;

        let currentTouchId;

        p.sink.add(p.el, 'touchstart', (event) => {
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

            p.sink.add(p.el, 'touchend.dropdown_touchextra', (event) => {
                const li = closestUntil(event.target, 'li', event.currentTarget);
                if (!li) return onTouchCancel();

                let touch = Array.prototype.find.call(event.changedTouches, (touch) => {
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

    _hookFocusEvents() {
        const p = this._p;

        p.sink
            .add(p.el, 'focus', event => {
                let itemEl = p.focusItemEl || // focused item
                    p.el.firstChild; // or the first item

                this._focus(event, itemEl, null, false);
            })
            .add(p.el, 'blur', () => {
                setTimeout(() => {
                    if (this[DestroyedSymbol]) return;

                    if (!p.el.contains(document.activeElement)) {
                        this._delayBlurItemOnBlur();
                    }
                });
            });
    }

    _hookKeyEvents() {
        const p = this._p;

        p.sink.add(p.el, 'keydown', evt => this._keydown(evt));
    }

    _keydown(event) {
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
                if (event.key === VALUE_RIGHT && getComputedStyle(event.target).direction !== 'rtl' ||
                    event.key === VALUE_LEFT && getComputedStyle(event.target).direction === 'rtl') {
                    let item = p.items[p.focusItemIndex];
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
                this.triggerItemSelection(null, event);
                event.preventDefault();
                break;

            case VALUE_SPACE:
                this.toggleFocusedItem();
                event.preventDefault();
                break;

            case VALUE_ESCAPE:
                event.preventDefault();
                this.hide();
                break;

            default: {
                if (event.type === 'keydown') return;
                this._keydownFreeType(event);
                preventDefault = false;
            }
        }
    }

    _keydownFreeType(evt) {
        const p = this._p;

        // noinspection JSDeprecatedSymbols
        let character = evt.key || String.fromCharCode(evt.keyCode);
        if (character.length !== 1) return;

        clearTimeout(p.filterTimer);

        // Accumulate text to find from keystrokes
        let keyword = (p.previousFilter || '') + character;

        let regex = new RegExp(`^${escapeRegex(keyword)}`, 'i');

        let matchIndex = -1;
        let item;

        let focusItemIndex = p.focusItemIndex;

        // These are all the possible matches for the text typed in so far
        for (let i = 0, count = p.items.length; i < count; i++) {
            if (matchIndex !== -1 && i < focusItemIndex)
                continue; // We are only interested in first match + match after the focused item

            item = p.items[i];
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

            for (let i = 0, count = p.items.length; i < count; i++) {
                if (matchIndex !== -1 && i < focusItemIndex)
                    continue; // We are only interested in first match + match after the focused item

                item = p.items[i];
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

            if (!this.isVisible()) {
                this.triggerItemSelection(next ? null : p.items[matchIndex], evt);
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

    _focus(event, itemEl, itemIndex, openSubitems) {
        const p = this._p;

        if (!itemIndex && itemEl) {
            itemIndex = p.virtualListHelper.getItemIndexFromElement(itemEl);
        }

        if (itemIndex > -1) {
            this.scrollItemIndexIntoView(itemIndex);
        } else if (itemIndex === undefined) {
            itemEl = null;
        }

        let focusItemEl = itemEl || p.virtualListHelper.getItemElementAt(itemIndex);
        if (!focusItemEl || focusItemEl[ItemSymbol]._nointeraction) {
            this.blurFocusedItem();
            return;
        }

        if (focusItemEl === p.focusItemEl) {
            clearTimeout(p.blurTimer);
            return;
        }

        this.blurFocusedItem();

        focusItemEl.classList.add(`${p.baseClassName}__item_focus`);
        p.focusItemEl = focusItemEl;
        p.focusItemIndex = itemIndex;

        const item = p.items[itemIndex];
        this._trigger('itemfocus', {
            value: item.value,
            item: item[ItemSymbol] ?? item,
            event: event,
            el: focusItemEl,
        });

        if (openSubitems)
            this._showSublist(item, focusItemEl);
    }

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

    _move(direction, event) {
        const p = this._p;

        let next, nextIndex, directionUp = false;

        if (direction === 'first') {
            nextIndex = 0;
            directionUp = false;
        } else if (direction === 'last') {
            nextIndex = p.items.length - 1;
            directionUp = true;
        } else if (direction === 'prev') {
            if (!this.hasFocusedItem())
                return this._move('last', event);

            nextIndex = p.focusItemIndex - 1;
            if (nextIndex === -1) {
                nextIndex = p.items.length - 1;
            }

            directionUp = true;
        } else if (direction === 'next') {
            if (!this.hasFocusedItem())
                return this._move('first', event);

            nextIndex = p.focusItemIndex + 1;
            if (nextIndex === p.items.length) {
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
                    } else if (nextIndex >= p.items.length) {
                        nextIndex = p.items.length;
                    }
                } else if (p.focusItemEl) {
                    let base = getElementOffset(p.focusItemEl).top;
                    let height = getElementHeight(p.el, true);

                    while (true) { // eslint-disable-line no-constant-condition
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

        let itemCount = p.items.length;

        if (nextIndex >= itemCount) {
            return;
        }

        let item = p.items[nextIndex];
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

            item = p.items[nextIndex];

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

    _hasScroll() {
        return this.el.clientHeight < this.el.scrollHeight;
    }

    _updateGroupStateForItem(item) {
        const p = this._p;

        if (!p.multi)
            return this;

        if (item._group) {
            // Now loop through children below the group

            let affectedItems = 0;

            if (p.autoCheckGroupChildren) {
                let items = p.items;
                let groupIndex = items.indexOf(item);

                for (let i = groupIndex + 1, len = items.length; i < len; i++) {
                    let next = items[i];

                    // Hit the next group, break out
                    if (next._group || (!next._child && items[i - 1]._child))
                        break;

                    // No change, skip
                    if (!!next._checked === item._checked)
                        continue;

                    // Update state
                    next._checked = item._checked;

                    affectedItems++;

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
                affectedItems: affectedItems,
            });
        } else if (p.groupCount > 0 && p.autoCheckGroupChildren) {
            let items = p.items;
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

    _updateGroupCheckedState(groupIndex, fireEvents) {
        const p = this._p;

        if (!(p.multi && p.autoCheckGroupChildren && groupIndex > -1))
            return this;

        let items = p.items;
        let groupItem = items[groupIndex];

        if (!groupItem || !groupItem._group) return this;

        let item, hasChecked = false, hasUnchecked = false;

        for (let i = groupIndex + 1, len = items.length; i < len; i++) {
            item = items[i];

            // Hit the next group, break out
            if (item._group || (!item._child && items[i - 1]._child))
                break;

            if (item._checked) {
                hasChecked = true;
            } else if (!item._checked) {
                hasUnchecked = true;
            }
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
            p.virtualListHelper.createGhostItemElement(GhostSymbol, true, itemEl => {
                p.lastMeasureItemWidth = getElementWidth(itemEl, true, true);
            });
        }

        return this;
    }

    /**
     * Determines whether the list should be in virtual mode, depending on the item count.
     * @param {number?} targetItemCount - item count we are expecting. Defaults to current item count
     * @returns {DropList}
     * @private
     */
    _determineVirtualMode(targetItemCount) {
        const p = this._p;

        let items = p.items;
        if (targetItemCount === undefined) {
            targetItemCount = items.length;
        }

        let shouldBeVirtual = targetItemCount >= p.virtualMinItems;

        if (shouldBeVirtual !== p.virtualListHelper.isVirtual()) {
            p.virtualListHelper.setVirtual(shouldBeVirtual).render();
        }

        return this;
    }

    _renderItemContent(item, itemEl) {
        const p = this._p;

        // NOTE: a "measure" item will not have full data of original item.
        //      so for a custom renderer - we try to send original item, and fallback to our private list item.

        if (!p.renderItem || p.renderItem(item[ItemSymbol] || item, itemEl) === false) {
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

    /**
     *
     * @param {DropList.PositionOptions} [positionOptions=undefined]
     * @returns {number} new outer width
     * @private
     */
    _updateWidth(positionOptions) {
        const p = this._p, el = p.el;

        let targetWidth = 0;

        if (positionOptions) {
            if (typeof positionOptions.updateWidth === 'number') {
                // Set from width specified
                targetWidth = positionOptions.updateWidth;
            } else if (positionOptions.targetWidth != null) {
                // Set from simulated target width
                targetWidth = positionOptions.updateWidth;
            } else {
                // Measure target
                targetWidth = getElementWidth(positionOptions.target, true, true);
            }
        }

        let autoWidth = 0;
        if (!p.useExactTargetWidth) {
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
        let bordersWidth = (parseFloat(elComputedStyle.borderLeftWidth) || 0) + (parseFloat(elComputedStyle.borderRightWidth) || 0);
        let scrollWidth = el.scrollWidth + bordersWidth;
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
