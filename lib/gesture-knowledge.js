import wx from 'wx';
import standAsset, { mimeType as standMimeType } from '../assets/gesture-knowledge/reference-stand.jpg';
import sitAsset, { mimeType as sitMimeType } from '../assets/gesture-knowledge/reference-sit.jpg';
import andAsset, { mimeType as andMimeType } from '../assets/gesture-knowledge/reference-and.jpg';
import insideAsset, { mimeType as insideMimeType } from '../assets/gesture-knowledge/reference-inside.jpg';
import chairAsset, { mimeType as chairMimeType } from '../assets/gesture-knowledge/reference-chair.jpg';
import bedAsset, { mimeType as bedMimeType } from '../assets/gesture-knowledge/reference-bed.jpg';
import newYearDayAsset, {
  mimeType as newYearDayMimeType,
} from '../assets/gesture-knowledge/reference-new-year-day.jpg';
import nervousAsset, { mimeType as nervousMimeType } from '../assets/gesture-knowledge/reference-nervous.jpg';
import homeAsset, { mimeType as homeMimeType } from '../assets/gesture-knowledge/reference-home.jpg';
import personAsset, { mimeType as personMimeType } from '../assets/gesture-knowledge/reference-person.jpg';
import chineseNumbersAsset, {
  mimeType as chineseNumbersMimeType,
} from '../assets/gesture-knowledge/reference-chinese-numbers.jpg';
import saluteAsset, { mimeType as saluteMimeType } from '../assets/gesture-knowledge/reference-salute.jpg';
import loveAsset, { mimeType as loveMimeType } from '../assets/gesture-knowledge/reference-love.jpg';
import goodAsset, { mimeType as goodMimeType } from '../assets/gesture-knowledge/reference-good.jpg';

