import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Activity } from '@/api/admin';
import { cn } from '@/lib/utils';
import {
    actionLabel,
    changes,
    fields,
    formatDevice,
    formatTime,
    pinLabel,
    RESULT_LABELS,
    shortId,
} from './labels';

// 활동 기록 한 줄 (관리자 화면, 백엔드 개편 B-7). 누르면 자세히: 바뀐 것(수정), 만든·지운 내용, 기기·IP 원문
interface ActivityRowProps {
    activity: Activity;
    /** 방문자 id를 누르면 그 방문자의 기록으로 */
    onVisitor?: (visitorId: string) => void;
}

const ActivityRow = ({ activity, onVisitor }: ActivityRowProps) => {
    const [open, setOpen] = useState(false);
    const pin = pinLabel(activity);
    const failed = activity.result !== 'ok';
    const diff = changes(activity.before, activity.after);
    const detail = diff.length > 0 ? [] : fields(activity.before ?? activity.after);

    return (
        <li className="border-b border-neutral-100 last:border-b-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 py-2.5 text-[14px]">
                <span className="w-[108px] shrink-0 text-neutral-500 tabular-nums">
                    {formatTime(activity.at)}
                </span>
                <span className="font-bold text-ink">{actionLabel(activity.action)}</span>
                {activity.target?.name && (
                    <span className="max-w-[16rem] truncate text-ink">{activity.target.name}</span>
                )}
                <span
                    className={cn(
                        'rounded-full px-2 py-0.5 text-[12px] font-bold',
                        failed ? 'bg-red-50 text-red-600' : 'bg-neutral-100 text-neutral-600',
                    )}
                >
                    {RESULT_LABELS[activity.result] ?? activity.result}
                </span>
                {pin && (
                    <span
                        className={cn(
                            'rounded-full px-2 py-0.5 text-[12px] font-bold',
                            activity.pin === 'master'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-sky-50 text-sky-700',
                        )}
                    >
                        {pin}
                    </span>
                )}
                <span className="ml-auto flex items-center gap-2 text-[13px] text-neutral-500">
                    {onVisitor && activity.visitorId ? (
                        <button
                            type="button"
                            className="font-mono text-link underline-offset-2 hover:underline"
                            aria-label={`방문자 ${shortId(activity.visitorId)}의 기록`}
                            onClick={() => onVisitor(activity.visitorId!)}
                        >
                            {shortId(activity.visitorId)}
                        </button>
                    ) : (
                        <span className="font-mono">{shortId(activity.visitorId)}</span>
                    )}
                    <button
                        type="button"
                        aria-expanded={open}
                        aria-label="자세히"
                        className="inline-flex size-7 items-center justify-center rounded-full hover:bg-neutral-100"
                        onClick={() => setOpen(!open)}
                    >
                        <ChevronDown
                            className={cn('size-4 transition-transform', open && 'rotate-180')}
                            aria-hidden
                        />
                    </button>
                </span>
            </div>
            {open && (
                <dl className="mb-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-xl bg-neutral-50 px-3 py-2.5 text-[13px] break-all">
                    {diff.map(({ key, from, to }) => (
                        <Line key={key} name={key}>
                            {from} → <b className="text-ink">{to}</b>
                        </Line>
                    ))}
                    {detail.map(({ key, value }) => (
                        <Line key={key} name={key}>
                            {value}
                        </Line>
                    ))}
                    <Line name="기기">{formatDevice(activity.device) ?? '(모름)'}</Line>
                    <Line name="IP">{activity.ip ?? '(모름)'}</Line>
                    <Line name="서버">{activity.env ?? '(모름)'}</Line>
                    {activity.userAgent && <Line name="User-Agent">{activity.userAgent}</Line>}
                </dl>
            )}
        </li>
    );
};

const Line = ({ name, children }: { name: string; children: React.ReactNode }) => (
    <>
        <dt className="text-neutral-500">{name}</dt>
        <dd className="text-neutral-700">{children}</dd>
    </>
);

export default ActivityRow;
