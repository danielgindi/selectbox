import { SelectBox } from '@danielgindi/selectbox';

export default function (stage) {
    const selectBox = new SelectBox({
        placeholder: 'Select a city',
        searchable: false,
        // Items with `_subitems` open a nested menu (hover, click, or the → key)
        items: [
            {
                label: 'Europe',
                value: 'europe',
                _subitems: [
                    { label: 'Paris', value: 'paris' },
                    { label: 'Berlin', value: 'berlin' },
                    {
                        label: 'Spain',
                        value: 'spain',
                        _subitems: [
                            { label: 'Madrid', value: 'madrid' },
                            { label: 'Barcelona', value: 'barcelona' },
                        ],
                    },
                ],
            },
            {
                label: 'North America',
                value: 'north-america',
                _subitems: [
                    { label: 'New York', value: 'new-york' },
                    { label: 'Toronto', value: 'toronto' },
                ],
            },
            { label: 'Anywhere', value: 'anywhere' },
        ],
        // Nested values can be selected directly
        value: 'barcelona',
    });

    stage.append(selectBox.el);

    return selectBox;
}