const RAW_GESTURE_KNOWLEDGE = [
  {
    id: 'stand',
    label: '站',
    pinyin: 'zhan',
    asset: standAsset,
    mimeType: standMimeType,
    staticCue: '左手横伸，右手食指和中指分开，指尖朝下，立在左手掌心上。',
    description: '左手横伸；右手食指、中指分开，指尖朝下，立于左手掌心上。可根据实际表示站的动作。',
  },
  {
    id: 'sit',
    label: '坐',
    pinyin: 'zuo',
    asset: sitAsset,
    mimeType: sitMimeType,
    staticCue: '左手横伸，右手伸拇指和小指，置于左手掌心上。',
    description: '左手横伸；右手伸拇指、小指，置于左手掌心上。可根据实际表示坐的动作。',
  },
  {
    id: 'and',
    label: '和',
    pinyin: 'he',
    asset: andAsset,
    mimeType: andMimeType,
    staticCue: '双手直立，掌心左右相对，五指微曲，双手靠近或位于中间。',
    description: '双手直立，掌心左右相对，五指微曲，从两侧向中间移动；也可表示连词和。',
  },
  {
    id: 'inside',
    label: '内',
    pinyin: 'nei',
    asset: insideAsset,
    mimeType: insideMimeType,
    staticCue: '左手横立，右手食指直立，位于左手掌心内侧附近。',
    description: '左手横立；右手食指直立，在左手掌心内向下移动。可根据实际表示里面的意思。',
  },
  {
    id: 'chair',
    label: '椅子',
    pinyin: 'yizi',
    asset: chairAsset,
    mimeType: chairMimeType,
    staticCue: '左手直立掌心向右，右手五指与手掌成弯形，指尖抵于左手掌心。',
    description: '左手直立，掌心向右；右手五指与手掌成弯形，指尖抵于左手掌心，仿椅子形状。',
  },
  {
    id: 'bed',
    label: '床',
    pinyin: 'chuang',
    asset: bedAsset,
    mimeType: bedMimeType,
    staticCue: '双手食指和小指直立，中指和无名指与手掌成直角，指尖相抵。',
    description: '双手食指、小指直立，中指、无名指与手掌成直角，指尖相抵，拇指贴于食指，仿床的形状。',
  },
  {
    id: 'new-year-day',
    label: '元旦',
    pinyin: 'yuandan',
    asset: newYearDayAsset,
    mimeType: newYearDayMimeType,
    staticCue: '双手食指横伸，手背向外，一上一下排列。',
    description: '双手食指横伸，手背向外，一上一下，表示公历一月一日。',
  },
  {
    id: 'nervous',
    label: '紧张',
    pinyin: 'jinzhang',
    asset: nervousAsset,
    mimeType: nervousMimeType,
    staticCue: '双手五指相捏，指尖上下相对，靠近或互碰。',
    description: '双手五指相捏，指尖上下相对，互碰几下，面露紧张表情。',
  },
  {
    id: 'home',
    label: '家',
    pinyin: 'jia',
    asset: homeAsset,
    mimeType: homeMimeType,
    staticCue: '双手搭成屋顶形。',
    description: '双手搭成屋顶形，表示家、家庭、房子或房。',
  },
  {
    id: 'person',
    label: '人',
    pinyin: 'ren',
    asset: personAsset,
    mimeType: personMimeType,
    staticCue: '双手食指搭成人字形。',
    description: '双手食指搭成人字形，表示人。',
  },
  {
    id: 'chineseNumber',
    label: '中国数字',
    pinyin: 'zhongguoshuzi',
    asset: chineseNumbersAsset,
    mimeType: chineseNumbersMimeType,
    staticCue: '参考图包含中国数字手势，应按图中数字手形判断。',
    description: '中国数字手势参考图，用于辅助识别常见数字手势。',
  },
  {
    id: 'salute',
    label: '敬礼',
    pinyin: 'jingli',
    asset: saluteAsset,
    mimeType: saluteMimeType,
    staticCue: '右手五指并拢举至额前。',
    description: '右手五指并拢举至额前，表示敬礼。',
  },
  {
    id: 'love',
    label: '爱',
    pinyin: 'ai',
    asset: loveAsset,
    mimeType: loveMimeType,
    staticCue: '按参考图中的手形表达爱、喜欢或爱心含义。',
    description: '根据参考图中的手形表达爱、喜欢或爱心含义。',
  },
  {
    id: 'good',
    label: '好',
    pinyin: 'hao',
    asset: goodAsset,
    mimeType: goodMimeType,
    staticCue: '按参考图中的手形表达好、赞同或认可含义。',
    description: '根据参考图中的手形表达好、赞同或认可含义。',
  },
];

let cachedGestureKnowledge = null;

function arrayBufferToBase64(buffer) {
  if (typeof wx !== 'undefined' && typeof wx.arrayBufferToBase64 === 'function') {
    return wx.arrayBufferToBase64(buffer);
  }

  if (typeof btoa === 'function') {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  }

  throw new Error('当前环境不支持图片资源转 base64');
}

async function assetToDataUrl(asset, mimeType) {
  if (!asset || typeof asset.arrayBuffer !== 'function') {
    throw new Error('知识库图片资源不可用');
  }

  const buffer = await asset.arrayBuffer();
  return `data:${mimeType || 'image/jpeg'};base64,${arrayBufferToBase64(buffer)}`;
}

export function getGestureLabels() {
  return RAW_GESTURE_KNOWLEDGE.map(({ id, label, pinyin, description, staticCue }) => ({
    id,
    label,
    pinyin,
    description,
    staticCue,
  }));
}

export async function loadGestureKnowledge() {
  if (cachedGestureKnowledge) {
    return cachedGestureKnowledge;
  }

  cachedGestureKnowledge = await Promise.all(
    RAW_GESTURE_KNOWLEDGE.map(async (entry) => ({
      id: entry.id,
      label: entry.label,
      pinyin: entry.pinyin,
      description: entry.description,
      staticCue: entry.staticCue,
      imageUrl: await assetToDataUrl(entry.asset, entry.mimeType),
    }))
  );

  return cachedGestureKnowledge;
}
