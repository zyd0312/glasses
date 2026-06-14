const MOCK_RESULTS = [
  {
    gestureId: 'HELLO',
    label: '你好',
    confidence: 0.92,
    reason: '手掌朝向清晰，符合问候手势。',
  },
  {
    gestureId: 'THANKS',
    label: '谢谢',
    confidence: 0.86,
    reason: '检测到感谢类静态姿态。',
  },
  {
    gestureId: 'YES',
    label: '是',
    confidence: 0.8,
    reason: '姿态接近肯定手势。',
  },
  {
    gestureId: 'NO',
    label: '否',
    confidence: 0.72,
    reason: '可能是否定手势，建议确认。',
  },
  {
    gestureId: 'HELP',
    label: '帮助',
    confidence: 0.78,
    reason: '可能是求助手势，仅做提示。',
  },
  {
    gestureId: 'UNKNOWN',
    label: '无法确定',
    confidence: 0.38,
    reason: '手部不完整或不属于当前候选手势。',
  },
];

let mockIndex = 0;

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function recognizeStaticGesture() {
  await delay(650);

  const result = MOCK_RESULTS[mockIndex % MOCK_RESULTS.length];
  mockIndex += 1;

  return {
    ...result,
    source: 'mock',
  };
}
