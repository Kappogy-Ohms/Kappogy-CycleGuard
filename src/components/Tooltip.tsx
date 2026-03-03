import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { cn } from '../lib/utils';

export function Tooltip({ content, children }: { content: string, children?: React.ReactNode }) {
  const [show, setShow] = useState(false);

  return (
    <div 
      className="relative inline-flex items-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={() => setShow(!show)}
    >
      {children || <HelpCircle className="w-4 h-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer ml-1" />}
      
      {show && (
        <div className="absolute z-50 w-48 p-2 text-xs font-medium text-white bg-slate-800 dark:bg-slate-700 rounded-lg shadow-lg -top-2 left-full ml-2 transform -translate-y-1/2 animate-in fade-in zoom-in-95 duration-200">
          {content}
          <div className="absolute top-1/2 -left-1 w-2 h-2 bg-slate-800 dark:bg-slate-700 transform -translate-y-1/2 rotate-45" />
        </div>
      )}
    </div>
  );
}
