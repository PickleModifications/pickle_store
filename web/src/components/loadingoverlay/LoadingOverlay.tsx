"use client";

import { useLoading } from '@/providers/loading';
import { LoaderCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';

const LoadingOverlay: React.FC = () => {
    const { isLoading } = useLoading();
    const [loading, setLoading] = useState(isLoading);
    useEffect(() => {
        setTimeout(() => {
            setLoading(isLoading);
        }, 300);
    }, [isLoading]);

    return loading && (
        <div style={{opacity: isLoading ? 0.9 : 0.0}} className="fixed inset-0 flex items-center justify-center bg-zinc-950 z-[100] transition-opacity duration-300">            
            <LoaderCircle className="animate-spin" />
        </div>
    );
};

export default LoadingOverlay;