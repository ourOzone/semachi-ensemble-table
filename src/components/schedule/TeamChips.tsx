import { useState } from 'react';
import { LayoutGrid, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

// 팀 목록 (View 개편 V-2). 기본은 한 줄로 줄이고(넘치는 부분은 오른쪽으로 흐려짐), "전체"를 누르면 모두 펼친다.

export interface Chip {
    key: string;
    name: string;
    color: string;
    onClick: () => void;
}

interface TeamChipsProps {
    teams: Chip[];
    /** 팀 아닌 일정 (소모임·회의 등). 팀 뒤에 이어서 보여준다 */
    events: Chip[];
    onAddTeam: () => void;
}

const TeamChips = ({ teams, events, onAddTeam }: TeamChipsProps) => {
    const [expanded, setExpanded] = useState(false);

    return (
        // "전체" 버튼도 같은 줄에 두어, 펼치면 버튼 아래까지 화면 폭 전체로 줄바꿈된다
        <div
            className={cn(
                'mt-4 flex gap-1.5',
                expanded ? 'flex-wrap' : 'overflow-hidden mask-r-from-85% mask-r-to-100%',
            )}
        >
            <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setExpanded((prev) => !prev)}
                className={cn(
                    'inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-neutral-300 bg-white px-3 text-[13px] font-medium text-neutral-800',
                    expanded && 'border-neutral-800',
                )}
            >
                <LayoutGrid className="size-3.5" aria-hidden />
                전체
                <span className="text-neutral-500">{teams.length}</span>
            </button>
            {teams.map((chip) => (
                <ChipButton key={chip.key} chip={chip} />
            ))}
            <button
                type="button"
                onClick={onAddTeam}
                className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-dashed border-blue-500 bg-white px-3 text-[13px] font-medium whitespace-nowrap text-neutral-800"
            >
                <Plus className="size-3.5" aria-hidden />팀 추가
            </button>
            {/* 펼쳤을 때는 팀 아닌 일정을 새 줄에서 시작 */}
            {expanded && <div aria-hidden className="basis-full" />}
            {events.map((chip) => (
                <ChipButton key={chip.key} chip={chip} />
            ))}
        </div>
    );
};

function ChipButton({ chip }: { chip: Chip }) {
    return (
        <button
            type="button"
            onClick={chip.onClick}
            className="h-8 shrink-0 rounded-full px-3 text-[13px] font-medium whitespace-nowrap text-white"
            style={{ backgroundColor: chip.color }}
        >
            {chip.name}
        </button>
    );
}

export default TeamChips;
