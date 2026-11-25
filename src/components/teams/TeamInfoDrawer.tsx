import { useState } from 'react';
import { CalendarPlus, Pencil, Trash2, X } from 'lucide-react';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerTitle,
} from '@/components/ui/drawer';
import {
    boxShape,
    overlayClassName,
    pressable,
    scrollAreaClassName,
    sheetClassName,
} from '@/components/schedule/drawerParts';
import { openAddEnsemble } from '@/components/schedule/addEnsembleStore';
import { useTeamContext } from '@/context';
import { buildColorMap } from '@/lib/board';
import { cn } from '@/lib/utils';
import { useTeams } from '@/queries/teams';
import { useDrawerStore } from '@/stores/drawer';
import theme from '@/styles/theme';
import type { CheckTeamExists } from './types';

// 팀 정보 Drawer (View 개편 V-3). 아래에서 올라오고, 아래로 끌어내리면 닫힌다 (vaul).
// 위쪽은 팀 색 머리(종류·이름, 합주 잡기·수정·삭제), 아래는 팀원(6칸)과 셋리스트를 한 화면에.
// 이전: 오른쪽에서 열리는 옛 Drawer, 팀원·셋리를 탭으로 전환.
// 셋리스트가 길면 Drawer 전체가 스크롤된다 (안쪽에 스크롤을 따로 두면 모바일에서 끌어내리기와 겹친다).
// 수정·삭제의 PIN·입력 단계는 아직 옛 Drawer: 위에 쌓이면 이 Drawer는 내려가고, 닫히면 다시 올라온다.

/** desc의 앞 6칸 (7번째는 셋리스트) */
const MEMBER_LABELS = ['보컬', '기타', '베이스', '드럼', '키보드', '매니저'];

/** "세마치공연(정기/연말)" → "세마치공연 · 정기/연말" (옛 데이터의 다른 값은 그대로) */
function formatTeamType(type: string): string {
    return type.replace(/\((.+)\)$/, ' · $1');
}

interface TeamInfoDrawerProps {
    checkTeamExists: CheckTeamExists;
}

interface ShownTeam {
    id: string;
    type: string;
    name: string;
    desc: string[];
}

