import { SelectBox } from '@danielgindi/selectbox';

// Colors and sizes are CSS custom properties, so a theme is just a class.
// The list is attached to <body>, so give it the class too (via `listOptions`).
// (Usually this lives in your stylesheet.)
const css = `
.selectbox.theme-midnight {
    --selectbox-text-color: #e8ecf4;
    --selectbox-background-color: #101828;
    --selectbox-border-color: #344054;
    --selectbox-focus-border-color: #2dd4bf;
    --selectbox-focus-shadow: 0 0 0 3px rgb(45 212 191 / 30%);
    --selectbox-open-indicator-color: #98a2b3;
    --selectbox-clear-color: #98a2b3;
    --selectbox-clear-focus-color: #fb7185;
    --selectbox-multi-item-background-color: #1d2939;
    --selectbox-multi-item-border-color: #475467;
    --selectbox-multi-item-focus-background-color: #344054;
    --selectbox-multi-item-remove-color: #98a2b3;
    --selectbox-border-radius: 8px;
    --selectbox-multi-item-border-radius: 999px;
}
.droplist_wrapper.theme-midnight {
    --droplist-background-color: #101828;
    --droplist-border-color: #344054;
    --droplist-border-radius: 8px;
    --droplist-item-text-color: #e8ecf4;
    --droplist-item-focus-background-color: #1d2939;
    --droplist-item-selected-background-color: #0f766e;
    --droplist-item-selected-text-color: #fff;
    --droplist-item-selected-focus-background-color: #115e59;
    --droplist-checkbox-border-color: #2dd4bf;
    --droplist-checkbox-background-color: #101828;
    --droplist-checkbox-hover-background-color: #1d2939;
    --droplist-checkbox-active-border-color: #5eead4;
    --droplist-checkbox-active-background-color: #134e4a;
}
.selectbox.theme-roomy {
    --selectbox-horz-padding: 0.9em;
    --selectbox-border-radius: 999px;
    --selectbox-focus-border-color: #5b5bd6;
    --selectbox-focus-shadow: 0 0 0 3px rgb(91 91 214 / 25%);
}
.droplist_wrapper.theme-roomy {
    --droplist-item-height: 2.3em;
    --droplist-item-top-padding: 0.5em;
    --droplist-item-start-padding: 1.2em;
    --droplist-border-radius: 12px;
    --droplist-item-selected-background-color: #5b5bd6;
    --droplist-item-selected-focus-background-color: #4a4ac4;
}
`;

const planets = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune']
    .map(name => ({ label: name, value: name.toLowerCase() }));

export default function (stage) {
    if (!document.getElementById('theme-demo-styles')) {
        const style = document.createElement('style');
        style.id = 'theme-demo-styles';
        style.textContent = css;
        document.head.append(style);
    }

    const midnight = new SelectBox({
        multi: true,
        items: planets,
        value: ['earth', 'mars'],
        additionalClasses: 'theme-midnight',
        listOptions: { additionalClasses: 'theme-midnight' },
    });

    const roomy = new SelectBox({
        items: planets,
        value: 'saturn',
        additionalClasses: 'theme-roomy',
        listOptions: { additionalClasses: 'theme-roomy' },
    });

    stage.append(midnight.el, roomy.el);

    return midnight;
}
