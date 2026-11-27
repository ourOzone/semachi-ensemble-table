import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminLogout, useAdminSession } from '@/queries/admin';
import ActivityList, { Loading } from './activity-list';
import AdminLogin from './admin-login';
import MasterPinForm from './master-pin-form';
import Overview from './overview';
import VisitorDetail from './visitor-detail';

// 관리자 화면 (/admin, 백엔드 개편 B-7). 마스터 PIN으로 로그인 → 요약 · 활동 기록 · 설정(마스터 PIN 바꾸기)
// 활동 기록에는 IP·기기처럼 사람을 짐작할 수 있는 정보가 있어 관리자만 본다. 이 화면은 처음 열 때만 불러온다 (app/main.tsx)
type Tab = 'overview' | 'activities' | 'settings';

const TABS: [Tab, string][] = [
    ['overview', '요약'],
    ['activities', '활동 기록'],
    ['settings', '설정'],
];

const AdminApp = () => {
    const session = useAdminSession();
    const logout = useAdminLogout();
    const [tab, setTab] = useState<Tab>('overview');
    // 방문자를 누르면 그 방문자의 기록 (뒤로 가면 보던 탭)
    const [visitorId, setVisitorId] = useState<string | null>(null);

    if (session.isPending) return <Loading />;
    if (!session.data) return <AdminLogin />;

    return (
        <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-3 px-2.5 py-4 md:px-4">
            <header className="ui flex items-center justify-between gap-3 px-1">
                <h1 className="text-[22px] font-bold text-ink">관리자</h1>
                <button
                    type="button"
                    className="inline-flex h-9 items-center gap-1 rounded-full px-3 text-[14px] text-neutral-600 hover:bg-neutral-100"
                    onClick={() => logout.mutate()}
                >
                    <LogOut className="size-4" aria-hidden />
                    로그아웃
                </button>
            </header>
            {visitorId ? (
                <VisitorDetail
                    visitorId={visitorId}
                    onVisitor={setVisitorId}
                    onBack={() => setVisitorId(null)}
                />
            ) : (
                <>
                    <nav role="tablist" aria-label="관리자 메뉴" className="ui flex gap-1.5 px-1">
                        {TABS.map(([value, label]) => (
                            <button
                                key={value}
                                type="button"
                                role="tab"
                                aria-selected={tab === value}
                                className={cn(
                                    'h-10 rounded-full px-4 text-[15px] font-bold',
                                    tab === value
                                        ? 'bg-ink text-on-ink'
                                        : 'bg-surface text-neutral-600 shadow-card hover:bg-neutral-50',
                                )}
                                onClick={() => setTab(value)}
                            >
                                {label}
                            </button>
                        ))}
                    </nav>
                    {tab === 'overview' && <Overview onVisitor={setVisitorId} />}
                    {tab === 'activities' && <ActivityList onVisitor={setVisitorId} />}
                    {tab === 'settings' && <MasterPinForm />}
                </>
            )}
        </div>
    );
};

export default AdminApp;
