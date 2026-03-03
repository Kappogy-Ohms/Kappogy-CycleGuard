import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';

export function RichText({ content, className }: { content: string, className?: string }) {
  return (
    <div className={cn("text-sm leading-relaxed", className)}>
      <ReactMarkdown
        components={{
          p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
          ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-2 space-y-1" {...props} />,
          ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-2 space-y-1" {...props} />,
          li: ({node, ...props}) => <li className="pl-1" {...props} />,
          strong: ({node, ...props}) => <strong className="font-semibold text-slate-900 dark:text-slate-100" {...props} />,
          em: ({node, ...props}) => <em className="italic" {...props} />,
          h1: ({node, ...props}) => <h1 className="text-lg font-bold mt-4 mb-2 text-slate-900 dark:text-slate-100" {...props} />,
          h2: ({node, ...props}) => <h2 className="text-base font-bold mt-3 mb-2 text-slate-900 dark:text-slate-100" {...props} />,
          h3: ({node, ...props}) => <h3 className="text-sm font-bold mt-2 mb-1 text-slate-900 dark:text-slate-100" {...props} />,
          a: ({node, ...props}) => <a className="text-rose-500 hover:underline font-medium" target="_blank" rel="noopener noreferrer" {...props} />,
          code: ({node, ...props}) => <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-xs font-mono text-rose-500" {...props} />,
          blockquote: ({node, ...props}) => <blockquote className="border-l-2 border-rose-500 pl-3 italic text-slate-600 dark:text-slate-400 my-2" {...props} />
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
