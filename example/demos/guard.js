import { SelectBox } from '@danielgindi/selectbox';

const roles = [
    { label: 'Owner', value: 'owner' },
    { label: 'Admin', value: 'admin' },
    { label: 'Editor', value: 'editor' },
    { label: 'Reviewer', value: 'reviewer' },
    { label: 'Viewer', value: 'viewer' },
    { label: 'Billing', value: 'billing' },
];

export default function (stage) {
    const selectBox = new SelectBox({
        multi: true,
        items: roles,
        value: ['owner', 'viewer'],
    });

    const note = document.createElement('p');
    note.className = 'demo-note';

    // Multi mode has its own cancellable events: 'addsel:before' and 'removesel:before'
    selectBox.on('addsel:before', (event) => {
        if (selectBox.getValue().length >= 3) {
            event.cancel = true;
            note.textContent = `Up to 3 roles - "${event.item.label}" was not added`;
        }
    });

    selectBox.on('removesel:before', (event) => {
        if (event.value === 'owner') {
            event.cancel = true;
            note.textContent = 'The Owner role can\'t be removed';
        }
    });

    // The clear (×) button, and `clear()`, go through 'clear:before'
    const allowClear = document.createElement('input');
    allowClear.type = 'checkbox';

    selectBox.on('clear:before', (event) => {
        if (!allowClear.checked) {
            event.cancel = true;
            note.textContent = 'Clearing is off - tick "Allow clearing"';
        }
    });

    const label = document.createElement('label');
    label.className = 'demo-note';
    label.append(allowClear, ' Allow clearing');

    stage.append(selectBox.el, label, note);

    return selectBox;
}
