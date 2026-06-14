import wx from 'wx';
import { LanguageModel } from 'language-model';
import { getGestureLabels, loadGestureKnowledge } from './gesture-knowledge.js';

const UNKNOWN_RESULT = {
  id: 'UNKNOWN',
  label: '无法确定',
};

const SYSTEM_PROMPT = [
  '你是一个受限知识库静态手势分类器。',
  '你只能在用户提供的参考知识库手势中选择，或选择 UNKNOWN。',
  '不要输出知识库以外的手势名称、常识猜测或开放式解释。',
  '如果画面中没有完整清晰的手、手势不在知识库中、角度遮挡严重、或候选非常接近且无法区分，必须返回 UNKNOWN。',
  '当前只有单张静态图片，不能依赖运动轨迹；只判断最后一张待识别图片。',
  '只输出 JSON，不要输出 Markdown，不要输出 JSON 之外的内容。',
].join('');

function buildGestureCatalogText(knowledge) {
  return knowledge
    .map(
      (entry, index) =>
        `${index + 1}. id=${entry.id}; label=${entry.label}; pinyin=${entry.pinyin}; ` +
        `静态判别要点=${entry.staticCue}; 完整描述=${entry.description}`
    )
    .join('\n');
}

function buildUserPrompt(knowledge) {
  const allowedIds = knowledge.map((entry) => entry.id).join(', ');

  return [
    '任务：识别最后一张待测相机照片中的静态手势。',
    '',
    '可选 gestureId 只能是以下知识库 id 或 UNKNOWN：',
    `${allowedIds}, UNKNOWN`,
    '',
    '知识库文本：',
    buildGestureCatalogText(knowledge),
    '',
    '判别规则：',
    '1. 先确认待测照片里是否有清晰、完整、可判断的手势。',
    '2. 再逐一比较参考图的手形、手指伸屈、双手相对位置、手掌朝向和整体构型。',
    '3. 双手手势必须看到两只手或关键相对位置；单手/双手数量不匹配时降低置信度。',
    '4. 对含有动态描述的词，只按参考图和静态构型判断，不要想象运动过程。',
    '5. 只有在与某个参考图高度相似时才返回该 gestureId；否则返回 UNKNOWN。',
    '',
    '输出 JSON 格式：',
    '{"gestureId":"stand","confidence":0.0,"candidates":[{"gestureId":"stand","confidence":0.0,"reason":"简短原因"}],"reason":"简短原因","quality":"good|partial|poor"}',
  ].join('\n');
}

function buildReferenceParts(knowledge) {
  const parts = [];

  knowledge.forEach((reference, index) => {
    parts.push({
      type: 'text',
      text:
        `参考图 ${index + 1}: id=${reference.id}; label=${reference.label}; ` +
        `静态判别要点：${reference.staticCue}`,
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

function createKnowledgeLookup(knowledge) {
  const byId = new Map();
  const byLabel = new Map();

  knowledge.forEach((entry) => {
    byId.set(entry.id, entry);
    byLabel.set(entry.label, entry);
  });

  return { byId, byLabel };
}

function resolveGestureEntry(candidate, lookup) {
  const rawId = String(
    candidate?.gestureId || candidate?.id || candidate?.gesture_id || candidate?.label || ''
  ).trim();
  const rawMeaning = String(candidate?.meaning || candidate?.summary || '').trim();

  if (!rawId || rawId.toUpperCase() === UNKNOWN_RESULT.id) {
    return null;
  }

  return lookup.byId.get(rawId) || lookup.byLabel.get(rawId) || lookup.byLabel.get(rawMeaning) || null;
}

function normalizeCandidate(candidate, lookup) {
  const entry = resolveGestureEntry(candidate, lookup);
  if (!entry) {
    return null;
  }

  return {
    gestureId: entry.id,
    label: entry.label,
    confidence: clampConfidence(candidate?.confidence),
    reason: String(candidate?.reason || '').trim(),
  };
}

function normalizeResult(result, knowledge) {
  const lookup = createKnowledgeLookup(knowledge);
  const normalizedCandidates = Array.isArray(result?.candidates)
    ? result.candidates
        .map((candidate) => normalizeCandidate(candidate, lookup))
        .filter(Boolean)
        .sort((left, right) => right.confidence - left.confidence)
    : [];

  const directEntry = resolveGestureEntry(result, lookup);
  const directConfidence = clampConfidence(result?.confidence);

  if (
    directEntry &&
    !normalizedCandidates.some((candidate) => candidate.gestureId === directEntry.id)
  ) {
    normalizedCandidates.unshift({
      gestureId: directEntry.id,
      label: directEntry.label,
      confidence: directConfidence,
      reason: String(result?.reason || '').trim(),
    });
  }

  const quality = String(result?.quality || '').toLowerCase();
  const shouldRejectForQuality = quality === 'poor' && directConfidence < 0.85;
  const topCandidate = normalizedCandidates[0];
  const shouldRejectForConfidence = !topCandidate || topCandidate.confidence < 0.5;

  if (shouldRejectForQuality || shouldRejectForConfidence) {
    const reason =
      String(result?.reason || '').trim() ||
      (shouldRejectForQuality ? '画面质量不足，无法可靠匹配知识库。' : '没有足够可靠的知识库匹配。');

    return {
      gestureId: UNKNOWN_RESULT.id,
      label: UNKNOWN_RESULT.label,
      confidence: 0,
      reason,
      candidateTexts: normalizedCandidates.slice(0, 3).map(formatCandidateText),
      source: 'knowledge-vlm',
    };
  }

  return {
    gestureId: topCandidate.gestureId,
    label: topCandidate.label,
    confidence: topCandidate.confidence,
    reason: topCandidate.reason || String(result?.reason || '').trim(),
    candidateTexts: normalizedCandidates.slice(0, 3).map(formatCandidateText),
    source: 'knowledge-vlm',
  };
}

function formatCandidateText(candidate, index) {
  const percent = Math.round(candidate.confidence * 100);
  const reason = candidate.reason ? `：${candidate.reason}` : '';
  return `${index + 1}. ${candidate.label}（${percent}%）${reason}`;
}

function toArrayBuffer(data) {
  if (data instanceof ArrayBuffer) {
    return data;
  }

  if (ArrayBuffer.isView(data)) {
    return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  }

  return null;
}

export async function recognizeStaticGesture(photo) {
  const availability = await LanguageModel.availability();
  if (availability !== 'available') {
    throw new Error('多模态模型不可用，请检查智能体模型配置');
  }

  const arrayBuffer = toArrayBuffer(photo?.data);
  if (!arrayBuffer) {
    throw new Error('照片数据为空，请重新拍摄');
  }

  const knowledge = await loadGestureKnowledge();
  if (!knowledge.length) {
    throw new Error('手势知识库为空，请检查参考库配置');
  }

  const mimeType = photo.mimeType || 'image/webp';
  const imageUrl = `data:${mimeType};base64,${wx.arrayBufferToBase64(arrayBuffer)}`;

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
      text: buildUserPrompt(knowledge),
    },
    ...buildReferenceParts(knowledge),
    {
      type: 'text',
      text:
        '以上都是参考知识库示例。下面这张才是待识别照片。' +
        '请只判断下面这张照片，并严格返回知识库 gestureId 或 UNKNOWN。',
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

  return normalizeResult(extractJson(answer), knowledge);
}

export function getSupportedGestures() {
  return getGestureLabels();
}
