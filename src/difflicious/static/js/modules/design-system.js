/**
 * Design system helpers for Tailwind class composition.
 * Inspired by CVA patterns, implemented locally for browser usage.
 */

export function cn(...classes) {
    return classes.filter(Boolean).join(' ');
}

export function cva(base, config = {}) {
    const { variants = {}, defaultVariants = {} } = config;

    return (options = {}) => {
        const resolved = { ...defaultVariants, ...options };
        const result = [base];

        Object.entries(variants).forEach(([variantName, variantValues]) => {
            const value = resolved[variantName];
            if (value && variantValues[value]) {
                result.push(variantValues[value]);
            }
        });

        if (resolved.className) {
            result.push(resolved.className);
        }

        return cn(...result);
    };
}

export const diffLine = cva('diff-line grid grid-cols-2 hover:bg-neutral-25', {
    variants: {
        tone: {
            context: 'line-context',
            addition: 'line-addition',
            deletion: 'line-deletion',
            other: 'line-other'
        },
        border: {
            none: '',
            subtle: 'border-b border-gray-50',
            strong: 'border-b border-neutral-200 dark:border-neutral-600'
        }
    },
    defaultVariants: {
        border: 'subtle'
    }
});

export const diffSide = cva('', {
    variants: {
        side: {
            left: 'line-left',
            right: 'line-right'
        },
        border: {
            divider: 'border-r border-neutral-200 dark:border-neutral-600',
            none: ''
        },
        background: {
            default: '',
            context: 'bg-neutral-25',
            addition: 'bg-success-bg-50',
            deletion: 'bg-danger-bg-50'
        }
    }
});

export const lineNum = cva(
    'line-num w-12 px-2 py-1 text-neutral-400 text-right border-r border-neutral-200 dark:border-neutral-600 select-none',
    {
        variants: {
            background: {
                default: '',
                neutral: 'bg-neutral-50'
            }
        },
        defaultVariants: {
            background: 'default'
        }
    }
);

export const lineContent = cva(
    'line-content flex-1 px-2 py-1 overflow-x-auto min-w-0',
    {
        variants: {
            wrap: {
                normal: 'break-words',
                none: ''
            }
        },
        defaultVariants: {
            wrap: 'none'
        }
    }
);

export const statusPanel = cva('p-8 text-center', {
    variants: {
        tone: {
            neutral: 'text-neutral-500',
            danger: 'text-danger-text-500'
        }
    },
    defaultVariants: {
        tone: 'neutral'
    }
});

export const statusCaption = cva('text-sm', {
    variants: {
        tone: {
            neutral: 'text-neutral-500',
            danger: 'text-neutral-400'
        }
    },
    defaultVariants: {
        tone: 'neutral'
    }
});

export const actionButton = cva(
    'mt-4 px-3 py-1 text-sm rounded transition-colors',
    {
        variants: {
            intent: {
                danger: 'bg-danger-bg-100 text-danger-text-700 hover:bg-danger-bg-200',
                neutral: 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }
        },
        defaultVariants: {
            intent: 'neutral'
        }
    }
);
