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
                    (see <code>multiItemLabelProp</code>). Backspace in the empty input removes the last chip for editing.`,
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
                    <code>unrender…</code> counterpart for cleanup, and returning <code>false</code> falls back to the label.`,
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
                id: 'sorting',
                title: 'Sorting',
                demo: 'sorting.js',
                description: `<code>sortListItems</code> sorts the list, <code>sortListCheckedFirst</code> brings checked
                    items up (multi mode), and <code>stickyValues</code> pin values to the top. Selected chips are sorted
                    by default (<code>sortSelectedItems</code>); customize with <code>sortItemComparator</code>.`,
            },
            {
                id: 'item-flags',
                title: 'Non-interactive items',
                demo: 'item-flags.js',
                description: `<code>_nointeraction</code> items can never be selected or checked.
                    <code>_nocheck</code> items are shown without a checkbox in multi mode, and are never checked.`,
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
                    open it, scroll, search, and use <kbd>Home</kbd>/<kbd>End</kbd>/<kbd>PgUp</kbd>/<kbd>PgDn</kbd>.`,
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
                    <code>event.cancel = true</code>. See the full list in the <a href="#api">API</a>.`,
            },
            {
                id: 'custom-props',
                title: 'Custom data shape',
                demo: 'custom-props.js',
                description: `Point <code>labelProp</code>, <code>valueProp</code> and <code>multiItemLabelProp</code>
                    at your own fields instead of mapping your data.`,
            },
            {
                id: 'z-index',
                title: 'Stacking (z-index)',
                demo: 'z-index.js',
                description: `The list is attached to <code>&lt;body&gt;</code>, so inside a dialog it may need a higher
                    z-index. Give <code>zIndex</code> a number or a resolver, per instance or globally through
                    <code>DropListDefaultOptions.zIndex</code>.`,
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
        ],
    },
    {
        group: 'Reference',
        items: [
            { id: 'api', title: 'API', kind: 'api' },
        ],
    },
];
