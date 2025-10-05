"use client";

import { useEffect, useRef, useState, ReactNode } from "react";

interface Props {
    children: ReactNode;
    isOpen: boolean;
    onClose: () => void;
    triggerRef: React.RefObject<HTMLElement>;
    offsetY?: number;
    offsetX?: number;
    className?: string;
}

export default function Dropdown({
                                     children,
                                     isOpen,
                                     onClose,
                                     triggerRef,
                                     offsetY = 4,
                                     offsetX = 0,
                                     className = "",
                                 }: Props) {
    const ref = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
    const [isAnimatingOut, setIsAnimatingOut] = useState(false);

    // Calculate position
    useEffect(() => {
        const triggerEl = triggerRef.current;
        if (!isOpen || !triggerEl) return;

        const rect = triggerEl.getBoundingClientRect();
        setPosition({
            top: rect.bottom + offsetY + window.scrollY,
            left: rect.left + offsetX + window.scrollX,
        });
    }, [isOpen, triggerRef, offsetY, offsetX]);

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            const triggerEl = triggerRef.current;
            if (
                ref.current &&
                !ref.current.contains(event.target as Node) &&
                triggerEl &&
                !triggerEl.contains(event.target as Node)
            ) {
                setIsAnimatingOut(true);
                setTimeout(onClose, 200);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen, triggerRef, onClose]);

    // Close on scroll
    useEffect(() => {
        if (!isOpen) return;

        const handleScroll = () => {
            setIsAnimatingOut(true);
            setTimeout(onClose, 200);
        };

        window.addEventListener("scroll", handleScroll, true);
        return () => window.removeEventListener("scroll", handleScroll, true);
    }, [isOpen, onClose]);

    if ((!isOpen && !isAnimatingOut) || !position) return null;

    return (
        <div
            ref={ref}
            style={{ top: position.top, left: position.left }}
            className={`fixed bg-white border rounded shadow-lg p-2 z-50 origin-top transform transition-all duration-200
        ${isAnimatingOut ? "animate-dropdown-out" : "animate-dropdown-in"} ${className}`}
            onAnimationEnd={() => isAnimatingOut && onClose()}
        >
            {children}
        </div>
    );
}
