import { useState, useCallback, useRef, type Dispatch, type SetStateAction } from 'react';
import type { InputRef } from 'antd';
import Drawer from '@/components/common/Drawer';
import styled from 'styled-components';
import { checkNoticePin } from '@/api/notice';
import OkButton from '@/components/common/OkButton';
import PinInput from '@/components/common/PinInput';
import type { DrawerId } from '@/types';

const maxInput = 4;

interface DeleteNoticeDrawerProps {
    drawerId: DrawerId;
    /** 삭제할 공지 id */
    id: string;
    pin: string;
    setPin: Dispatch<SetStateAction<string>>;
    /** 삭제된 공지면 false (경고 표시와 초기화는 부모가 처리) */
    checkNoticeExists: (id: string) => Promise<boolean>;
    handleDeleteNotice: (id: string) => Promise<void>;
}

const DeleteNoticeDrawer = ({
    drawerId,
    id,
    pin,
    setPin,
    checkNoticeExists,
    handleDeleteNotice,
}: DeleteNoticeDrawerProps) => {
    const [error, setError] = useState(false); // 4자리 다 입력했는데 틀린 경우에만 true
    const focusInputRef = useRef<InputRef>(null);

    const onClose = useCallback(() => {
        setPin('');
        setError(false);
    }, [setPin]);

    const handlePinChange = useCallback(
        async (id: string, value: string) => {
            const numeric = value.replace(/\D/g, '');
            if (numeric.length <= maxInput) {
                setPin(numeric);
                setError(true);

                if (numeric.length === maxInput) {
                    // 4자리 모두 입력한 경우
                    try {
                        if (await checkNoticeExists(id)) {
                            // PIN 판별
                            const result = await checkNoticePin(numeric);
                            setError(!result);
                        }
                    } catch {
                        // 오류 알림 없음 (알림 기능 삭제, View 개편 때 새로 추가 예정)
                    }
                }
            }
        },
        [setPin],
    );

    return (
        <Drawer drawerId={drawerId} onClose={onClose} focusInputRef={focusInputRef}>
            <Title>PIN 입력해야 삭제돼요 🔑</Title>
            <InputWrapper>
                <StyledPinInput
                    ref={focusInputRef}
                    value={pin}
                    type="password"
                    onChange={(e) => handlePinChange(id, e.target.value)}
                    inputMode="numeric"
                    controls={false}
                    placeholder="숫자 4자리"
                    error={error}
                    status={pin.length === maxInput && error ? 'error' : undefined}
                    onKeyDown={(e) => {
                        // Enter 키 누를시
                        if (e.key === 'Enter' && !error && pin.length === maxInput) {
                            handleDeleteNotice(id);
                        }
                    }}
                />
            </InputWrapper>

            <OkButton
                label="진짜 삭제해요"
                onClick={() => handleDeleteNotice(id)}
                disabled={error || pin.length !== maxInput}
            />
        </Drawer>
    );
};

const Title = styled.span`
    font-size: 2.5rem;
    font-family: Bold;
`;

const InputWrapper = styled.div`
    margin: 4rem 0 2rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
    align-items: center;
`;

interface StyledPinInputProps {
    /** 항상 PIN 문자열 (antd Input의 value 타입을 좁힘) */
    value: string;
    /** PIN 4자리를 다 입력했는데 틀린 경우 true */
    error: boolean;
    /** Input에는 없는 prop(InputNumber 전용)이라 효과 없이 DOM으로 전달됨 (3단계 정리 대상) */
    controls?: boolean;
}

const StyledPinInput = styled(PinInput)<StyledPinInputProps>`
    color: ${({ theme, value, error }) => (value.length === maxInput && error ? theme.danger : theme.title)};
`;

export default DeleteNoticeDrawer;
