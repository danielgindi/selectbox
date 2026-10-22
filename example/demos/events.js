import { SelectBox } from '@danielgindi/selectbox';

export default function (stage) {
    const selectBox = new SelectBox({
        placeholder: 'Try picking "Decaf"…',
        items: [
            { label: 'Espresso', value: 'espresso' },
            { label: 'Americano', value: 'americano' },
            { label: 'Decaf', value: 'decaf' },
        ],
    });

    // ':before' events can be cancelled
    selectBox.on('select:before', (event) => {
        if (event.value === 'decaf')
            event.cancel = true;
    });

    const log = document.createElement('ol');
    log.className = 'event-log';

    // '*' receives every event, with its name
    selectBox.on('*', (name, data) => {
        let text = name;
        if (data?.value !== undefined) text += ` → ${JSON.stringify(data.value)}`;
        if (data?.cancel) text += ' (cancelled)';

        const entry = document.createElement('li');
        entry.textContent = text;
        log.append(entry);
        log.scrollTop = log.scrollHeight;
    });

    stage.append(selectBox.el, log);

    return selectBox;
}
