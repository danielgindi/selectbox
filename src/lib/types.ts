import type DropList from './DropList.js';
import type { LibraryErrorHandler } from './utils/reportError.js';

export type { LibraryErrorContext, LibraryErrorHandler } from './utils/reportError.js';

/**
 * Horizontal/vertical anchor specification used for positioning the DropList relative to a target.
 */
export interface PositionAnchor {
    /** horizontal anchor specification (could be either `'left'|'center'|'right'|'start'|'end'` or a percentage `'50%'` or a fixed decimal `Number`) */
    x: 'left' | 'center' | 'right' | 'start' | 'end' | string | number;
    /** vertical anchor specification (could be either `'top'|'center'|'bottom'` or a percentage `'50%'` or a fixed decimal `Number`) */
    y: 'top' | 'center' | 'bottom' | string | number;
}

export interface PositionOptions {
    /** Target element to act as anchor */
    target?: Element | null;
    /** Override the offset of target. Automatically calculated if unspecified. */
    targetOffset?: { left: number, top: number } | null;
    /** Override height of the target */
    targetHeight?: number | null;
    /** Override width of the target */
    targetWidth?: number | null;
    position?: PositionAnchor | null;
    anchor?: PositionAnchor | null;
    /** `true` to set width of the menu according to `target`'s width, or specify an arbitrary number. */
    updateWidth?: boolean | number;
    /** Override for rtl mode of the target */
    targetRtl?: boolean | null;
    /** Extra rtl-aware offset to the target */
    offset?: { x: number, y: number };
}

export interface ItemBase {
    value?: any;
    label?: string;
    _group?: boolean;
    _child?: boolean;
    _nocheck?: boolean;
    _nointeraction?: boolean;
    _subitems?: ItemBase[];
    /** allows any other free-form fields on the source item data */
    [key: string]: any;
}

export interface Item extends ItemBase {
    _checked?: boolean;
}

export interface DropListOptions {
    /** An element to attach to, instead of creating a new one */
    el?: HTMLElement;
    /** class name for the menu root element (default: 'droplist') */
    baseClassName?: string;
    additionalClasses?: string | string[];
    /** default: 'auto' */
    direction?: 'ltr' | 'rtl' | 'auto';
    /** Should we automatically blur the focused item when the droplist loses focus? (default: true) */
    autoItemBlur?: boolean;
    /** How long to wait before deciding to blur the focused item (when the droplist loses focus)? (default: 300) */
    autoItemBlurDelay?: number;
    /** Should this DropList be added to the TAB-key stack? (default: true) */
    capturesFocus?: boolean;
    /** Does this DropList show checkboxes for multiple item selection? (default: false) */
    multi?: boolean;
    /** Current selected value when using single selection. */
    singleSelectedValue?: any;
    /** An alternative "keydown" event handler. Return true to prevent default behaviour. (default: null) */
    keyDownHandler?: ((event: KeyboardEvent) => (boolean | void)) | null;
    /** When a group is checked/unchecked - all items beneath it will update accordingly (default: true) */
    autoCheckGroupChildren?: boolean;
    /** Use the exact target's width, do not allow growing (default: false) */
    useExactTargetWidth?: boolean;
    /** Should the position be constrained to the window, attaching to window's borders if needed? (default: true) */
    constrainToWindow?: boolean;
    /** Should the position/anchor be flipped automatically when there's no space in the required direction? (default: true) */
    autoFlipDirection?: boolean;
    /** An estimated row height, for approximating scroll height. (default: 20) */
    estimatedItemHeight?: number;
    /** Use an estimation for the width instead of measuring. May be faster - needs testing and may depend on the CSS. (default: false) */
    estimateWidth?: boolean;
    /** Turns into a virtual list - with items being created and showing up on viewport only. The value specified the minimum item count where a virtual list will be created. (default: 100) */
    virtualMinItems?: number;
    /** default: 'label' */
    labelProp?: string;
    /** default: 'value' */
    valueProp?: string;
    /** Function to call when rendering an item element */
    renderItem?: (item: ItemBase, itemEl: Element) => (any | false);
    /** Function to call when rendering an item element */
    unrenderItem?: (item: ItemBase, itemEl: Element) => void;
    renderNoResultsItem?: (item: ItemBase, itemEl: Element) => (any | false);
    unrenderNoResultsItem?: (item: ItemBase, itemEl: Element) => void;
    on?: (name: string, data?: any) => void;
    /** show header element (default: false) */
    isHeaderVisible?: boolean;
    /** show footer element (default: false) */
    isFooterVisible?: boolean;
    /** include inline search box (default: false) */
    searchable?: boolean;
    /** placeholder text for the inline search box (default: '') */
    searchPlaceholder?: string;
    /** text for no results (empty for none) (default: 'No matching results') */
    noResultsText?: string;
    /** throttle time (milliseconds) for filtering (default: 300) */
    filterThrottleWindow?: number;
    /** call the filter function on empty search term too (default: false) */
    filterOnEmptyTerm?: boolean;
    /** should groups be filtered? (default: false) */
    filterGroups?: boolean;
    /** should empty groups be filtered out? (default: false) */
    filterEmptyGroups?: boolean;
    filterFn?: (items: ItemBase[], term: string) => (ItemBase[] | null);
    positionOptionsProvider?: (dropList?: DropList) => PositionOptions;
    /** Intercept internal errors/warnings (e.g. from a throwing `renderItem`/`unrenderItem`) instead of the default `console.error`/`console.warn`. */
    onError?: LibraryErrorHandler;
}

