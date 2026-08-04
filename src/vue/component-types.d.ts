// Hand-authored component type declarations for the Vue wrapper components.
// These aren't derived from the .vue source by a compiler (there's no vue-tsc
// in this toolchain) - they're a manually maintained mirror of each component's
// props/emits/exposed-instance-surface. Keep in sync with DropList.vue / SelectBox.vue
// when either one's public surface (PropTypes, emits, or public methods/computed) changes.

import type { ComponentOptionsMixin, DefineComponent } from 'vue';
import type DropList from '../lib/DropList.js';
import type SelectBox from '../lib/SelectBox.js';
import type { DropListOptions, ItemBase, PositionOptions, SelectBoxOptions } from '../lib/types.js';

export interface DropListVueProps {
    baseClassName?: string;
    additionalClasses?: string | string[] | Record<string, boolean>;
    direction?: 'ltr' | 'rtl' | 'auto';
    autoFocus?: boolean;
    autoItemBlur?: boolean;
    autoItemBlurDelay?: number;
    capturesFocus?: boolean;
    multi?: boolean;
    isHeaderVisible?: boolean;
    isFooterVisible?: boolean;
    searchable?: boolean;
    searchPlaceholder?: string;
    noResultsText?: string;
    filterThrottleWindow?: number;
    filterOnEmptyTerm?: boolean;
    filterGroups?: boolean;
    filterEmptyGroups?: boolean;
    filterFn?: DropListOptions['filterFn'];
    filterDependencies?: any;
    keyDownHandler?: DropListOptions['keyDownHandler'];
    autoCheckGroupChildren?: boolean;
    useExactTargetWidth?: boolean;
    constrainToWindow?: boolean;
    autoFlipDirection?: boolean;
    estimatedItemHeight?: number;
    estimateWidth?: boolean;
    virtualMinItems?: number;
    labelProp?: string;
    valueProp?: string;
    items?: ItemBase[];
    /** Vue 3 (`v-model`). Under Vue 2 compat this is `value` (+ `input` event) instead - untyped here. */
    modelValue?: any;
    renderItem?: DropListOptions['renderItem'];
    unrenderItem?: DropListOptions['unrenderItem'];
    positionOptions?: PositionOptions;
    autoRelayoutOnItemsChange?: boolean;
}

export type DropListVueEmits = {
    'update:modelValue': [value: any];
    itemfocus: [data: any];
    itemblur: [data: any];
    select: [data: any];
    'show:before': [data: any];
    show: [data: any];
    'hide:before': [data: any];
    hide: [data: any];
    check: [data: any];
    groupcheck: [data: any];
    blur: [];
    show_subitems: [data: any];
    hide_subitems: [data: any];
    'subitems:select': [data: any];
    'subitems:blur': [data: any];
    keypress: [event: KeyboardEvent];
    keydown: [event: KeyboardEvent];
};

// Plain object type literals (not interfaces) here - DefineComponent's C/M generic
// slots require an index signature (ComputedOptions/MethodOptions), and TS only infers
// one implicitly for object type literals, not for named interfaces.
export type DropListVueComputed = {
    /** The underlying `DropList` instance, once mounted. */
    listRef: () => DropList | undefined;
};

export type DropListVueMethods = {
    relayout(): void;
    getHeaderElement(): HTMLElement | undefined;
    getFooterElement(): HTMLElement | undefined;
    elContains(other: any, considerSublists?: boolean): boolean;
};

export type DropListVueComponent = DefineComponent<
    DropListVueProps,
    {},
    {},
    DropListVueComputed,
    DropListVueMethods,
    ComponentOptionsMixin,
    ComponentOptionsMixin,
    DropListVueEmits
>;

