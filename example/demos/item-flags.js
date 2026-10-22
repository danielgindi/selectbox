import { SelectBox } from '@danielgindi/selectbox';

export default function (stage) {
    const selectBox = new SelectBox({
        multi: true,
        placeholder: 'Choose plans',
        items: [
            { label: 'Free', value: 'free' },
            { label: 'Pro', value: 'pro' },
            { label: 'Team', value: 'team' },
            // Can never be selected or checked (and is dimmed, see below)
            { label: 'Enterprise (contact sales)', value: 'enterprise', _nointeraction: true },
            // Shown without a checkbox, and never checked
            { label: 'All plans include support', value: 'note', _nocheck: true },
        ],
        listOptions: {
            // Dims `_nointeraction` items
            additionalClasses: 'droplist_disabled_no_interaction',
        },
    });

    stage.append(selectBox.el);

    return selectBox;
}
