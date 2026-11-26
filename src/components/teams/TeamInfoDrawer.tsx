import { useState } from 'react';
import dayjs from 'dayjs';
import { CalendarPlus, ChevronLeft, Pencil, Pin, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
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
import { formatDate } from '@/components/schedule/drawerParts';
import PinStep from '@/components/schedule/PinStep';
import { useKeyboardSheet } from '@/components/schedule/keyboardSheet';
import { scrollFadeRef } from '@/components/ui/scroll-fade';
import { useTeamContext } from '@/context';
import { buildColorMap } from '@/lib/board';
import { getRepeatEnd } from '@/lib/ensemble';
import { cn } from '@/lib/utils';
import { useTeams } from '@/queries/teams';
import { useDrawerStore } from '@/stores/drawer';
import { defaultTeamColor, eventColors } from '@/constants/colors';
import { openUpdateTeam } from './editTeamStore';
import { usePinnedTeamsStore } from './pinnedTeamsStore';
import type { CheckTeamExists, HandleDeleteTeam } from './types';

// 팀 정보 Drawer (View 개편 V-3). 아래에서 올라오고, 아래로 끌어내리면 닫힌다 (vaul).
// 위쪽은 팀 색 머리(종류·이름, 합주 잡기·수정·삭제), 아래는 팀원(6칸)과 셋리스트를 한 화면에.
// 이전: 오른쪽에서 열리는 옛 Drawer, 팀원·셋리를 탭으로 전환.
// 셋리스트가 길면 Drawer 전체가 스크롤된다 (안쪽에 스크롤을 따로 두면 모바일에서 끌어내리기와 겹친다).
// 팀 삭제의 PIN 단계는 이 Drawer 안에서 내용이 바뀐다 (V-3 9차, 합주 정보 Drawer의 삭제와 같은 모양, 뒤로 가면 정보로).
// 팀 수정도 PIN 단계는 이 Drawer 안에서, PIN이 맞으면 팀 수정 Drawer(팀 추가 Drawer의 수정 모드)로 바뀐다 (V-3 13차).
// 저장하거나 닫으면 이 Drawer로 돌아온다.

/** desc의 앞 6칸 (7번째는 셋리스트) */
const MEMBER_LABELS = ['보컬', '기타', '베이스', '드럼', '키보드', '매니저'];

/** "세마치공연(정기/연말)" → "세마치공연 · 정기/연말" (옛 데이터의 다른 값은 그대로) */
function formatTeamType(type: string): string {
    return type.replace(/\((.+)\)$/, ' · $1');
}

interface TeamInfoDrawerProps {
    checkTeamExists: CheckTeamExists;
    handleDeleteTeam: HandleDeleteTeam;
}

/** Drawer 안의 단계: 정보, 또는 팀 삭제 PIN 확인 */
type Step = 'info' | 'delete' | 'update';

interface ShownTeam {
    id: string;
    type: string;
    name: string;
    desc: string[];
}

const TeamInfoDrawer = ({ checkTeamExists, handleDeleteTeam }: TeamInfoDrawerProps) => {
    const teams = useTeams();
    const { id, type, name, desc, setTeamStates } = useTeamContext();
    const openedDrawers = useDrawerStore((state) => state.openedDrawers);
    // 팀 고정 (V-3 11차): 메인 화면 팀 목록 맨 앞, 이 브라우저에 기억
    const pinnedIds = usePinnedTeamsStore((state) => state.ids);
    const togglePinned = usePinnedTeamsStore((state) => state.toggle);
    const closeDrawer = useDrawerStore((state) => state.closeDrawer);

    // 스택의 맨 위일 때만 열린다
    const open = openedDrawers[openedDrawers.length - 1] === 'teamInfo';

    // 보여줄 값은 열려 있는 동안의 context 값을 붙잡아 둔다. 닫히면서 context가 초기화되어도
    // 내려가는 동안 내용이 그대로 보이게 한다 (합주 정보 Drawer와 같은 방식)
    const live: ShownTeam | null = open && id ? { id, type, name, desc } : null;
    const liveKey = live ? JSON.stringify(live) : null;
    const [shown, setShown] = useState<{ key: string | null; team: ShownTeam } | null>(null);
    const [step, setStep] = useState<Step>('info');
    if (live && liveKey !== shown?.key) {
        // 새로 열리거나 수정으로 값이 바뀌거나 팀 수정 Drawer에서 돌아오면 정보 단계부터
        setShown({ key: liveKey, team: live });
        setStep('info');
    } else if (!live && shown && shown.key !== null) {
        setShown({ ...shown, key: null }); // 다시 열면 새로 붙잡는다 (합주 정보 Drawer와 같음)
    }

    // PIN 단계의 키보드 처리 (합주 정보 Drawer와 같음: schedule/keyboardSheet)
    const pinSheet = useKeyboardSheet(open && step !== 'info');

    const handleClose = () => {
        closeDrawer(); // 열려 있을 때는 맨 위가 이 Drawer
        setTeamStates();
    };

    // 합주 잡기: 팀을 골라 둔 합주 잡기 Drawer로 바뀐다 (닫으면 팀 정보로 돌아온다, V-2 21차)
    const handleClickAddEnsemble = async (teamId: string) => {
        if (await checkTeamExists(teamId)) openAddEnsemble({ teamId, returnTo: 'teamInfo' });
    };

    // 팀 수정: 팀이 아직 있으면 PIN 단계로, PIN이 맞으면 지금 값을 채운 팀 수정 Drawer로 바뀐다
    // (V-3 13차, 이전: 옛 Drawer 5단계 PIN → 종류 → 이름 → 멤버 → 셋리. 합주 수정과 같은 흐름)
    const handleClickUpdateTeam = async (teamId: string) => {
        if (await checkTeamExists(teamId)) setStep('update');
    };

    // 팀 삭제: 팀이 아직 있으면 PIN 단계로 (이전: 옛 Drawer "PIN 입력해야 삭제돼요")
    const handleClickDeleteTeam = async (teamId: string) => {
        if (await checkTeamExists(teamId)) setStep('delete');
    };

    // 머리 색: 팀의 지금 색 (팀 목록·캘린더 블록과 같음)
    const color = shown
        ? (buildColorMap(teams)[shown.team.id] ?? defaultTeamColor)
        : defaultTeamColor;

    const content = (() => {
        if (!shown) return null;
        const { team } = shown;
        const setlist = team.desc[6]?.trim() ?? '';
        const pinned = pinnedIds.includes(team.id);
        // 팀 자동 삭제 날짜 (V-3 10차, 서버 팀 due). 없거나 계속 유지면 null이고 따로 적지 않는다
        const due = getRepeatEnd(teams.find((one) => one.id === team.id)?.due, dayjs());
        const summary = [team.type && formatTeamType(team.type), due && `${formatDate(due)}까지`]
            .filter(Boolean)
            .join(' · ');

        if (step !== 'info') {
            const deleting = step === 'delete';
            return (
                <div ref={scrollFadeRef} className={scrollAreaClassName}>
                    <div className="px-5 pt-[26px] pb-[calc(24px+env(safe-area-inset-bottom))] duration-200 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-right-4 md:px-7">
                        <div className="flex items-center justify-between">
                            <button
                                type="button"
                                aria-label="뒤로"
                                className={`${pressable} -ml-2 inline-flex size-10 items-center justify-center rounded-full text-neutral-700 hover:bg-neutral-100`}
                                onClick={() => setStep('info')}
                            >
                                <ChevronLeft className="size-6" aria-hidden />
                            </button>
                            <DrawerClose asChild>
                                <button
                                    type="button"
                                    aria-label="닫기"
                                    className={`${pressable} -mr-2 inline-flex size-10 items-center justify-center rounded-full text-neutral-700 hover:bg-neutral-100`}
                                >
                                    <X className="size-6" aria-hidden />
                                </button>
                            </DrawerClose>
                        </div>
                        {/* 어떤 팀인지 */}
                        <p className="mt-3 flex min-w-0 items-center gap-1.5 text-[14px] text-neutral-500">
                            <span
                                className="size-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: color }}
                            />
                            <span className="truncate">{team.name}</span>
                        </p>
                        <DrawerTitle className="mt-1.5 text-[24px] leading-tight font-bold text-ink md:text-[26px]">
                            {deleting ? '팀을 삭제할까요?' : '팀을 수정할까요?'}
                        </DrawerTitle>
                        {/* 삭제: 서버가 팀의 합주도 함께 지운다 */}
                        <DrawerDescription className="mt-1.5 text-[15px] break-keep text-neutral-500">
                            {deleting && '팀의 합주도 모두 삭제되고, 되돌릴 수 없어요. '}팀 PIN
                            4자리를 입력해 주세요
                        </DrawerDescription>
                        <div className="mt-7">
                            <PinStep
                                teamId={team.id}
                                // 확인 버튼은 되돌릴 수 없는 삭제만. 수정은 PIN이 맞는 즉시 팀 수정 Drawer로
                                confirmLabel={deleting ? '삭제하기' : undefined}
                                danger={deleting}
                                onConfirm={async () => {
                                    if (deleting) {
                                        await handleDeleteTeam(team.id); // Drawer를 모두 닫는다
                                    } else {
                                        openUpdateTeam({ ...team, due });
                                    }
                                    return true;
                                }}
                            />
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div ref={scrollFadeRef} className={scrollAreaClassName}>
                {/* 머리: 팀 색 (손잡이는 이 위에 겹쳐 그린다) */}
                <div
                    data-fade-skip // 머리가 다 지나간 뒤부터 위쪽을 흐린다 (팀 색이 흰색·검은색으로 흐려지지 않게)
                    className="px-5 pt-[26px] pb-6 text-white md:px-7"
                    style={{ backgroundColor: color }}
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 pt-1.5">
                            <DrawerTitle className="text-[28px] leading-tight font-bold break-keep text-white [overflow-wrap:anywhere] md:text-[32px]">
                                {team.name}
                            </DrawerTitle>
                            {/* 종류 · 자동 삭제 날짜 ("1/13(수)까지", 합주 정보의 반복 종료와 같은 모양) */}
                            <DrawerDescription
                                className={cn(
                                    'mt-1.5 text-[15px] text-white/90',
                                    !summary && 'sr-only',
                                )}
                            >
                                {summary || '팀 정보'}
                            </DrawerDescription>
                        </div>
                        <div className="-mr-2 flex shrink-0 items-center gap-1">
                            {/* 고정: 켜면 핀이 채워지고 바탕이 진해진다 */}
                            <button
                                type="button"
                                aria-label="팀 목록 맨 앞에 고정"
                                aria-pressed={pinned}
                                className={cn(
                                    pressable,
                                    'inline-flex size-10 items-center justify-center rounded-full',
                                    pinned ? 'bg-white/30 hover:bg-white/40' : 'hover:bg-white/20',
                                )}
                                onClick={() => {
                                    togglePinned(team.id);
                                    toast.success(
                                        pinned ? '고정을 풀었어요.' : '팀 목록 맨 앞에 고정했어요.',
                                    );
                                }}
                            >
                                <Pin
                                    className={cn('size-[22px]', pinned && 'fill-current')}
                                    aria-hidden
                                />
                            </button>
                            <DrawerClose asChild>
                                <button
                                    type="button"
                                    aria-label="닫기"
                                    className={`${pressable} inline-flex size-10 items-center justify-center rounded-full hover:bg-white/20`}
                                >
                                    <X className="size-6" aria-hidden />
                                </button>
                            </DrawerClose>
                        </div>
                    </div>

                    {/*
                      합주 잡기(주 동작) + 팀 수정·팀 삭제. 흰 버튼의 글씨는 팀 색 머리 위라 다크 모드에서도 검정.
                      합주 정보 Drawer와 모양이 비슷해 "팀 수정"·"팀 삭제"로 무엇을 바꾸는지 적는다 (V-3 8차).
                      360px 화면에서도 "합주 잡기"가 잘리지 않게 모바일은 14px 글씨·16px 아이콘
                    */}
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
                            className={`${pressable} ${boxShape} flex h-12 shrink-0 items-center justify-center gap-1 bg-white/20 px-3 text-[14px] font-medium hover:bg-white/30 md:h-13 md:px-4 md:text-[15px]`}
                            onClick={() => handleClickUpdateTeam(team.id)}
                        >
                            <Pencil className="size-4 md:size-[18px]" aria-hidden />팀 수정
                        </button>
                        <button
                            type="button"
                            className={`${pressable} ${boxShape} flex h-12 shrink-0 items-center justify-center gap-1 bg-white/20 px-3 text-[14px] font-medium hover:bg-white/30 md:h-13 md:px-4 md:text-[15px]`}
                            onClick={() => handleClickDeleteTeam(team.id)}
                        >
                            <Trash2 className="size-4 md:size-[18px]" aria-hidden />팀 삭제
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
                                            style={{ backgroundColor: eventColors[idx] }}
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

                    <h3 className="mt-6 text-[14px] text-neutral-500">셋리스트 및 팀 정보</h3>
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
        <Drawer
            open={open}
            onOpenChange={(next) => !next && handleClose()}
            // 키보드 위치 맞추기는 직접 한다 (keyboardSheet, 합주 정보 Drawer와 같음)
            repositionInputs={false}
        >
            <DrawerContent
                className={sheetClassName}
                style={pinSheet.style}
                overlayClassName={overlayClassName}
                // 손잡이는 머리 위에 겹친다 (정보: 팀 색 머리, PIN: 흰 머리)
                handleClassName={cn(
                    'absolute inset-x-0 top-2.5 z-10 mt-0 w-10',
                    step === 'info' ? 'bg-white/60' : 'bg-neutral-300',
                )}
            >
                {content}
            </DrawerContent>
            {pinSheet.cover}
        </Drawer>
    );
};

export default TeamInfoDrawer;