export interface SelectBoxVueProps {
    disabled?: boolean;
    readOnly?: boolean;
    clearable?: boolean;
    hasOpenIndicator?: boolean;
    placeholder?: string;
    sortSelectedItems?: boolean;
    sortListItems?: boolean;
    sortListCheckedFirst?: boolean;
    stickyValues?: any[];
    sortItemComparator?: SelectBoxOptions['sortItemComparator'];
    splitListCheckedGroups?: boolean;
    showSelection?: boolean;
    showPlaceholderInTooltip?: boolean;
    multiPlaceholderFormatter?: SelectBoxOptions['multiPlaceholderFormatter'];
    blurOnSingleSelection?: boolean | 'touch';
    multi?: boolean;
    searchable?: boolean;
    allowTypeToSelect?: boolean;
    noResultsText?: string;
    filterThrottleWindow?: number;
    filterOnEmptyTerm?: boolean;
    filterFn?: SelectBoxOptions['filterFn'];
    filterDependencies?: any;
    labelProp?: string;
    valueProp?: string;
    multiItemLabelProp?: string;
    multiItemRemovePosition?: 'before' | 'after' | 'none';
    items?: ItemBase[];
    /** Vue 3 (`v-model`). Under Vue 2 compat this is `value` (+ `input` event) instead - untyped here. */
    modelValue?: any;
    maxMultiItems?: number;
    multiItemsRestLabelProvider?: SelectBoxOptions['multiItemsRestLabelProvider'];
    renderSingleItem?: SelectBoxOptions['renderSingleItem'];
    unrenderSingleItem?: SelectBoxOptions['unrenderSingleItem'];
    renderMultiItem?: SelectBoxOptions['renderMultiItem'];
    unrenderMultiItem?: SelectBoxOptions['unrenderMultiItem'];
    renderRestMultiItem?: SelectBoxOptions['renderRestMultiItem'];
    unrenderRestMultiItem?: SelectBoxOptions['unrenderRestMultiItem'];
    renderNoResultsItem?: (item: ItemBase, itemEl: Element) => (any | false);
    unrenderNoResultsItem?: (item: ItemBase, itemEl: Element) => void;
    /** Rendered items in the drop list (as opposed to `renderSingleItem`/`renderMultiItem`, which render the *selected* item representation). */
    renderListItem?: (item: ItemBase, itemEl: Element) => (any | false);
    unrenderListItem?: (item: ItemBase, itemEl: Element) => void;
    virtualMinItems?: number;
    baseClass?: string;
    droplistBaseClass?: string;
    additionalClasses?: string | string[] | Record<string, boolean>;
    additionalDroplistClasses?: string | string[] | Record<string, boolean>;
    direction?: string;
    fixedDroplistWidth?: boolean;
    acceptNullAsValue?: boolean;
    emitNullForEmptyValue?: boolean;
    isLoadingMode?: boolean;
    closeListWhenLoading?: boolean;
    clearInputWhen?: string[];
    treatGroupSelectionAsItems?: boolean;
    autoCheckGroupChildren?: boolean;
    constrainListToWindow?: boolean;
    autoFlipListDirection?: boolean;
}

export type SelectBoxVueEmits = {
    'update:modelValue': [value: any];
    'clear:before': [cancellable: { cancel: boolean }];
    clear: [];
    open: [data: { list: any }];
    'open:before': [data: { list: any }];
    close: [];
    'search:focus': [];
    'search:blur': [];
    'search:term': [term: string];
    'addsel:before': [cancellable: { value: any; item: any; cancel: boolean }];
    addsel: [data: { value: any; item: any }];
    'removesel:before': [cancellable: { value: any; item: any; cancel: boolean }];
    removesel: [data: { value: any; item: any }];
    'select:before': [cancellable: { value: any; item: any; cancel: boolean }];
    select: [data: { value: any; item: any }];
    'input:resize': [];
    itemschanged: [data: { term: string | null; mutated: boolean; count: number }];
    search: [value: string];
};

export type SelectBoxVueMethods = {
    toggleLoading(on?: boolean): void;
    toggleList(open?: boolean): void;
    openList(): void;
    closeList(): void;
    isListOpen(): boolean;
    updateItemByValue(value: any, newItem: ItemBase): void;
    getSelectedItems(): ItemBase[];
    setSearchTerm(term: string, performSearch?: boolean): void;
    getSearchTerm(): string;
    getFilteredItemCount(): number;
    isFilterPending(): boolean;
    focus(): void;
    blur(): void;
    droplistElContains(other: any, considerSublists?: boolean): boolean | undefined;
};

export type SelectBoxVueComponent = DefineComponent<
    SelectBoxVueProps,
    {},
    {},
    {},
    SelectBoxVueMethods,
    ComponentOptionsMixin,
    ComponentOptionsMixin,
    SelectBoxVueEmits
>;

// Referenced only for documentation/traceability above (which lib class each
// wrapper controls) - not part of the emitted type surface itself.
export type { DropList as _DropListInstance, SelectBox as _SelectBoxInstance };
