import wx from 'wx';
import { LanguageModel } from 'language-model';

const GESTURE_LABELS = {
  HELLO: '你好',
  THANKS: '谢谢',
  YES: '是',
  NO: '否',
  NEED_HELP: '我需要帮助',
  CANNOT_HEAR: '我听不见',
  PLEASE_WRITE: '请写下来',
  REPEAT: '请再说一遍',
  DONT_UNDERSTAND: '我不明白',
  HOW_MUCH: '多少钱',
  UNKNOWN: '无法确定',
};

const SYSTEM_PROMPT = [
  '你是一个手语短片段识别器。',
  '用户会按时间顺序提供多张图片，它们来自同一次 2 到 4 秒手语表达。',
  '你只能在给定候选短语中选择，不要输出候选以外的短语。',
  '你必须只输出 JSON，不要输出 Markdown，不要解释 JSON 之外的内容。',
].join('');

const USER_PROMPT = [
  '请根据接下来的多张连续画面，识别这 2 到 4 秒内表达的一个手语短语。',
  '候选短语只有：HELLO=你好, THANKS=谢谢, YES=是, NO=否, NEED_HELP=我需要帮助, ',
  'CANNOT_HEAR=我听不见, PLEASE_WRITE=请写下来, REPEAT=请再说一遍, ',
  'DONT_UNDERSTAND=我不明白, HOW_MUCH=多少钱, UNKNOWN=无法确定。',
  '如果手部不完整、动作不清楚、存在多个表达、或不属于候选短语，请返回 UNKNOWN。',
  '只输出 JSON，格式为 {"gestureId":"PLEASE_WRITE","label":"请写下来","confidence":0.0,"reason":"简短原因"}。',
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

  const photos = Array.isArray(photo) ? photo : [photo];
  const validPhotos = photos.filter((item) => item?.data);

  if (validPhotos.length === 0) {
    throw new Error('照片数据为空，请重新拍摄');
  }

  const session = await LanguageModel.create({
    initialPrompts: [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
    ],
  });

  const content = [
    {
      type: 'text',
      text: `${USER_PROMPT} 以下图片已按时间顺序排列，共 ${validPhotos.length} 帧。`,
    },
  ];

  validPhotos.forEach((item, index) => {
    const mimeType = item.mimeType || 'image/webp';
    const base64 = wx.arrayBufferToBase64(item.data);

    content.push({
      type: 'text',
      text: `第 ${index + 1} 帧：`,
    });

    content.push({
      type: 'image_url',
      image_url: {
        url: `data:${mimeType};base64,${base64}`,
      },
    });
  });

  const answer = await session.prompt([
    {
      role: 'user',
      content,
    },
  ]);

  return normalizeResult(extractJson(answer));
}
