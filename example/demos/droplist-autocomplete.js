import { DropList } from '@danielgindi/selectbox';

const countries = [
    'Argentina', 'Australia', 'Austria', 'Belgium', 'Brazil', 'Canada', 'Chile', 'China', 'Denmark', 'Egypt',
    'Finland', 'France', 'Germany', 'Greece', 'India', 'Ireland', 'Israel', 'Italy', 'Japan', 'Mexico',
    'Netherlands', 'Norway', 'Poland', 'Portugal', 'Spain', 'Sweden', 'Switzerland', 'Turkey', 'Ukraine',
].map(name => ({ label: name, value: name.toLowerCase() }));

const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
    .map(size => ({ label: size, value: size }));

/** A text input with suggestions: typing filters the list */
function countryInput() {
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

    // Show the suggestions for what's in the input
    const open = () => {
        list.setSearchTerm(input.value, true);
        list.show();
    };

    // Arrows, Page Up/Down, Home/End, Enter, Tab and Escape - the same handling SelectBox uses
    input.addEventListener('keydown', (event) => {
        list.handleInputKeydown(event, {
            // ArrowDown / ArrowUp while the list is closed
            moveNext: open,
            movePrevious: open,
            // A typed character while the list is closed (default: `show()`)
            open,
            // Enter while nothing is highlighted (default: `show()` / `hide()`)
            toggle: () => list.isVisible() ? list.hide() : open(),
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

    return input;
}

/** A button that picks from a list, like a native <select>: no text to filter */
function sizeButton() {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'demo-button';
    button.setAttribute('role', 'combobox');
    button.setAttribute('aria-haspopup', 'listbox');
    button.setAttribute('aria-expanded', 'false');

    const list = new DropList({
        // The button keeps the focus
        capturesFocus: false,
        // Close on a click or focus outside. The button is the position target, so it doesn't count.
        autoHide: true,
        positionOptionsProvider: () => ({
            target: button,
            updateWidth: true,
        }),
        on: (name) => {
            if (name === 'show' || name === 'hide')
                button.setAttribute('aria-expanded', String(name === 'show'));
        },
    });

    list.setItems(sizes);
    list.el.addEventListener('mousedown', event => event.preventDefault());

    let size = 'M';

    const pick = (value) => {
        size = value;
        button.textContent = `Size: ${size} ▾`;
        list.setSingleSelectedItemByValue(size);
    };

    pick(size);

    // Open with the current size highlighted
    const open = () => {
        list.show();
        list.setFocusedItemByValue(size);
    };

    button.addEventListener('click', () => list.isVisible() ? list.hide() : open());

    button.addEventListener('keydown', (event) => {
        list.handleInputKeydown(event, {
            // Typing while the list is closed picks the matching size right away, like a native <select>.
            // (Without it, typing opens the list and highlights the match.)
            allowTypeToSelect: true,
            // There's no text being edited, so Home/End always move in the list.
            // (Detected from the target's `value` by default.)
            hasInputText: false,
            moveNext: open,
            movePrevious: open,
            toggle: () => list.isVisible() ? list.hide() : open(),
            // `disabled` / `readOnly`: stop Enter and Space from opening and closing the list
        });
    });

    list.on('select', ({ value }) => {
        pick(value);
        list.hide();
    });

    return button;
}

export default function (stage) {
    stage.append(countryInput(), sizeButton());
}
