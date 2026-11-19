// The documentation's table of contents. Each example section points to a demo
// module in ../demos - the same file is run on the page and shown as its source.

export const sections = [
    {
        group: 'Getting started',
        items: [
            { id: 'installation', title: 'Installation', kind: 'installation' },
            {
                id: 'usage',
                title: 'Usage',
                demo: 'basic.js',
                description: `Create a <code>SelectBox</code> with <code>items</code> (any objects with a <code>label</code> and a
                    <code>value</code>), then append its <code>el</code> anywhere. Read the selection with
                    <code>getValue()</code> and change it with <code>setValue()</code>.`,
            },
            {
                id: 'playground',
                title: 'Playground',
                demo: 'playground.js',
                description: `Every option has a matching setter, so the box can be reconfigured on the fly.
                    Flip the switches to explore.`,
            },
        ],
    },
    {
        group: 'SelectBox',
        items: [
            {
                id: 'multiple',
                title: 'Multiple selection',
                demo: 'multi.js',
                description: `With <code>multi: true</code> selected items become removable chips, and
                    <code>getValue()</code> returns an array. A chip shows <code>short_label</code> when the item has one
                    (see <code>multiItemLabelProp</code>); <code>short_label: false</code> selects the item without a chip.
                    Backspace in the empty input removes the last chip for editing.`,
            },
            {
                id: 'search',
                title: 'Search',
                demo: 'search.js',
                description: `Typing filters the list (case-insensitive, matching anywhere in the label).
                    Pass a <code>filterFn</code> for your own matching, and <code>noResultsText</code> to change the empty message.
                    Turn it off with <code>searchable: false</code> for a classic dropdown that still supports type-to-select.`,
            },
            {
                id: 'states',
                title: 'States',
                demo: 'states.js',
                description: `<code>disabled</code> and <code>readOnly</code> both prevent changes; read-only keeps the normal look.
                    <code>isLoadingMode</code> shows a spinner while you fetch items.`,
            },
            {
                id: 'groups',
                title: 'Groups',
                demo: 'groups.js',
                description: `Mark header items with <code>_group</code> and the items under them with <code>_child</code>.
                    In multi mode, checking a group checks all of its children. With <code>sortListCheckedFirst</code> and
                    <code>splitListCheckedGroups</code>, checked items are lifted to the top under a copy of their group.`,
            },
            {
                id: 'subitems',
                title: 'Nested menus',
                demo: 'subitems.js',
                description: `Give an item <code>_subitems</code> to open a nested menu, as deep as you need.
                    Nested values are first-class: they can be set as the value and are shown with their label.`,
            },
            {
                id: 'custom-rendering',
                title: 'Custom rendering',
                demo: 'custom-render.js',
                description: `Render anything inside list items (<code>listOptions.renderItem</code>), the single selection
                    (<code>renderSingleItem</code>) and chips (<code>renderMultiItem</code>). Each has an
                    <code>unrender…</code> counterpart for cleanup, and returning <code>false</code> falls back to the label.
                    The "rest" chip (<code>renderRestMultiItem</code>) gets the whole selection as <code>item.items</code>,
                    and <code>listOptions.renderNoResultsItem</code> renders the empty-search row.`,
            },
            {
                id: 'chips-limit',
                title: 'Limiting chips',
                demo: 'chips-limit.js',
                description: `<code>maxMultiItems</code> caps the visible chips and collapses the rest into one
                    "rest" chip, labelled by <code>multiItemsRestLabelProvider</code>. <code>multiItemRemovePosition</code>
                    places the remove button <code>'before'</code>, <code>'after'</code> (default) or nowhere (<code>'none'</code>).`,
            },
            {
                id: 'summary',
                title: 'Summary instead of chips',
                demo: 'summary.js',
                description: `With <code>showSelection: false</code> a multi box shows no chips: the placeholder summarizes
                    the selection instead. Write the summary with <code>multiPlaceholderFormatter</code>, and
                    <code>showPlaceholderInTooltip</code> shows it as a tooltip too.`,
            },
            {
                id: 'sorting',
                title: 'Sorting',
                demo: 'sorting.js',
                description: `<code>sortListItems</code> sorts the list, <code>sortListCheckedFirst</code> brings checked
                    items up (multi mode), and <code>stickyValues</code> pin values to the top. Selected chips are sorted
                    by default (<code>sortSelectedItems</code>). <code>sortItemComparator</code> replaces the order
                    (and the handling of sticky values) for both the list and the chips.`,
            },
            {
                id: 'item-flags',
                title: 'Non-interactive items',
                demo: 'item-flags.js',
                description: `<code>_nointeraction</code> items can never be selected or checked.
                    <code>_nocheck</code> items are shown without a checkbox in multi mode, and are never checked.`,
            },
            {
                id: 'selection-behavior',
                title: 'Selection behavior',
                demo: 'selection-behavior.js',
                description: `Fine-tune typing and picking: <code>allowTypeToSelect</code> picks by typing while the list is closed,
                    <code>blurOnSingleSelection</code> drops the focus after a pick (<code>'touch'</code>: on touch devices only),
                    <code>treatGroupSelectionAsItems</code> makes groups values of their own,
                    <code>autoSelectTextOnCheck</code> selects the typed text after checking an item, and
                    <code>clearInputWhen</code> picks the moments the typed text is cleared.`,
            },
            {
                id: 'async',
                title: 'Server-side search',
                demo: 'async.js',
                description: `Listen to <code>search:term</code>, fetch, and <code>setItems()</code> the results.
                    A pass-through <code>filterFn</code> keeps the list showing exactly what the server returned,
                    <code>setIsLoadingMode()</code> shows progress, and <code>closeListWhenLoading: false</code> keeps
                    the list open while loading.`,
            },
            {
                id: 'large-lists',
                title: 'Large lists',
                demo: 'virtual.js',
                description: `Lists are virtualized, so only the rows in view are rendered. This one has 100,000 items:
                    open it, scroll, search, and use <kbd>Home</kbd>/<kbd>End</kbd>/<kbd>PgUp</kbd>/<kbd>PgDn</kbd>.
                    A row's <code>unrenderItem</code> runs when it leaves the view - the counter tracks both.`,
            },
            {
                id: 'rtl',
                title: 'Right-to-left',
                demo: 'rtl.js',
                description: `Direction follows the page by default (<code>direction: 'auto'</code>), or can be forced
                    with <code>'rtl'</code>/<code>'ltr'</code>. Keyboard navigation between chips follows the direction too.`,
            },
            {
                id: 'events',
                title: 'Events',
                demo: 'events.js',
                description: `Subscribe with <code>on()</code>, <code>once()</code> and <code>off()</code>, or pass a single
                    <code>on(name, data)</code> option. Events ending in <code>:before</code> can be cancelled by setting
                    <code>event.cancel = true</code>. <code>off()</code> removes a handler.
                    See the full list in the <a href="#api">API</a>.`,
            },
            {
                id: 'guard',
                title: 'Guarding changes',
                demo: 'guard.js',
                description: `In multi mode, <code>addsel:before</code> and <code>removesel:before</code> can veto single changes,
                    and <code>clear:before</code> vetoes clearing - by the × button or by <code>clear()</code>.`,
            },
            {
                id: 'methods',
                title: 'Controlling from code',
                demo: 'methods.js',
                description: `Open, close, focus, search, select, rename and clear from code. Most methods return the box,
                    so they chain. <code>once()</code> subscribes for a single event.`,
            },
            {
                id: 'custom-props',
                title: 'Custom data shape',
                demo: 'custom-props.js',
                description: `Point <code>labelProp</code>, <code>valueProp</code> and <code>multiItemLabelProp</code>
                    at your own fields instead of mapping your data.`,
            },
            {
                id: 'existing-element',
                title: 'Existing elements',
                demo: 'attach.js',
                description: `Pass <code>el</code> to build inside an element you already have, and
                    <code>additionalClasses</code> for your own classes. <code>destroy()</code> removes everything
                    the box added, but leaves your element in place. A box created while hidden can be re-measured
                    with <code>refreshSize()</code>.`,
            },
            {
                id: 'defaults',
                title: 'Global defaults',
                demo: 'defaults.js',
                description: `<code>SelectBoxDefaultOptions</code> and <code>DropListDefaultOptions</code> hold the defaults
                    for every option. Change them once at startup; options passed to an instance still win.
                    The DropList defaults reach the lists inside SelectBoxes too.`,
            },
            {
                id: 'errors',
                title: 'Error handling',
                demo: 'errors.js',
                description: `Errors thrown by cleanup callbacks (<code>unrender…</code>) and z-index resolvers go to
                    <code>console.error</code>, or to your <code>onError(error, context)</code>, where
                    <code>context.source</code> names the callback.`,
            },
            {
                id: 'theming',
                title: 'Theming',
                demo: 'theming.js',
                description: `Colors and sizes are CSS custom properties (<code>--selectbox-*</code> on
                    <code>.selectbox</code>, <code>--droplist-*</code> on <code>.droplist_wrapper</code>), so a theme
                    is a class that sets them. The list lives in <code>&lt;body&gt;</code>, so give it the class through
                    <code>listOptions.additionalClasses</code>.`,
            },
            {
                id: 'z-index',
                title: 'Stacking (z-index)',
                demo: 'z-index.js',
                description: `The list is attached to <code>&lt;body&gt;</code>, so inside a dialog it may need a higher
                    z-index. Give <code>zIndex</code> a number or a resolver, per instance (<code>listOptions.zIndex</code>,
                    <code>dropList.setZIndex()</code>) or globally through <code>DropListDefaultOptions.zIndex</code>.
                    It's resolved when the list opens; <code>updateZIndex()</code> resolves it again while open.`,
            },
        ],
    },
    {
        group: 'DropList',
        items: [
            {
                id: 'droplist-menu',
                title: 'Menu',
                demo: 'droplist-menu.js',
                description: `<code>DropList</code> is the floating list on its own. Anchor it to any element with
                    <code>positionOptionsProvider</code>, and use its header and footer for extra content.
                    It flips and stays inside the window automatically.`,
            },
            {
                id: 'droplist-search',
                title: 'Searchable list',
                demo: 'droplist-search.js',
                description: `<code>searchable: true</code> adds a search box to the list itself - handy for
                    command palettes and pickers.`,
            },
            {
                id: 'droplist-multi',
                title: 'Checkbox list',
                demo: 'droplist-multi.js',
                description: `<code>multi: true</code> shows checkboxes. Read and set them with <code>getCheckedValues()</code>,
                    <code>setCheckedValues()</code> and <code>setItemChecked()</code>, and listen to <code>check</code>
                    and <code>groupcheck</code>. When searching, <code>filterGroups</code> decides whether group headers must
                    match the term too, and <code>filterEmptyGroups</code> hides groups left with no matching items.`,
            },
            {
                id: 'droplist-autocomplete',
                title: 'Autocomplete',
                demo: 'droplist-autocomplete.js',
                description: `Attach a DropList to your own input. <code>handleInputKeydown()</code> gives the input the keyboard
                    handling SelectBox uses, <code>capturesFocus: false</code> keeps the focus in the input, and
                    <code>singleSelectedValue</code> marks the current value.`,
            },
            {
                id: 'droplist-context-menu',
                title: 'Context menu',
                demo: 'droplist-context-menu.js',
                description: `<code>show()</code> takes position options directly. Without a target element, give
                    <code>targetOffset</code> (page coordinates) and a zero <code>targetWidth</code>/<code>targetHeight</code>.
                    Groups and nested menus work as in SelectBox; picks in nested menus arrive as <code>subitems:select</code>.`,
            },
            {
                id: 'droplist-position',
                title: 'Positioning',
                demo: 'droplist-position.js',
                description: `The <code>anchor</code> point of the target meets the <code>position</code> point of the list,
                    shifted by <code>offset</code>. Open the list and change the settings; <code>relayout()</code>
                    re-positions an open list.`,
            },
            {
                id: 'droplist-items',
                title: 'Changing items',
                demo: 'droplist-items.js',
                description: `<code>addItem()</code>, <code>addItems()</code>, <code>updateItemByValue()</code>,
                    <code>removeItem()</code> and <code>removeAllItems()</code> change the list in place. Double-click a row
                    to remove it: <code>ItemSymbol</code> leads from a row element to its item.
                    <code>virtualMinItems</code>, <code>estimatedItemHeight</code> and <code>estimateWidth</code> tune
                    large lists.`,
            },
            {
                id: 'droplist-keyboard',
                title: 'Keyboard and focus',
                demo: 'droplist-keyboard.js',
                description: `Every keyboard move is a method: <code>next()</code>, <code>previous()</code>, <code>nextPage()</code>,
                    <code>goToFirst()</code>, <code>goToLast()</code>, <code>setFocusedItemByValue()</code>,
                    <code>triggerItemSelection()</code>. <code>keyDownHandler</code> adds your own keys (press
                    <kbd>Delete</kbd> in the list), and <code>autoItemBlur: false</code> keeps the highlight when focus leaves.`,
            },
            {
                id: 'own-styles',
                title: 'Your own styles',
                demo: 'own-styles.js',
                description: `<code>baseClassName</code> renames every class the list uses, so none of the bundled styles apply
                    and your stylesheet takes over. SelectBox has the same option.`,
            },
        ],
    },
    {
        group: 'Frameworks',
        items: [
            {
                id: 'vue',
                title: 'Vue',
                demo: 'VueDemo.vue',
                description: `Import the components from <code>@danielgindi/selectbox/vue</code>. All options are props,
                    <code>v-model</code> binds the value, events are emitted as Vue events, and items can be rendered
                    with slots: <code>list-item</code>, <code>single-item</code>, <code>multi-item</code>,
                    <code>rest-multi-item</code> and <code>no-results-item</code>.`,
            },
            {
                id: 'vue-props',
                title: 'Vue: SelectBox props',
                demo: 'VueSelectBoxProps.vue',
                description: `A few props exist only in Vue: <code>accept-null-as-value</code> makes <code>null</code> a real value,
                    <code>emit-null-for-empty-value</code> emits <code>null</code> instead of <code>undefined</code>,
                    <code>filter-dependencies</code> re-runs <code>filter-fn</code> when the state it reads changes, and
                    <code>fixed-droplist-width</code>, <code>additional-droplist-classes</code>, <code>list-z-index</code>,
                    <code>constrain-list-to-window</code> and <code>auto-flip-list-direction</code> configure the list.`,
            },
            {
                id: 'vue-droplist',
                title: 'Vue: DropList',
                demo: 'VueDropList.vue',
                description: `The <code>DropList</code> component shows while it's rendered, so toggle it with <code>v-if</code>.
                    <code>v-model</code> binds the selected value (an array with <code>multi</code>), <code>position-options</code>
                    places it, the <code>header</code> and <code>footer</code> slots fill it, and <code>auto-focus</code>
                    focuses it on show. Its methods (<code>relayout()</code>, <code>handleInputKeydown()</code>, …)
                    are available through a template ref.`,
            },
        ],
    },
    {
        group: 'Reference',
        items: [
            { id: 'api', title: 'API', kind: 'api' },
        ],
    },
];
