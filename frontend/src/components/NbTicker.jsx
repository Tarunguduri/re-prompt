/**
 * NbTicker.jsx — Scrolling marquee ticker (minimal glass style)
 */
export default function NbTicker({ items = [] }) {
    const doubled = [...items, ...items];
    return (
        <div className="nb-ticker w-full border-b border-[rgba(255,255,255,0.08)] bg-[rgba(8,8,8,0.6)] backdrop-blur-md py-1.5">
            <div className="flex animate-nb-marquee gap-8 w-max">
                {doubled.map((item, i) => (
                    <span key={i} className="font-mono text-[10px] uppercase tracking-[0.2em] text-[rgba(237,232,222,0.3)] px-4 select-none">
                        {item}
                        <span className="mx-4 text-[rgba(255,225,53,0.3)]">◆</span>
                    </span>
                ))}
            </div>
        </div>
    );
}
