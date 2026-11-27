import { ChevronLeft } from 'lucide-react';
import { useVisitor } from '@/queries/admin';
import ActivityRow from './activity-row';
import { Loading } from './activity-list';
import { formatDevice, formatTime, shortId } from './labels';

// 방문자 한 명 (관리자 화면, 백엔드 개편 B-7): 처음·마지막으로 본 때, 쓴 IP·기기, 기록,
// 같은 IP나 같은 기기를 쓴 다른 방문자 (쿠키를 지운 같은 사람일 수 있다: 짐작용 단서)
interface VisitorDetailProps {
    visitorId: string;
    onVisitor: (visitorId: string) => void;
    onBack: () => void;
}

const VisitorDetail = ({ visitorId, onVisitor, onBack }: VisitorDetailProps) => {
    const { data, isPending, isError } = useVisitor(visitorId);

    return (
        <section className="ui w-full rounded-card bg-surface p-4 shadow-card md:p-6">
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    aria-label="뒤로"
                    className="-ml-2 inline-flex size-10 items-center justify-center rounded-full text-neutral-700 hover:bg-neutral-100"
                    onClick={onBack}
                >
                    <ChevronLeft className="size-6" aria-hidden />
                </button>
                <h2 className="text-[20px] font-bold text-ink">
                    방문자 <span className="font-mono">{shortId(visitorId)}</span>
                </h2>
            </div>
            {isPending ? (
                <Loading />
            ) : isError || !data ? (
                <p className="py-10 text-center text-[14px] text-neutral-500">기록이 없어요</p>
            ) : (
                <>
                    <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[14px]">
                        <dt className="text-neutral-500">처음 본 때</dt>
                        <dd className="text-ink">{formatTime(data.firstSeen)}</dd>
                        <dt className="text-neutral-500">마지막</dt>
                        <dd className="text-ink">{formatTime(data.lastSeen)}</dd>
                        <dt className="text-neutral-500">기록</dt>
                        <dd className="text-ink">{data.count}건</dd>
                        <dt className="text-neutral-500">IP</dt>
                        <dd className="text-ink break-all">{data.ips.join(', ') || '(모름)'}</dd>
                        <dt className="text-neutral-500">기기</dt>
                        <dd className="text-ink">
                            {data.devices.map(({ device, count }, i) => (
                                <div key={i}>
                                    {formatDevice(device) ?? '(모름)'} · {count}건
                                </div>
                            ))}
                        </dd>
                    </dl>

                    <h3 className="mt-6 text-[16px] font-bold text-ink">
                        같은 IP·기기의 다른 방문자
                    </h3>
                    {data.related.length === 0 ? (
                        <p className="mt-1 text-[14px] text-neutral-500">없어요</p>
                    ) : (
                        <ul className="mt-1.5 flex flex-col gap-1 text-[14px]">
                            {data.related.map((other) => (
                                <li
                                    key={other.visitorId ?? 'none'}
                                    className="flex flex-wrap items-center gap-x-2"
                                >
                                    {other.visitorId ? (
                                        <button
                                            type="button"
                                            className="font-mono text-link underline-offset-2 hover:underline"
                                            onClick={() => onVisitor(other.visitorId!)}
                                        >
                                            {shortId(other.visitorId)}
                                        </button>
                                    ) : (
                                        <span className="font-mono">없음</span>
                                    )}
                                    <span className="text-neutral-500">
                                        {[
                                            other.sharedIps.length > 0 &&
                                                `같은 IP ${other.sharedIps.join(', ')}`,
                                            other.sameDevice && '같은 기기',
                                        ]
                                            .filter(Boolean)
                                            .join(' · ')}{' '}
                                        · {other.count}건 · 마지막 {formatTime(other.lastSeen)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}

                    <h3 className="mt-6 text-[16px] font-bold text-ink">기록 (최근 200건)</h3>
                    <ul className="mt-1">
                        {data.activities.map((activity) => (
                            <ActivityRow key={activity._id} activity={activity} />
                        ))}
                    </ul>
                </>
            )}
        </section>
    );
};

export default VisitorDetail;
