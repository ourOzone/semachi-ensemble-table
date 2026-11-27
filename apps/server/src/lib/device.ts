// User-Agent(브라우저가 요청마다 보내는 "나는 어떤 기기·브라우저다" 문자열)를 사람이 읽을 모양으로 (B-7)
// 예: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) … Safari/604.1" → 모바일 · iOS 18.1 · Safari 18
import Bowser from 'bowser';

export interface Device {
    /** mobile · tablet · desktop · bot (모르면 비움) */
    kind?: string;
    os?: string;
    browser?: string;
    /** 기기 이름 (iPhone, SM-S918N 등, 알 때만) */
    model?: string;
}

const join = (...parts: (string | undefined)[]) => parts.filter(Boolean).join(' ') || undefined;
const major = (version: string | undefined) => version?.split('.')[0];

export function parseDevice(userAgent: string | undefined): Device {
    if (!userAgent) return {};
    const { browser, os, platform } = Bowser.parse(userAgent);
    return {
        kind: platform.type,
        os: join(os.name, os.version),
        browser: join(browser.name, major(browser.version)),
        model: join(platform.vendor, platform.model),
    };
}
