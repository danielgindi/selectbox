import { SelectBox, SelectBoxDefaultOptions, DropListDefaultOptions } from '@danielgindi/selectbox';

const plans = [
    { label: 'Free', value: 'free' },
    { label: 'Pro - for freelancers and small studios', value: 'pro' },
    { label: 'Enterprise - unlimited seats, SSO and audit logs', value: 'enterprise' },
];

export default function (stage) {
    // This page restores the defaults right after, so the other examples are unaffected.
    const saved = [{ ...SelectBoxDefaultOptions }, { ...DropListDefaultOptions }];

    // Set app-wide defaults once, at startup, before creating any box
    Object.assign(SelectBoxDefaultOptions, {
        placeholder: 'Select…',
        clearable: false,
        noResultsText: 'Nothing found',
    });

    // Applies to every DropList, including the ones inside SelectBoxes:
    // lists are exactly as wide as their box
    DropListDefaultOptions.useExactTargetWidth = true;

    const withDefaults = new SelectBox({ items: plans });

    // Options passed to a box still win
    const overridden = new SelectBox({
        items: plans,
        placeholder: 'Choose a plan',
        clearable: true,
        listOptions: { useExactTargetWidth: false },
    });

    Object.assign(SelectBoxDefaultOptions, saved[0]);
    Object.assign(DropListDefaultOptions, saved[1]);

    stage.append(withDefaults.el, overridden.el);

    return withDefaults;
}
