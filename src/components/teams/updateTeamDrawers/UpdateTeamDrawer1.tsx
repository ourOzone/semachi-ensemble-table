import { useState, useRef, useCallback } from 'react';
import type { InputRef } from 'antd';
import Drawer from '@/components/common/Drawer';
import styled from 'styled-components';
import { checkTeamPin } from '@/api/team';
import { useTeamContext, useDrawerContext } from '@/context';
import PinInput from '@/components/common/PinInput';
import type { DrawerId } from '@/types';
import type { CheckTeamExists } from '../types';

const maxInput = 4;

interface UpdateTeamDrawer1Props {
    drawerId: DrawerId;
    checkTeamExists: CheckTeamExists;
}

const UpdateTeamDrawer1 = ({ drawerId, checkTeamExists }: UpdateTeamDrawer1Props) => {
    const { id, orgType, orgName, orgDesc, pin, setPin, setTeamStates } = useTeamContext();
    const { openDrawer } = useDrawerContext();
    const [error, setError] = useState(false); // 4자리 다 입력했는데 틀린 경우에만 true
    const focusInputRef = useRef<InputRef>(null);

    const onClose = useCallback(
        (id: string, orgType: string, orgName: string, orgDesc: string[]) => {
            // 수정하기 전 상태로 돌려놓기
            setTeamStates(id, orgType, orgName, orgDesc, '');
            setError(false);
        },
        [setTeamStates],
    );

    const handlePinChange = useCallback(
        async (value: string, id: string) => {
            const numeric = value.replace(/\D/g, '');
            if (numeric.length <= maxInput) {
                setPin(numeric);
                setError(true);

                if (numeric.length === maxInput) {
                    // 4자리 모두 입력한 경우
                    try {
                        if (await checkTeamExists(id)) {
                            // PIN 판별
                            const result = await checkTeamPin(id, numeric);

                            if (result) {
                                setPin('');
                                openDrawer('updateTeam2');
                            } else {
                                setError(true);
                            }
                        }
                    } catch {
                        // 오류 알림 없음 (알림 기능 삭제, View 개편 때 새로 추가 예정)
                    }
                }
            }
        },
        [setPin, openDrawer],
    );

    return (
        <Drawer
            drawerId={drawerId}
            onClose={() => onClose(id, orgType, orgName, orgDesc)}
            focusInputRef={focusInputRef}
        >
            <Title>PIN 입력해야 수정돼요 🔑</Title>
            <InputWrapper>
                <StyledInput
                    ref={focusInputRef}
                    value={pin}
                    type="password"
                    onChange={(e) => handlePinChange(e.target.value, id)}
                    inputMode="numeric"
                    controls={false}
                    placeholder="숫자 4자리"
                    error={error}
                    status={pin.length === 4 && error ? 'error' : undefined}
                />
            </InputWrapper>
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

interface StyledInputProps {
    /** 항상 PIN 문자열 (antd Input의 value 타입을 좁힘) */
    value: string;
    /** PIN 4자리를 다 입력했는데 틀린 경우 true */
    error: boolean;
    /** Input에는 없는 prop(InputNumber 전용)이라 효과 없이 DOM으로 전달됨 (3단계 정리 대상) */
    controls?: boolean;
}

const StyledInput = styled(PinInput)<StyledInputProps>`
    color: ${({ theme, value, error }) => (value.length === maxInput && error ? theme.danger : theme.title)};
`;

export default UpdateTeamDrawer1;
