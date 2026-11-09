import { useState, useEffect } from 'react';
import { Wifi } from 'lucide-react';

interface MobileStatusBarProps {
  dark?: boolean;
  time?: string;
}

export function MobileStatusBar({ dark = false, time = '08.42' }: MobileStatusBarProps) {
  const [currentTime, setCurrentTime] = useState(time);

  useEffect(() => {
    // Optionally keep the exact mock time 08.42 from screenshot or default
    setCurrentTime(time);
  }, [time]);

  const textColor = dark ? 'text-white' : 'text-slate-900';

  return (
    <div className={`flex items-center justify-between px-6 pt-3 pb-1 select-none text-xs font-semibold tracking-tight ${textColor} z-30 transition-colors`}>
      {/* Time */}
      <span className="font-semibold text-[13px]">{currentTime}</span>

      {/* Right icons: Cellular, Wifi, Battery */}
      <div className="flex items-center gap-1.5">
        {/* Cellular signal bars */}
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="5" y1="19" x2="5" y2="17" />
          <line x1="10" y1="19" x2="10" y2="13" />
          <line x1="15" y1="19" x2="15" y2="9" />
          <line x1="20" y1="19" x2="20" y2="5" />
        </svg>

        {/* Wifi Icon */}
        <Wifi className="w-3.5 h-3.5 stroke-[2.2]" />

        {/* Battery with percentage */}
        <div className="flex items-center gap-1">
          <div className="w-5 h-2.5 border-[1.5px] border-current rounded-[3px] p-[1px] flex items-center relative">
            <div className="h-full bg-current rounded-[1px] w-[90%]" />
            <div className="w-[1.5px] h-1 bg-current absolute -right-[3px] rounded-r-xs" />
          </div>
          <span className="text-[10px] font-medium leading-none ml-0.5">94%</span>
        </div>
      </div>
    </div>
  );
}
