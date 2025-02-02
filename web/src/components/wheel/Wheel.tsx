import React, { useEffect, useState } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogTrigger } from '../ui/dialog'
import { Button } from '../ui/button'
import { AspectRatio } from '../ui/aspect-ratio';
import RoulettePro from 'react-roulette-pro';
import 'react-roulette-pro/dist/index.css';

import tickSound from '/sounds/tick.mp3';
import wheelIcon from '/images/wheel.png';
import { useUser } from '@/providers/user';
import { useConfig } from '@/providers/config';
import { useNuiEvent } from '@/providers/nui/useNui';
import { fetchNui } from '@/providers/nui/fetchNui';

export default () => {
    const { user, setUser } = useUser();
    const { config } = useConfig();
    const [userState, setUserState] = useState(user);
    const [configState, setConfigState] = useState(config);
    useEffect(() => { setUserState(user) }, [user]);
    useEffect(() => { setConfigState(config) }, [config]);
    const [prizeWon, setPrizeWon] = useState<number | null>(null);
    const [spinDone, setSpinDone] = useState(false);
    const [currentTime, setCurrentTime] = useState(Math.floor(Date.now() / 1000));
    let spins = (userState?.spins || 0);
    const nextSpinTime = (userState?.nextSpinTime || 0);
    if (spins < 1 && currentTime >= nextSpinTime) {
        spins = 1;
    }
    const isSpinning = (typeof prizeWon === 'number');
    const prizeSize = 150;
    const prizeItemWidth = prizeSize;
    const prizeItemHeight = prizeSize;
    const minimumPrizesInAnimation = 50;
    const prizeList: any = [];
    const prizes = configState?.wheelPrizes || [];
    useNuiEvent("spinWheel", (data) => {
        setPrizeWon(data.prizeId - 1);
        if (userState) {
            setUser({...userState, spins: data.spins || 0, nextSpinTime: data.nextSpinTime || 0});
        }
    });
    if (!prizes || prizes.length < 1) return null;
    let decoyPrizes = 0;
    let prizeIndex = 0;
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(Math.floor(Date.now() / 1000));
        }, 1000);

        return () => clearInterval(interval);
    }, []);
    while (prizeList.length < minimumPrizesInAnimation || prizeList.length < prizes.length * 2) {
        prizes.map((prize) => {
            prizeList.push({
                ...prize,
                id: "sequence_" + decoyPrizes,
                prizeId: prize.id
            });
            decoyPrizes++;
        });
    }
    for (let i=decoyPrizes - 1; i>=0; i--) {
        const decoyPrize = prizeList[i];
        const distance = Math.abs(decoyPrizes - i);
        if (decoyPrize.prizeId == prizeWon && distance > 5) {
            prizeIndex = i;
            break;
        }
    }
    return (
        <>
            <Dialog onOpenChange={(open) => {
                if (!open) {
                    setPrizeWon(null);
                    setSpinDone(false);
                }
            }}>
                <DialogTrigger asChild>
                    <Button className='flex gap-0 items-center' variant={"secondary"}>
                        <img src={wheelIcon} alt={"Wheel"} className={"w-4 h-4 mr-2"}/>
                        <div>
                            {spins <= 0 ? (
                                (currentTime > nextSpinTime) ? ("No Spins") : (
                                    `Reset: ${String(Math.floor((nextSpinTime - currentTime) / 3600)).padStart(2, '0')}:${String(Math.floor(((nextSpinTime - currentTime) % 3600) / 60)).padStart(2, '0')}:${String(((nextSpinTime - currentTime) % 3600) % 60).padStart(2, '0')}`
                                )
                            ) : (`Free Spins (x${spins})`)}
                        </div>
                    </Button>
                </DialogTrigger>
                <DialogContent className="wheelScreen">
                    <DialogTitle></DialogTitle>
                    <div style={{maxWidth: "1140px"}} className="flex flex-col gap-2 select-none">
                        <div className='relative'>
                            <div id='roulette-ticker' className='absolute bg-foreground z-10' style={{top: 0, left: "50%", width: 4, height: "100%", transform: "translateX(-50%)"}}></div>            
                            {typeof prizeIndex === 'number' && (
                                <RoulettePro
                                    start={isSpinning}
                                    prizes={prizeList}
                                    prizeIndex={prizeIndex}
                                    spinningTime={5}
                                    options={{stopInCenter: true}}
                                    soundWhileSpinning={tickSound}
                                    designPlugin={() => ({
                                        prizeItemWidth: prizeItemWidth,
                                        prizeItemHeight: prizeItemHeight,
                                        prizeItemRenderFunction: (item) => (
                                            <div style={{borderRight: "2px solid hsl(var(--card))", borderLeft: "2px solid hsl(var(--card))", width: prizeItemWidth, height: prizeItemHeight}} className={'relative bg-secondary flex flex-col items-center justify-center roulette-item-bounds prize-' + item.id}>
                                                <img src={item.image} alt={item.text} style={{width: prizeItemWidth * 0.8}} draggable="false"/>
                                                <div style={{bottom: 0, width: "100%", height: 50, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", background: "linear-gradient(to top, hsl(var(--background)) 0%, transparent 100%)"}} className='absolute px-2 pb-2 flex items-end justify-center'>
                                                    <div className='text-center'>{item.text}</div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                    onPrizeDefined={() => {
                                        setSpinDone(true);
                                        setTimeout(() => {
                                            setPrizeWon(null);
                                            setSpinDone(false);
                                        }, 1000);
                                    }}
                                />
                            )}
                        </div>
                        <Button disabled={isSpinning || spins < 1} variant={"secondary"} onClick={() => {
                            fetchNui("spinWheel", {});
                        }}>{isSpinning ? <div>Spinning...</div> : (spins <= 0 ? ((currentTime > nextSpinTime) ? ("No Spins") : (
                                `Reset: ${String(Math.floor((nextSpinTime - currentTime) / 3600)).padStart(2, '0')}:${String(Math.floor(((nextSpinTime - currentTime) % 3600) / 60)).padStart(2, '0')}:${String(((nextSpinTime - currentTime) % 3600) % 60).padStart(2, '0')}`
                            )) : (`Free Spins (x${spins})`))}</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
