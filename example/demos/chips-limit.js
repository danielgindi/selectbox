import { SelectBox } from '@danielgindi/selectbox';

const tags = ['bug', 'feature', 'docs', 'ui', 'performance', 'security', 'tests', 'build']
    .map(tag => ({ label: tag, value: tag }));

export default function (stage) {
    const selectBox = new SelectBox({
        multi: true,
        items: tags,
        value: ['bug', 'docs', 'ui', 'security', 'tests'],
        // Show up to 3 chips; the rest collapse into a single chip.
        // Removing that chip removes everything it represents.
        maxMultiItems: 3,
        multiItemsRestLabelProvider: (count) => `+${count} more`,
        // Put the remove (×) button before the label
        multiItemRemovePosition: 'before',
    });

    stage.append(selectBox.el);

    return selectBox;
}
