import wx from 'wx';
import { LanguageModel } from 'language-model';

const GESTURE_LABELS = {
  HELLO: '你好',
  THANKS: '谢谢',
  YES: '是',
  NO: '否',
  HELP: '帮助',
  LETTER_A: '字母 A',
  LETTER_B: '字母 B',
  LETTER_C: '字母 C',
  LETTER_D: '字母 D',
  LETTER_E: '字母 E',
  LETTER_F: '字母 F',
  LETTER_G: '字母 G',
  LETTER_H: '字母 H',
  LETTER_I: '字母 I',
  LETTER_J: '字母 J',
  LETTER_K: '字母 K',
  LETTER_L: '字母 L',
  LETTER_M: '字母 M',
  LETTER_N: '字母 N',
  LETTER_O: '字母 O',
  LETTER_P: '字母 P',
  LETTER_Q: '字母 Q',
  LETTER_R: '字母 R',
  LETTER_S: '字母 S',
  LETTER_T: '字母 T',
  LETTER_U: '字母 U',
  LETTER_V: '字母 V',
  LETTER_W: '字母 W',
  LETTER_X: '字母 X',
  LETTER_Y: '字母 Y',
  LETTER_Z: '字母 Z',
  UNKNOWN: '无法确定',
};

const CANDIDATE_TEXT = Object.entries(GESTURE_LABELS)
  .map(([gestureId, label]) => `${gestureId}=${label}`)
  .join(', ');

const SYSTEM_PROMPT = [
  '你是一个静态手势识别器。',
  '你只能在给定候选手势中选择，不要输出候选以外的手势。',
  '你支持基础手势和英文字母手指字母识别，但当前输入只有单张静态图片。',
  '你必须只输出 JSON，不要输出 Markdown，不要解释 JSON 之外的内容。',
].join('');

const USER_PROMPT = [
  '请识别图片中的单个静态手势。候选手势只有：',
  CANDIDATE_TEXT,
  '。如果图片中没有完整手部、手势不清楚、存在多个手势、或不属于候选手势，请返回 UNKNOWN。',
  '如果 J 或 Z 这类通常依赖运动轨迹的字母无法从静态图片可靠判断，请返回 UNKNOWN。',
  '只输出 JSON，格式为 {"gestureId":"HELLO","label":"你好","confidence":0.0,"reason":"简短原因"}。',
].join('');

function extractJson(text) {
  const raw = String(text || '').trim();

  try {
    return JSON.parse(raw);
  } catch (_) {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error('模型未返回可解析结果');
    }

    return JSON.parse(match[0]);
  }
}

function normalizeResult(result) {
  const gestureId = GESTURE_LABELS[result?.gestureId] ? result.gestureId : 'UNKNOWN';
  const confidence = Math.max(0, Math.min(1, Number(result?.confidence || 0)));

  return {
    gestureId,
    label: GESTURE_LABELS[gestureId],
    confidence,
    reason: String(result?.reason || ''),
    source: 'language-model',
  };
}

export async function recognizeStaticGesture(photo) {
  const availability = await LanguageModel.availability();
  if (availability !== 'available') {
    throw new Error('多模态模型不可用，请检查智能体模型配置');
  }

  if (!photo?.data) {
    throw new Error('照片数据为空，请重新拍摄');
  }

  const mimeType = photo.mimeType || 'image/webp';
  const base64 = wx.arrayBufferToBase64(photo.data);
  const imageUrl = `data:${mimeType};base64,${base64}`;

  const session = await LanguageModel.create({
    initialPrompts: [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
    ],
  });

  const answer = await session.prompt([
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: USER_PROMPT,
        },
        {
          type: 'image_url',
          image_url: { url: imageUrl },
        },
      ],
    },
  ]);

  return normalizeResult(extractJson(answer));
}
