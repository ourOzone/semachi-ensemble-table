import { useCallback } from "react";
import Drawer from "components/common/Drawer";
import styled from "styled-components";
import { Slider } from "antd";
import { useDrawerContext } from "context";
import { idx2hour } from "constants";

const drawerId = 'addEnsemble3';

const marks = idx2hour.reduce((acc, curr, index) => {
    if (index % 2 === 0) {
      acc[index] = curr;
    }
    return acc;
}, {});  

const AddEnsembleDrawer3 = ({ setStartDate }) => {
    const { openDrawer } = useDrawerContext();

    const handleClick = useCallback((repeat) => {
    }, []);

    return (
        <Drawer drawerId={drawerId}>
            <Title>시간은요 🕗</Title>
            <SliderWrapper>
                <StyledSlider
                    vertical
                    range
                    reverse
                    max={30}
                    marks={marks}
                    defaultValue={[0, 2]}
                    tooltip={{ open: false }}
                    dots={false}
                />
            </SliderWrapper>
        </Drawer>
    );
};

const Title = styled.span`
    font-size: 2.5rem;
    font-family: Bold;
`;

const SliderWrapper = styled.div`
    height: 45rem;
    display: flex;
    margin-top: 4rem;
`;

const StyledSlider = styled(Slider)`
    height: 100% !important;

    .ant-slider-mark {
        margin-left: 1rem;
        & * {
            font-size: 1.5rem;
        }
    }

    .ant-slider-rail {
        width: 1rem !important;
    }
    .ant-slider-track {
        width: 1rem !important;
    }
    .ant-slider-handle {
        width: 2rem;
        height: 2rem;
    }
    .ant-slider-handle::after {
        width: 2rem !important;
        height: 2rem !important;
        transform: translate(-12.5%, -25%) !important;
    }

    .ant-slider-dot {
        display: none !important;
    }
`;

export default AddEnsembleDrawer3;
