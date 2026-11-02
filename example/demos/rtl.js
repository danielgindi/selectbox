import { SelectBox } from '@danielgindi/selectbox';

export default function (stage) {
    const selectBox = new SelectBox({
        // 'auto' (default) follows the page; 'rtl' / 'ltr' force a direction
        direction: 'rtl',
        multi: true,
        placeholder: 'בחרו ערים',
        items: [
            { label: 'ירושלים', value: 'jerusalem' },
            { label: 'תל אביב', value: 'tel-aviv' },
            { label: 'חיפה', value: 'haifa' },
            { label: 'באר שבע', value: 'beer-sheva' },
            { label: 'אילת', value: 'eilat' },
        ],
        value: ['haifa', 'eilat'],
    });

    stage.append(selectBox.el);

    return selectBox;
}
