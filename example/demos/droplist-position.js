import { DropList } from '@danielgindi/selectbox';

const items = ['Short', 'A somewhat longer item', 'Medium item', 'An item with quite a long label indeed']
    .map(label => ({ label, value: label }));

export default function (stage, controls) {
    const target = document.createElement('button');
    target.type = 'button';
    target.className = 'demo-button';
    target.textContent = 'Toggle the list';
    // Centered, so there's room on both sides
    target.style.marginInline = 'auto';

    const settings = {
        anchorX: 'start',
        anchorY: 'bottom',
        positionX: 'start',
        positionY: 'top',
        offsetY: 4,
        updateWidth: 'true',
        targetRtl: 'auto',
        useExactTargetWidth: false,
        constrainToWindow: true,
        autoFlipDirection: true,
    };

    let list;

    // These three are construction options, so changing them builds a new list
    function build() {
        const wasVisible = list?.isVisible();
        list?.destroy();

        list = new DropList({
            // Never wider than the target (`updateWidth` decides the target's width)
            useExactTargetWidth: settings.useExactTargetWidth,
            // Keep the list inside the window, sliding it if needed
            constrainToWindow: settings.constrainToWindow,
            // Open above instead when there's no room below (and vice versa)
            autoFlipDirection: settings.autoFlipDirection,
            positionOptionsProvider: () => ({
                target,
                // The `anchor` point of the target meets the `position` point of the list
                anchor: { x: settings.anchorX, y: settings.anchorY },
                position: { x: settings.positionX, y: settings.positionY },
                offset: { x: 0, y: settings.offsetY },
                // `true`: at least as wide as the target; a number: at least that wide
                updateWidth: settings.updateWidth === 'true' ? true
                    : settings.updateWidth === 'false' ? false
                        : Number(settings.updateWidth),
                // Which way 'start' and 'end' point (default: the target's direction)
                targetRtl: settings.targetRtl === 'auto' ? undefined : settings.targetRtl === 'rtl',
            }),
        });

        list.setItems(items);
        list.on('select', () => list.hide());

        if (wasVisible)
            list.show();
    }

    build();

    target.addEventListener('click', () => {
        if (list.isVisible())
            list.hide();
        else
            list.show();
    });

    // Re-position an open list after changing its position options
    const set = (key, rebuild = false) => (value) => {
        settings[key] = value;
        if (rebuild)
            build();
        else
            list.relayout();
    };

    const xs = ['start', 'center', 'end', 'left', 'right'];
    const ys = ['top', 'center', 'bottom'];

    controls.select('anchor.x', xs, set('anchorX'));
    controls.select('anchor.y', ['bottom', 'top', 'center'], set('anchorY'));
    controls.select('position.x', xs, set('positionX'));
    controls.select('position.y', ys, set('positionY'));
    controls.text('offset.y', '4', value => set('offsetY')(Number(value) || 0));
    controls.select('updateWidth', ['true', 'false', '320'], set('updateWidth'));
    controls.select('targetRtl', ['auto', 'ltr', 'rtl'], set('targetRtl'));
    controls.toggle('useExactTargetWidth', false, set('useExactTargetWidth', true));
    controls.toggle('constrainToWindow', true, set('constrainToWindow', true));
    controls.toggle('autoFlipDirection', true, set('autoFlipDirection', true));

    stage.append(target);
}
