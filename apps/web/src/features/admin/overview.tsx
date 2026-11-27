import { useOverview } from '@/queries/admin';
import ActivityRow from './activity-row';
import { Loading } from './activity-list';
import { formatTime, shortId } from './labels';

// 요약 (관리자 화면, 백엔드 개편 B-7): 24시간 방문자, 최근 7일 PIN을 많이 틀린 방문자, 최근 마스터 PIN 사용
const Overview = ({ onVisitor }: { onVisitor: (visitorId: string) => void }) => {
    const { data, isPending } = useOverview();
    if (isPending || !data) return <Loading />;

    return (
        <div className="flex w-full flex-col gap-3">
            <section className="ui rounded-card bg-surface p-4 shadow-card md:p-6">
                <h2 className="text-[14px] text-neutral-500">최근 24시간 방문자</h2>
                <p className="mt-1 text-[32px] font-bold text-ink tabular-nums">
                    {data.visitors24h}명
                </p>
            </section>

            <section className="ui rounded-card bg-surface p-4 shadow-card md:p-6">
                <h2 className="text-[17px] font-bold text-ink">
                    PIN을 많이 틀린 방문자 (최근 7일)
                </h2>
                {data.pinFailures.length === 0 ? (
                    <p className="mt-2 text-[14px] text-neutral-500">없어요</p>
                ) : (
                    <ul className="mt-2 flex flex-col gap-1.5 text-[14px]">
                        {data.pinFailures.map((row) => (
                            <li
                                key={row.visitorId ?? 'none'}
                                className="flex flex-wrap items-center gap-x-2"
                            >
                                {row.visitorId ? (
                                    <button
                                        type="button"
                                        className="font-mono text-link underline-offset-2 hover:underline"
                                        onClick={() => onVisitor(row.visitorId!)}
                                    >
                                        {shortId(row.visitorId)}
                                    </button>
                                ) : (
                                    <span className="font-mono">없음</span>
                                )}
                                <span className="font-bold text-red-600">{row.count}번 틀림</span>
                                {row.blocked > 0 && (
                                    <span className="text-red-600">(막힘 {row.blocked}번)</span>
                                )}
                                <span className="text-neutral-500">
                                    {row.ips.filter(Boolean).join(', ')} · 마지막{' '}
                                    {formatTime(row.lastAt)}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <section className="ui rounded-card bg-surface p-4 shadow-card md:p-6">
                <h2 className="text-[17px] font-bold text-ink">마스터 PIN 사용 (최근 30건)</h2>
                {data.masterUses.length === 0 ? (
                    <p className="mt-2 text-[14px] text-neutral-500">없어요</p>
                ) : (
                    <ul className="mt-1">
                        {data.masterUses.map((activity) => (
                            <ActivityRow
                                key={activity._id}
                                activity={activity}
                                onVisitor={onVisitor}
                            />
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
};

export default Overview;
