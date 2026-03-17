import { useMemo } from 'react';
import katex from 'katex';

export default function MathFormula({
    math,
    displayMode = false,
    className = '',
    style,
}) {
    // Security contract: `math` must stay trusted/static. Do not pass user-controlled
    // or remotely sourced formula strings here without an explicit validation layer.
    const html = useMemo(() => katex.renderToString(math, {
        displayMode,
        throwOnError: false,
        strict: false,
        output: 'html',
    }), [displayMode, math]);

    return (
        <span
            className={`${displayMode ? 'math-display' : 'math-inline'} ${className}`.trim()}
            style={style}
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}
