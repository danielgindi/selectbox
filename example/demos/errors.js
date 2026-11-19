import { SelectBox } from '@danielgindi/selectbox';

const widgets = [
    { label: 'Clock widget', value: 'clock' },
    { label: 'Weather widget', value: 'weather' },
    { label: 'Legacy widget (throws on cleanup)', value: 'legacy' },
];

export default function (stage) {
    const log = document.createElement('ol');
    log.className = 'event-log';

    const selectBox = new SelectBox({
        items: widgets,
        value: 'legacy',
        renderSingleItem: (item, itemEl) => {
            itemEl.textContent = `▣ ${item.label}`;
        },
        // Pick another widget: cleaning up the legacy one throws
        unrenderSingleItem: (item) => {
            if (item.value === 'legacy')
                throw new Error('legacy widget failed to clean up');
        },
        // Errors from cleanup callbacks and z-index resolvers land here, instead of the console.
        // It is also used by the inner DropList, unless `listOptions.onError` is set.
        onError: (error, context) => {
            const entry = document.createElement('li');
            entry.textContent = `${context.source}: ${error.message ?? error}`;
            log.append(entry);
        },
    });

    stage.append(selectBox.el, log);

    return selectBox;
}
