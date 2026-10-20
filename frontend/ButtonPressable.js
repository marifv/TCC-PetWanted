import { useState } from 'react';
import { Pressable as NativePressable, StyleSheet } from 'react-native';

function escurecer(cor, fator) {
    if (typeof cor !== 'string' || !/^#[0-9a-f]{6}$/i.test(cor)) return null;

    const componentes = [1, 3, 5].map((inicio) => (
        Math.round(parseInt(cor.slice(inicio, inicio + 2), 16) * fator)
            .toString(16)
            .padStart(2, '0')
    ));

    return `#${componentes.join('')}`;
}

export default function ButtonPressable({
    style,
    disabled,
    focusable = true,
    accessibilityRole = 'button',
    android_ripple,
    onHoverIn,
    onHoverOut,
    onFocus,
    onBlur,
    ...props
}) {
    const [hovered, setHovered] = useState(false);
    const [focused, setFocused] = useState(false);

    return (
        <NativePressable
            {...props}
            disabled={disabled}
            focusable={focusable}
            accessibilityRole={accessibilityRole}
            android_ripple={android_ripple || { color: 'rgba(15, 23, 42, 0.12)' }}
            onHoverIn={(event) => {
                setHovered(true);
                onHoverIn?.(event);
            }}
            onHoverOut={(event) => {
                setHovered(false);
                onHoverOut?.(event);
            }}
            onFocus={(event) => {
                setFocused(true);
                onFocus?.(event);
            }}
            onBlur={(event) => {
                setFocused(false);
                onBlur?.(event);
            }}
            style={({ pressed }) => {
                const baseStyle = typeof style === 'function' ? style({ pressed }) : style;
                const resolvedStyle = StyleSheet.flatten(baseStyle);
                const interacting = pressed || hovered;
                const backgroundColor = interacting
                    ? escurecer(resolvedStyle?.backgroundColor, pressed ? 0.82 : 0.92)
                    : null;
                const interactionStyle = interacting
                    ? backgroundColor
                        ? { backgroundColor }
                        : { opacity: pressed ? 0.82 : 0.92 }
                    : null;

                return [
                    baseStyle,
                    interactionStyle,
                    focused && { borderWidth: 2, borderColor: '#2563EB' },
                    disabled && resolvedStyle?.opacity == null && { opacity: 0.55 },
                ];
            }}
        />
    );
}