export interface SelectBoxOptions {
    /** options to pass to the `DropList` */
    listOptions?: DropListOptions;
    /** An element to attach to, instead of creating a new one */
    el?: HTMLElement;
    /** class name for the menu root element (default: 'selectbox') */
    baseClassName?: string;
    additionalClasses?: string | string[];
    /** default: 'auto' */
    direction?: 'ltr' | 'rtl' | 'auto';
    /** Should start as disabled? (default: false) */
    disabled?: boolean;
    /** Should start as readOnly? (default: false) */
    readOnly?: boolean;
    /** Has clear button? (default: true) */
    clearable?: boolean;
    /** has open/close indicator? (default: true) */
    hasOpenIndicator?: boolean;
    /** Placeholder text (default: '') */
    placeholder?: string;
    /** Should the selected items be sorted? (default: true) */
    sortSelectedItems?: boolean;
    /** Sort list items (default: false) */
    sortListItems?: boolean;
    /** When sorting - put checked items first (applicable to `multi` mode only) (default: true) */
    sortListCheckedFirst?: boolean;
    /** Treat group items as normal items (default: false) */
    treatGroupSelectionAsItems?: boolean;
    stickyValues?: any[];
    sortItemComparator?: (a: ItemBase, b: ItemBase) => number;
    /** Split groups to "checked" and "unchecked", works with `sortListCheckedFirst` only (default: true) */
    splitListCheckedGroups?: boolean;
    /** default: 'touch' */
    blurOnSingleSelection?: boolean | 'touch';
    /** can multiple values be selected? (default: false) */
    multi?: boolean;
    /** show selection? if false, the placeholder will take effect (default: true) */
    showSelection?: boolean;
    /** show placeholder in title attribute (default: false) */
    showPlaceholderInTooltip?: boolean;
    /** formatter for placeholder for multi items mode */
    multiPlaceholderFormatter?: (items: ItemBase[]) => string;
    /** default: 'label' */
    labelProp?: string;
    /** default: 'value' */
    valueProp?: string;
    /** default: 'short_label' */
    multiItemLabelProp?: string;
    /** default: 'after' */
    multiItemRemovePosition?: 'after' | 'before' | 'none';
    /** maximum number of multi items. The rest will get a single item to represent. */
    maxMultiItems?: number;
    /** label for the item representing the rest of the items. */
    multiItemsRestLabelProvider?: (count: number, items: ItemBase[]) => string;
    /** initial items */
    items?: ItemBase[] | null;
    /** initial selected values */
    selectedValues?: any[] | null;
    /** initial selected value */
    value?: any;
    renderSingleItem?: (item: ItemBase, itemEl: Element) => (any | false);
    unrenderSingleItem?: (item: ItemBase, itemEl: Element) => void;
    renderMultiItem?: (item: ItemBase, itemEl: Element) => (any | false);
    unrenderMultiItem?: (item: ItemBase, itemEl: Element) => void;
    renderRestMultiItem?: (item: ItemBase, itemEl: Element) => (any | false);
    unrenderRestMultiItem?: (item: ItemBase, itemEl: Element) => void;
    /** is it searchable? (default: false) */
    searchable?: boolean;
    /** default behavior of type to select (focus first item starting with the search term) when searchable is true (default: true) */
    allowTypeToSelect?: boolean;
    /** text for no results (empty for none) (default: 'No matching results') */
    noResultsText?: string;
    /** automatically select text in input when an item is checked (multi mode). Used to allow the user to quickly type multiple items. (default: true) */
    autoSelectTextOnCheck?: boolean;
    /** throttle time (milliseconds) for filtering (default: 300) */
    filterThrottleWindow?: number;
    /** call the filter function on empty search term too (default: false) */
    filterOnEmptyTerm?: boolean;
    filterFn?: (items: ItemBase[], term: string) => (ItemBase[] | null);
    on?: (name: string, ...args: any[]) => void;
    isLoadingMode?: boolean;
    /** whether we should close the list automatically when loading */
    closeListWhenLoading?: boolean;
    /** clear input box when closing the droplist or selecting `['single_close', 'multi_close', 'multi_select_single']` (default: ['single_close','multi_select_single']) */
    clearInputWhen?: string[];
    /** Intercept internal errors/warnings (e.g. from a throwing `renderMultiItem`/`unrenderSingleItem`) instead of the default `console.error`/`console.warn`. Also used as the default `onError` for the internal `DropList`, unless `listOptions.onError` is set explicitly. */
    onError?: LibraryErrorHandler;
}
