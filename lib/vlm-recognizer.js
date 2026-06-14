import wx from 'wx';
import { LanguageModel } from 'language-model';

const GESTURE_LABELS = {
  HELLO: '你好',
  THANKS: '谢谢',
  YES: '是',
  NO: '否',
  HELP: '帮助',
  UNKNOWN: '无法确定',
};

const SYSTEM_PROMPT = [
  '你是一个静态手势识别器。',
  '你只能在给定候选手势中选择，不要输出候选以外的手势。',
  '你必须只输出 JSON，不要输出 Markdown，不要解释 JSON 之外的内容。',
].join('');

const USER_PROMPT = [
  '请识别图片中的单个静态手势。候选手势只有：',
  'HELLO=你好, THANKS=谢谢, YES=是, NO=否, HELP=帮助, UNKNOWN=无法确定。',
  '如果图片中没有完整手部、手势不清楚、存在多个手势、或不属于候选手势，请返回 UNKNOWN。',
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
