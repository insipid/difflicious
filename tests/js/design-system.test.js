/**
 * Tests for design system helpers (cn and cva functions)
 */

// Import the module under test
import { cn, cva } from '../../src/difflicious/static/js/modules/design-system.js';

describe('Design System Helpers', () => {
    describe('cn (class name composition)', () => {
        it('should join multiple class names with spaces', () => {
            expect(cn('foo', 'bar', 'baz')).toBe('foo bar baz');
        });

        it('should filter out falsy values', () => {
            expect(cn('foo', false, 'bar', null, 'baz', undefined, '')).toBe('foo bar baz');
        });

        it('should handle empty input', () => {
            expect(cn()).toBe('');
        });

        it('should handle all falsy values', () => {
            expect(cn(false, null, undefined, '')).toBe('');
        });

        it('should handle single class name', () => {
            expect(cn('single')).toBe('single');
        });

        it('should handle conditional class names', () => {
            const isActive = true;
            const isDisabled = false;
            expect(cn('base', isActive && 'active', isDisabled && 'disabled')).toBe('base active');
        });
    });

    describe('cva (class variance authority)', () => {
        describe('basic functionality', () => {
            it('should return base class when no variants provided', () => {
                const button = cva('btn');
                expect(button()).toBe('btn');
            });

            it('should combine base class with variant class', () => {
                const button = cva('btn', {
                    variants: {
                        color: {
                            primary: 'btn-primary',
                            secondary: 'btn-secondary'
                        }
                    }
                });

                expect(button({ color: 'primary' })).toBe('btn btn-primary');
                expect(button({ color: 'secondary' })).toBe('btn btn-secondary');
            });

            it('should handle multiple variants', () => {
                const button = cva('btn', {
                    variants: {
                        color: {
                            primary: 'btn-primary',
                            secondary: 'btn-secondary'
                        },
                        size: {
                            small: 'btn-sm',
                            large: 'btn-lg'
                        }
                    }
                });

                expect(button({ color: 'primary', size: 'small' })).toBe('btn btn-primary btn-sm');
                expect(button({ color: 'secondary', size: 'large' })).toBe('btn btn-secondary btn-lg');
            });

            it('should ignore unknown variant values', () => {
                const button = cva('btn', {
                    variants: {
                        color: {
                            primary: 'btn-primary'
                        }
                    }
                });

                expect(button({ color: 'unknown' })).toBe('btn');
            });

            it('should ignore unknown variant names', () => {
                const button = cva('btn', {
                    variants: {
                        color: {
                            primary: 'btn-primary'
                        }
                    }
                });

                expect(button({ unknownVariant: 'value' })).toBe('btn');
            });
        });

        describe('defaultVariants', () => {
            it('should apply default variants when no options provided', () => {
                const button = cva('btn', {
                    variants: {
                        color: {
                            primary: 'btn-primary',
                            secondary: 'btn-secondary'
                        }
                    },
                    defaultVariants: {
                        color: 'primary'
                    }
                });

                expect(button()).toBe('btn btn-primary');
            });

            it('should override default variants with provided options', () => {
                const button = cva('btn', {
                    variants: {
                        color: {
                            primary: 'btn-primary',
                            secondary: 'btn-secondary'
                        }
                    },
                    defaultVariants: {
                        color: 'primary'
                    }
                });

                expect(button({ color: 'secondary' })).toBe('btn btn-secondary');
            });

            it('should apply multiple default variants', () => {
                const button = cva('btn', {
                    variants: {
                        color: {
                            primary: 'btn-primary',
                            secondary: 'btn-secondary'
                        },
                        size: {
                            small: 'btn-sm',
                            large: 'btn-lg'
                        }
                    },
                    defaultVariants: {
                        color: 'primary',
                        size: 'small'
                    }
                });

                expect(button()).toBe('btn btn-primary btn-sm');
            });

            it('should partially override default variants', () => {
                const button = cva('btn', {
                    variants: {
                        color: {
                            primary: 'btn-primary',
                            secondary: 'btn-secondary'
                        },
                        size: {
                            small: 'btn-sm',
                            large: 'btn-lg'
                        }
                    },
                    defaultVariants: {
                        color: 'primary',
                        size: 'small'
                    }
                });

                expect(button({ color: 'secondary' })).toBe('btn btn-secondary btn-sm');
                expect(button({ size: 'large' })).toBe('btn btn-primary btn-lg');
            });
        });

        describe('className merging', () => {
            it('should append className option to result', () => {
                const button = cva('btn');
                expect(button({ className: 'custom-class' })).toBe('btn custom-class');
            });

            it('should append className with variants', () => {
                const button = cva('btn', {
                    variants: {
                        color: {
                            primary: 'btn-primary'
                        }
                    }
                });

                expect(button({ color: 'primary', className: 'custom-class' })).toBe('btn btn-primary custom-class');
            });

            it('should append className with default variants', () => {
                const button = cva('btn', {
                    variants: {
                        color: {
                            primary: 'btn-primary'
                        }
                    },
                    defaultVariants: {
                        color: 'primary'
                    }
                });

                expect(button({ className: 'custom-class' })).toBe('btn btn-primary custom-class');
            });

            it('should handle className with multiple custom classes', () => {
                const button = cva('btn');
                expect(button({ className: 'custom-1 custom-2 custom-3' })).toBe('btn custom-1 custom-2 custom-3');
            });
        });

        describe('edge cases', () => {
            it('should handle empty base class', () => {
                const component = cva('', {
                    variants: {
                        color: {
                            red: 'text-red'
                        }
                    }
                });

                expect(component({ color: 'red' })).toBe('text-red');
            });

            it('should handle empty variant values', () => {
                const component = cva('btn', {
                    variants: {
                        border: {
                            none: '',
                            solid: 'border-solid'
                        }
                    }
                });

                expect(component({ border: 'none' })).toBe('btn');
                expect(component({ border: 'solid' })).toBe('btn border-solid');
            });

            it('should handle no config object', () => {
                const button = cva('btn');
                expect(button()).toBe('btn');
                expect(button({ className: 'custom' })).toBe('btn custom');
            });

            it('should handle empty config object', () => {
                const button = cva('btn', {});
                expect(button()).toBe('btn');
            });

            it('should work with falsy values in className', () => {
                const button = cva('btn');
                expect(button({ className: false })).toBe('btn');
                expect(button({ className: null })).toBe('btn');
                expect(button({ className: undefined })).toBe('btn');
                expect(button({ className: '' })).toBe('btn');
            });
        });

        describe('real-world examples from codebase', () => {
            it('should work with diffLine pattern', () => {
                const diffLine = cva('diff-line grid grid-cols-2 hover:bg-neutral-25', {
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

                // Default border should be applied
                expect(diffLine({ tone: 'context' })).toBe(
                    'diff-line grid grid-cols-2 hover:bg-neutral-25 line-context border-b border-gray-50'
                );

                // Override default border
                expect(diffLine({ tone: 'addition', border: 'strong' })).toBe(
                    'diff-line grid grid-cols-2 hover:bg-neutral-25 line-addition border-b border-neutral-200 dark:border-neutral-600'
                );

                // Border none (empty string)
                expect(diffLine({ tone: 'deletion', border: 'none' })).toBe(
                    'diff-line grid grid-cols-2 hover:bg-neutral-25 line-deletion'
                );
            });

            it('should work with lineContent pattern', () => {
                const lineContent = cva(
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

                // Default wrap: none
                expect(lineContent()).toBe('line-content flex-1 px-2 py-1 overflow-x-auto min-w-0');

                // Override with wrap: normal
                expect(lineContent({ wrap: 'normal' })).toBe(
                    'line-content flex-1 px-2 py-1 overflow-x-auto min-w-0 break-words'
                );

                // With custom className
                expect(lineContent({ className: 'custom-style' })).toBe(
                    'line-content flex-1 px-2 py-1 overflow-x-auto min-w-0 custom-style'
                );
            });

            it('should work with actionButton pattern', () => {
                const actionButton = cva(
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

                // Default intent
                expect(actionButton()).toBe(
                    'mt-4 px-3 py-1 text-sm rounded transition-colors bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                );

                // Danger intent
                expect(actionButton({ intent: 'danger' })).toBe(
                    'mt-4 px-3 py-1 text-sm rounded transition-colors bg-danger-bg-100 text-danger-text-700 hover:bg-danger-bg-200'
                );
            });
        });
    });
});
