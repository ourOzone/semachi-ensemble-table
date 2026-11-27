import { useQuery } from '@tanstack/react-query';
import { Bell, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { isNotFound } from '@/api/index';
import { noticeExists } from '@/api/notice';
import { Skeleton } from '@/components/ui/skeleton';
import {
    noticesQueryOptions,
    useAddNotice,
    useDeleteNotice,
    useNotices,
    useRefreshNotices,
} from '@/queries/notes';
import { useDrawerStore } from '@/stores/drawer';
import NoticeDrawer from './notice-drawer';

// 공지 카드 + 공지 Drawer (View 개편 V-5, 카드 모양은 V-3 1차에 미리 만듦).
// 올리기·삭제 결과는 알림으로 (이전: 알림 없음). Drawer는 결과에 따라 목록으로 돌아오거나 그 단계에 머문다

const CHECK_FAILED = '확인하지 못했어요. 잠시 후 다시 시도해 주세요.';

const Notice = () => {
    const notices = useNotices();
    // 처음 불러오는 동안은 글씨 자리에 회색 상자 (V-3 1차)
    const { isPending } = useQuery(noticesQueryOptions);
    const refreshNotices = useRefreshNotices();
    const { mutateAsync: addNoticeAsync } = useAddNotice();
    const { mutateAsync: deleteNoticeAsync } = useDeleteNotice();
    const openDrawer = useDrawerStore((state) => state.openDrawer);

    const handleAddNotice = async (text: string, pin: string) => {
        try {
            await addNoticeAsync({ text, pin });
        } catch {
            toast.error('저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
            return false;
        }
        toast.success('공지를 올렸어요.');
        return true;
    };

    // 삭제 X: 이미 삭제됐으면(404) 알리고 목록을 다시 불러온다 (Drawer는 목록에 머묾), 확인 요청 자체가 실패하면 알림
    // (팀·합주·날적이와 같음. 이전: PIN을 넣는 순간 확인하고, 실패하면 알림 없이 Drawer를 모두 닫음)
    const checkNoticeExists = async (id: string) => {
        try {
            await noticeExists(id);
            return true;
        } catch (err) {
            if (isNotFound(err)) {
                refreshNotices();
                toast.error('이미 삭제된 공지예요.');
            } else {
                toast.error(CHECK_FAILED);
            }
            return false;
        }
    };

    // 삭제: 그새 삭제됐어도(404) 결과는 같아 "삭제했어요." 실패하면 알리고 PIN부터 다시
    const handleDeleteNotice = async (id: string, pin: string) => {
        try {
            await deleteNoticeAsync({ id, pin });
        } catch (err) {
            if (!isNotFound(err)) {
                toast.error('삭제하지 못했어요. 잠시 후 다시 시도해 주세요.');
                return false;
            }
        }
        toast.success('삭제했어요.');
        return true;
    };

    // 맨 위 공지의 첫 줄. 누르면 공지 Drawer
    const first = notices[0]?.text.split('\n')[0];

    return (
        <>
            {/*
              공지 카드 (V-3 1차에 미리 만듦, V-5 범위): 파란 바탕 antd 버튼 → 흰 카드 (합주판과 같은 모양).
              공지가 여러 개면 오른쪽에 나머지 개수
            */}
            <section className="ui w-full max-w-[1080px]">
                <button
                    type="button"
                    aria-busy={isPending}
                    onClick={() => openDrawer('notice')}
                    className="flex w-full items-center gap-3 rounded-card bg-surface px-4 py-4 text-left shadow-card transition-[background-color,scale] duration-150 hover:bg-neutral-50 active:scale-[0.99] md:gap-4 md:px-7 md:py-5"
                >
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-ink md:size-12">
                        <Bell className="size-5 md:size-6" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                        {/* 작은 "공지" 글씨는 뺐다 (V-5). 읽기 프로그램용으로만 */}
                        <span className="sr-only">공지: </span>
                        {isPending ? (
                            <Skeleton className="h-5 w-48 max-w-full md:h-6 md:w-64" />
                        ) : (
                            <span
                                className={
                                    first
                                        ? 'block truncate text-[16px] font-bold text-ink md:text-[19px]'
                                        : 'block truncate text-[16px] text-neutral-500 md:text-[19px]'
                                }
                            >
                                {first || '공지가 딱히 없네요'}
                            </span>
                        )}
                    </span>
                    {notices.length > 1 && (
                        <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[12px] font-bold text-neutral-600 md:text-[13px]">
                            +{notices.length - 1}
                        </span>
                    )}
                    <ChevronRight className="size-5 shrink-0 text-neutral-400" aria-hidden />
                </button>
            </section>
            <NoticeDrawer
                notices={notices}
                onAdd={handleAddNotice}
                checkExists={checkNoticeExists}
                onDelete={handleDeleteNotice}
            />
        </>
    );
};

export default Notice;
