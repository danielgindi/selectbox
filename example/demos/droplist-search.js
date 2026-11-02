import { DropList } from '@danielgindi/selectbox';

const commands = [
    'Open file', 'Save', 'Save as…', 'Close tab', 'Find', 'Replace', 'Go to line',
    'Toggle sidebar', 'Toggle terminal', 'Format document', 'Rename symbol', 'Settings',
].map(label => ({ label, value: label }));

export default function (stage) {
    const button = document.createElement('button');
    button.className = 'demo-button';
    button.textContent = 'Command palette…';

    const result = document.createElement('span');
    result.className = 'demo-note';

    const palette = new DropList({
        // Adds a search box to the list's header
        searchable: true,
        searchPlaceholder: 'Type a command',
        filterThrottleWindow: 50,
        positionOptionsProvider: () => ({
            target: button,
            anchor: { x: 'start', y: 'bottom' },
            position: { x: 'start', y: 'top' },
            offset: { x: 0, y: 4 },
            updateWidth: 260,
        }),
    });

    palette.setItems(commands);

    palette.on('select', ({ value }) => {
        result.textContent = `Ran: ${value}`;
        palette.hide();
    });

    button.addEventListener('click', () => {
        palette.setSearchTerm('', true);
        palette.show();
        palette.el.querySelector('input').focus();
    });

    stage.append(button, result);
}
