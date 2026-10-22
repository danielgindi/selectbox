import { afterEach, beforeEach } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { cleanup } from './helpers';

// Real styles, so layout-dependent behavior (measuring, virtualization,
// positioning, visibility) runs exactly like it does for consumers.
import '../../scss/droplist.scss';
import '../../scss/selectbox.scss';

// The pointer stays wherever the previous test left it, and hovering an option
// moves the list's highlight. Park it at the top-left corner - lists always open below it.
beforeEach(async () => {
    const parking = document.createElement('div');
    parking.style.cssText = 'position: fixed; left: 0; top: 0; width: 1px; height: 1px; z-index: 2147483647;';
    document.body.append(parking);
    await userEvent.hover(page.elementLocator(parking));
    parking.remove();
});

afterEach(cleanup);
