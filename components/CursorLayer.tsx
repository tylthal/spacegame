import React, { useEffect, useState } from 'react';
import { InputProcessor } from '../input/InputProcessor';
import { HandCursor } from './HandCursor';

interface CursorLayerProps {
    inputProcessor: InputProcessor | null;
}

export const CursorLayer: React.FC<CursorLayerProps> = ({ inputProcessor }) => {
    const [cursorPos, setCursorPos] = useState({ x: 0.5, y: 0.5 });
    const [isPinching, setIsPinching] = useState(false);

    useEffect(() => {
        if (!inputProcessor) return;

        return inputProcessor.subscribe(event => {
            setCursorPos(event.cursor);
            setIsPinching(event.gesture === 'pinch');
        });
    }, [inputProcessor]);

    return (
        <HandCursor
            position={cursorPos}
            isPinching={isPinching}
        />
    );
};
