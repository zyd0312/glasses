import wx from 'wx';
import { LanguageModel } from 'language-model';
import { GESTURE_REFERENCE_IMAGES } from './gesture-reference-images.js';

const SYSTEM_PROMPT = [
  '你是一个静态手势理解助手。',
  '你需要结合已有手语知识、常见手势知识，以及用户提供的参考示例图片来判断含义。',
  '不要把结果强行归一化到固定枚举，也不要只在预设标签中选择。',
  '如果可能有多个含义，请给出最多 3 个候选，并说明理由。',
  '当前输入只有单张静态图片，不能依赖运动轨迹；如果不确定，请明确说明不确定。',
  '你必须只输出 JSON，不要输出 Markdown，不要解释 JSON 之外的内容。',
].join('');

const USER_PROMPT = [
  '下面会先提供若干张手势参考示例图，然后提供一张待识别的相机照片。',
  '请优先参考这些示例图，同时结合你已有的手语知识和常见手势知识，判断最后一张照片里的单个静态手势可能表达什么。',
  '可以识别中文手语词、数字手势、常见日常手势或无法确定。',
  '请给出一个最可能含义，也可以给出最多 3 个候选含义。',
  '只输出 JSON，格式为 {"summary":"最可能含义","confidence":0.0,"candidates":[{"meaning":"候选含义","confidence":0.0,"reason":"简短原因"}],"notes":"补充说明"}。',
].join('');

function buildReferenceParts() {
  const parts = [];

  GESTURE_REFERENCE_IMAGES.forEach((reference, index) => {
    parts.push({
      type: 'text',
      text: `参考图 ${index + 1}：${reference.title}。${reference.description}`,
    });
    parts.push({
      type: 'image_url',
      image_url: { url: reference.imageUrl },
    });
  });

  return parts;
}

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

function clampConfidence(value) {
  return Math.max(0, Math.min(1, Number(value || 0)));
}

function normalizeCandidate(candidate) {
  return {
    meaning: String(candidate?.meaning || candidate?.label || candidate?.gesture || '').trim(),
    confidence: clampConfidence(candidate?.confidence),
    reason: String(candidate?.reason || '').trim(),
  };
}

function normalizeOpenResult(result) {
  const candidates = Array.isArray(result?.candidates)
    ? result.candidates.map(normalizeCandidate).filter((candidate) => candidate.meaning)
    : [];

  const summary = String(result?.summary || '').trim();
  const confidence = clampConfidence(result?.confidence);

  if (candidates.length === 0 && summary) {
    candidates.push({
      meaning: summary,
      confidence,
      reason: String(result?.notes || '').trim(),
    });
  }

  const topCandidate = candidates[0] || {
    meaning: '无法确定',
    confidence: 0,
    reason: String(result?.notes || '模型没有给出明确候选。').trim(),
  };

  return {
    gestureId: 'OPEN_RESULT',
    label: topCandidate.meaning,
    confidence: topCandidate.confidence,
    reason: topCandidate.reason || String(result?.notes || '').trim(),
    candidateTexts: candidates.slice(0, 3).map((candidate, index) => {
      const percent = Math.round(candidate.confidence * 100);
      const reason = candidate.reason ? `：${candidate.reason}` : '';
      return `${index + 1}. ${candidate.meaning}（${percent}%）${reason}`;
    }),
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

  const content = [
    {
      type: 'text',
      text: USER_PROMPT,
    },
    ...buildReferenceParts(),
    {
      type: 'text',
      text: '以上都是参考知识库示例图。下面这张才是待识别的相机照片，请只输出最后这张图片的识别结果。',
    },
    {
      type: 'image_url',
      image_url: { url: imageUrl },
    },
  ];

  const answer = await session.prompt([
    {
      role: 'user',
      content,
    },
  ]);

  return normalizeOpenResult(extractJson(answer));
}
