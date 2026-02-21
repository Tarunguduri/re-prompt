/**
 * CursorFollower.jsx — Global custom cursor (dot + ring).
 * Mounted once in main.jsx wrapper. Reacts to all hoverable elements.
 */
import { useEffect, useRef } from 'react';

export default function CursorFollower() {
    const dotRef = useRef(null);
    const ringRef = useRef(null);
    const pos = useRef({ x: 0, y: 0 });
    const ring = useRef({ x: 0, y: 0 });
    const raf = useRef(null);

    useEffect(() => {
        const dot = dotRef.current;
        const rng = ringRef.current;

        const onMove = (e) => {
            pos.current = { x: e.clientX, y: e.clientY };
            dot.style.left = e.clientX + 'px';
            dot.style.top = e.clientY + 'px';
        };

        const onDown = () => document.body.classList.add('cursor-click');
        const onUp = () => document.body.classList.remove('cursor-click');

        // Hoverable elements
        const addHover = (el) => {
            el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
            el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
        };

        const attachHovers = () => {
            document.querySelectorAll('button, a, input, textarea, [data-hover]')
                .forEach(addHover);
        };

        // Smooth ring lerp
        const animate = () => {
            ring.current.x += (pos.current.x - ring.current.x) * 0.1;
            ring.current.y += (pos.current.y - ring.current.y) * 0.1;
            rng.style.left = ring.current.x + 'px';
            rng.style.top = ring.current.y + 'px';
            raf.current = requestAnimationFrame(animate);
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mousedown', onDown);
        window.addEventListener('mouseup', onUp);

        // Re-attach hovers whenever DOM changes
        const observer = new MutationObserver(attachHovers);
        observer.observe(document.body, { childList: true, subtree: true });
        attachHovers();
        animate();

        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mousedown', onDown);
            window.removeEventListener('mouseup', onUp);
            observer.disconnect();
            cancelAnimationFrame(raf.current);
        };
    }, []);

    return (
        <>
            <div ref={dotRef} id="cursor-dot" />
            <div ref={ringRef} id="cursor-ring" />
        </>
    );
}
