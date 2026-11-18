import { useState, useRef, useCallback } from 'react';
import Drawer from '@/components/common/Drawer';
import styled from 'styled-components';
import { checkTeamPin } from '@/api/team';
import { useTeamContext, useDrawerContext } from '@/context';
import PinInput from '@/components/common/PinInput';
import useMessage from '@/hooks/useMessage';

const maxInput = 4;

const UpdateTeamDrawer1 = ({ drawerId, checkTeamExists }) => {
    const { id, orgType, orgName, orgDesc, pin, setPin, setTeamStates } = useTeamContext();
    const { openDrawer } = useDrawerContext();
    const [error, setError] = useState(false); // 4자리 다 입력했는데 틀린 경우에만 true
    const [message, contextHolder] = useMessage();
    const focusInputRef = useRef(null);

    const onClose = useCallback(
        (id, orgType, orgName, orgDesc) => {
            // 수정하기 전 상태로 돌려놓기
            setTeamStates(id, orgType, orgName, orgDesc, '');
            setError(false);
        },
        [setTeamStates],
    );

    const handlePinChange = useCallback(
        async (value, id) => {
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
                        message.error(
                            '인터넷이 불안정하거나 서버에 문제가 있어요. 잠시 후 다시 시도해주세요.',
                        );
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
            {contextHolder}
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
                    status={pin.length === 4 && error ? 'error' : null}
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

const StyledInput = styled(PinInput)`
    color: ${({ theme, value, error }) => (value.length === maxInput && error ? theme.danger : theme.title)};
`;

export default UpdateTeamDrawer1;