const TeamInfoDrawer = ({ checkTeamExists }: TeamInfoDrawerProps) => {
    const teams = useTeams();
    const { id, type, name, desc, setTeamStates, setTeamOrgStates } = useTeamContext();
    const openedDrawers = useDrawerStore((state) => state.openedDrawers);
    const openDrawer = useDrawerStore((state) => state.openDrawer);
    const closeDrawer = useDrawerStore((state) => state.closeDrawer);

    // 스택의 맨 위일 때만 열린다
    const open = openedDrawers[openedDrawers.length - 1] === 'teamInfo';

    // 보여줄 값은 열려 있는 동안의 context 값을 붙잡아 둔다. 닫히면서 context가 초기화되어도
    // 내려가는 동안 내용이 그대로 보이게 한다 (합주 정보 Drawer와 같은 방식)
    const live: ShownTeam | null = open && id ? { id, type, name, desc } : null;
    const liveKey = live ? JSON.stringify(live) : null;
    const [shown, setShown] = useState<{ key: string; team: ShownTeam } | null>(null);
    if (live && liveKey && liveKey !== shown?.key) setShown({ key: liveKey, team: live });

    const handleClose = () => {
        closeDrawer(); // 열려 있을 때는 맨 위가 이 Drawer
        setTeamStates();
    };

    // 합주 잡기: 팀을 골라 둔 합주 잡기 Drawer로 바뀐다 (닫으면 팀 정보로 돌아온다, V-2 21차)
    const handleClickAddEnsemble = async (teamId: string) => {
        if (await checkTeamExists(teamId)) openAddEnsemble({ teamId, returnTo: 'teamInfo' });
    };

    const handleClickUpdateTeam = async (team: ShownTeam) => {
        if (await checkTeamExists(team.id)) {
            // 수정하다 뒤로 가면 원래 값으로 되돌리기 위해 붙잡아 둔다
            setTeamOrgStates(team.type, team.name, team.desc);
            openDrawer('updateTeam1');
        }
    };

    const handleClickDeleteTeam = async (teamId: string) => {
        if (await checkTeamExists(teamId)) openDrawer('deleteTeam');
    };

    // 머리 색: 팀의 지금 색 (팀 목록·캘린더 블록과 같음)
    const color = shown ? (buildColorMap(teams)[shown.team.id] ?? theme.blueGray) : theme.blueGray;

    const content = (() => {
        if (!shown) return null;
        const { team } = shown;
        const setlist = team.desc[6]?.trim() ?? '';

        return (
            <div className={scrollAreaClassName}>
                {/* 머리: 팀 색 (손잡이는 이 위에 겹쳐 그린다) */}
                <div
                    className="px-5 pt-[26px] pb-6 text-white md:px-7"
                    style={{ backgroundColor: color }}
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 pt-1.5">
                            <DrawerTitle className="text-[28px] leading-tight font-bold break-keep text-white [overflow-wrap:anywhere] md:text-[32px]">
                                {team.name}
                            </DrawerTitle>
                            <DrawerDescription
                                className={cn(
                                    'mt-1.5 text-[15px] text-white/90',
                                    !team.type && 'sr-only',
                                )}
                            >
                                {team.type ? formatTeamType(team.type) : '팀 정보'}
                            </DrawerDescription>
                        </div>
                        <DrawerClose asChild>
                            <button
                                type="button"
                                aria-label="닫기"
                                className={`${pressable} -mr-2 inline-flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-white/20`}
                            >
                                <X className="size-6" aria-hidden />
                            </button>
                        </DrawerClose>
                    </div>

                    {/* 합주 잡기(주 동작) + 수정·삭제. 흰 버튼의 글씨는 팀 색 머리 위라 다크 모드에서도 검정 */}
                    <div className="mt-5 flex gap-2">
                        <button
                            type="button"
                            className={`${pressable} ${boxShape} flex h-12 min-w-0 flex-1 items-center justify-center gap-1.5 bg-white px-3 text-[16px] font-bold text-black/85 hover:bg-white/90 md:h-13`}
                            onClick={() => handleClickAddEnsemble(team.id)}
                        >
                            <CalendarPlus className="size-5 shrink-0" aria-hidden />
                            <span className="truncate">합주 잡기</span>
                        </button>
                        <button
                            type="button"
                            aria-label="팀 수정"
                            className={`${pressable} ${boxShape} flex h-12 shrink-0 items-center justify-center gap-1 bg-white/20 px-3.5 text-[15px] font-medium hover:bg-white/30 md:h-13 md:px-4`}
                            onClick={() => handleClickUpdateTeam(team)}
                        >
                            <Pencil className="size-[18px]" aria-hidden />
                            수정
                        </button>
                        <button
                            type="button"
                            aria-label="팀 삭제"
                            className={`${pressable} ${boxShape} flex h-12 shrink-0 items-center justify-center gap-1 bg-white/20 px-3.5 text-[15px] font-medium hover:bg-white/30 md:h-13 md:px-4`}
                            onClick={() => handleClickDeleteTeam(team.id)}
                        >
                            <Trash2 className="size-[18px]" aria-hidden />
                            삭제
                        </button>
                    </div>
                </div>

                {/* 본문: 팀원 → 셋리스트 */}
                <div className="bg-surface px-5 pt-5 pb-[calc(24px+env(safe-area-inset-bottom))] md:px-7 md:pt-6">
                    <h3 className="text-[14px] text-neutral-500">팀원</h3>
                    <ul className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3">
                        {MEMBER_LABELS.map((label, idx) => {
                            const member = team.desc[idx]?.trim() ?? '';
                            return (
                                <li
                                    key={label}
                                    className={`${boxShape} border border-neutral-200 bg-neutral-50 px-3.5 py-3`}
                                >
                                    <p className="flex items-center gap-1.5 text-[13px] text-neutral-500">
                                        <span
                                            aria-hidden
                                            className="size-2 shrink-0 rounded-full"
                                            style={{ backgroundColor: theme.eventColors[idx] }}
                                        />
                                        {label}
                                    </p>
                                    {/* 한 칸 최대 12글자. 좁은 화면에서는 두 줄이 될 수 있다 */}
                                    <p
                                        className={cn(
                                            'mt-1 text-[16px] leading-snug break-keep [overflow-wrap:anywhere]',
                                            member ? 'font-bold text-ink' : 'text-neutral-400',
                                        )}
                                    >
                                        {member || '없음'}
                                    </p>
                                </li>
                            );
                        })}
                    </ul>

                    <h3 className="mt-6 text-[14px] text-neutral-500">셋리스트</h3>
                    <div
                        className={cn(
                            boxShape,
                            'mt-2 border border-neutral-200 bg-neutral-50 px-4 py-3.5 text-[15px] leading-[1.7] break-keep whitespace-pre-wrap [overflow-wrap:anywhere]',
                            setlist ? 'text-ink' : 'text-neutral-400',
                        )}
                    >
                        {setlist || '아직 셋리스트가 없어요'}
                    </div>
                </div>
            </div>
        );
    })();

    return (
        <Drawer open={open} onOpenChange={(next) => !next && handleClose()}>
            <DrawerContent
                className={sheetClassName}
                overlayClassName={overlayClassName}
                // 손잡이는 팀 색 머리 위에 겹친다
                handleClassName="absolute inset-x-0 top-2.5 z-10 mt-0 w-10 bg-white/60"
            >
                {content}
            </DrawerContent>
        </Drawer>
    );
};

export default TeamInfoDrawer;
