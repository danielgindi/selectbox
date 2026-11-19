import { DropList } from '@danielgindi/selectbox';

const countries = [
    'Argentina', 'Australia', 'Austria', 'Belgium', 'Brazil', 'Canada', 'Chile', 'China', 'Denmark', 'Egypt',
    'Finland', 'France', 'Germany', 'Greece', 'India', 'Ireland', 'Israel', 'Italy', 'Japan', 'Mexico',
    'Netherlands', 'Norway', 'Poland', 'Portugal', 'Spain', 'Sweden', 'Switzerland', 'Turkey', 'Ukraine',
].map(name => ({ label: name, value: name.toLowerCase() }));

export default function (stage) {
    // Your own input - the DropList only provides the suggestions
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'demo-input';
    input.placeholder = 'Country';
    input.value = 'Israel';

    const list = new DropList({
        // The input keeps the focus; the list never takes it
        capturesFocus: false,
        // Mark the current value as selected
        singleSelectedValue: 'israel',
        noResultsText: 'No such country',
        positionOptionsProvider: () => ({
            target: input,
            // As wide as the input...
            updateWidth: true,
        }),
        // ...and never wider
        useExactTargetWidth: true,
    });

    list.setItems(countries);

    // Keep the focus in the input when clicking an item
    list.el.addEventListener('mousedown', event => event.preventDefault());

    // Arrows, Page Up/Down, Home/End, Enter, Tab and Escape - the same handling SelectBox uses
    input.addEventListener('keydown', (event) => {
        list.handleInputKeydown(event, {
            // What ArrowDown/ArrowUp do while the list is closed
            moveNext: () => list.show(),
            movePrevious: () => list.show(),
        });
    });

    input.addEventListener('input', () => {
        list.setSearchTerm(input.value, true);
        if (!list.isVisible())
            list.show();
    });

    input.addEventListener('blur', () => list.hide());

    list.on('select', ({ value, item }) => {
        input.value = item.label;
        list.setSingleSelectedItemByValue(value);
        list.setSearchTerm('', true);
        list.hide();
    });

    stage.append(input);
}
