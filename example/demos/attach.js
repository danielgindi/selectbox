import { SelectBox } from '@danielgindi/selectbox';

const languages = ['English', 'Español', 'Français', 'Deutsch', 'עברית', '日本語']
    .map(name => ({ label: name, value: name }));

function button(label, onClick) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'demo-button';
    el.textContent = label;
    el.addEventListener('click', onClick);
    return el;
}

export default function (stage) {
    // An element you already have, e.g. from your template
    const field = document.createElement('span');
    field.id = 'language-field';

    let selectBox = null;

    const create = () => {
        selectBox = new SelectBox({
            // Build inside this element, instead of creating a new one
            el: field,
            // Classes added next to `selectbox`. Here: `.demo-rounded { --selectbox-border-radius: 1em }`
            additionalClasses: 'demo-rounded',
            items: languages,
            placeholder: 'Language',
        });
    };

    const lifecycle = button('Destroy', () => {
        if (selectBox) {
            // Removes listeners, the list and everything inside `field`.
            // `field` itself stays in the page, since it's yours.
            selectBox.destroy();
            selectBox = null;
            lifecycle.textContent = 'Create again';
        } else {
            create();
            lifecycle.textContent = 'Destroy';
        }
    });

    create();

    // A box created inside a hidden container can't measure its input yet
    const hidden = document.createElement('div');
    hidden.hidden = true;

    const late = new SelectBox({ multi: true, items: languages, value: ['English', 'עברית'] });
    hidden.append(late.el);

    const reveal = button('Reveal the hidden box', () => {
        hidden.hidden = false;
        reveal.remove();
        // Browsers with ResizeObserver catch this on their own; older ones need the nudge
        late.refreshSize();
    });

    stage.append(field, lifecycle, reveal, hidden);
}
