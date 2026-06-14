<script type="application/json" def>
{
  "navigationBarTitleText": "手势识别"
}
</script>

<script setup>
import wx from 'wx';
import { recognizeStaticGesture } from '../../lib/vlm-recognizer.js';

const CAPTURE_FRAME_COUNT = 4;
const CAPTURE_INTERVAL_MS = 700;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toPercent(value) {
  return `${Math.round(Number(value || 0) * 100)}%`;
}

function getResultTone(result) {
  if (!result || result.gestureId === 'UNKNOWN' || result.confidence < 0.5) {
    return 'retry';
  }

  if (result.gestureId === 'NEED_HELP') {
    return 'warning';
  }

  if (result.confidence < 0.75) {
    return 'maybe';
  }

  return 'success';
}

function getResultTitle(result) {
  const tone = getResultTone(result);

  if (tone === 'retry') {
    return '无法确定';
  }

  if (tone === 'warning') {
    return `可能在表达：${result.label}`;
  }

  if (tone === 'maybe') {
    return `可能是：${result.label}`;
  }

  return `识别到：${result.label}`;
}

export default {
  data: {
    status: 'READY',
    statusText: '保持手势稳定后按键识别',
    resultTitle: '',
    resultReason: '',
    confidenceText: '',
    resultTone: 'idle',
    errorMessage: '',
    isRecognizing: false,
    modeLabel: '短时多帧',
  },

  onShow() {
    this.cameraCtx = wx.media.createCameraContext();
  },

  onHide() {
    this.cameraCtx = null;
  },

  onKeyDown(event) {
    if (event?.code === 'Enter' && !this.data.isRecognizing) {
      this.startRecognition();
    }
  },

  onKeyUp(event) {
    if (event?.code === 'Backspace') {
      event.preventDefault();
      wx.exitMiniProgram();
    }
  },

  async startRecognition() {
    if (this.data.isRecognizing) {
      return;
    }

    this.setData({
      status: 'CAPTURING',
      statusText: '请在 3 秒内完成一个手语表达',
      resultTitle: '',
      resultReason: '',
      confidenceText: '',
      resultTone: 'idle',
      errorMessage: '',
      isRecognizing: true,
    });

    try {
      if (!this.cameraCtx) {
        this.cameraCtx = wx.media.createCameraContext();
      }

      if (!this.cameraCtx) {
        throw new Error('相机不可用，请检查权限或运行环境');
      }

      const photos = await this.captureGestureFrames();

      this.setData({
        status: 'RECOGNIZING',
        statusText: '正在分析动作',
      });

      const result = await recognizeStaticGesture(photos);
      const resultTone = getResultTone(result);

      this.setData({
        status: 'DONE',
        statusText: resultTone === 'retry' ? '请重新保持手势后再试' : '识别完成',
        resultTitle: getResultTitle(result),
        resultReason: result.reason || '',
        confidenceText: toPercent(result.confidence),
        resultTone,
      });
    } catch (error) {
      this.setData({
        status: 'ERROR',
        statusText: '识别失败',
        errorMessage: error?.message || '识别失败，请重试',
        resultTone: 'retry',
      });
    } finally {
      this.setData({
        isRecognizing: false,
      });
    }
  },

  async captureGestureFrames() {
    const photos = [];

    for (let index = 0; index < CAPTURE_FRAME_COUNT; index += 1) {
      this.setData({
        statusText: `采集中 ${index + 1}/${CAPTURE_FRAME_COUNT}`,
      });

      const photo = await this.cameraCtx.takePhoto({ quality: 'high' });
      photos.push(photo);

      if (index < CAPTURE_FRAME_COUNT - 1) {
        await delay(CAPTURE_INTERVAL_MS);
      }
    }

    return photos;
  },
};
</script>

<page>
  <view class="page">
    <view class="header">
      <view class="title-row">
        <text class="title">手语辅助识别</text>
        <text class="mode">{{ modeLabel }}</text>
      </view>
      <text class="subtitle">点击后，在 3 秒内完成一个手语表达</text>
    </view>

    <view class="camera-card">
      <camera class="camera-preview"></camera>
      <view class="camera-overlay">
        <text class="overlay-text">保持手部完整入镜，动作尽量清楚</text>
      </view>
    </view>

    <view class="status-row">
      <text class="status-pill">{{ status }}</text>
      <text class="status-text">{{ statusText }}</text>
    </view>

    <view class="result-card {{ resultTone }}" ink:if="{{status === 'DONE'}}">
      <text class="result-title">{{ resultTitle }}</text>
      <text class="confidence">置信度 {{ confidenceText }}</text>
      <text class="reason">{{ resultReason }}</text>
    </view>

    <view class="result-card retry" ink:if="{{status === 'ERROR'}}">
      <text class="result-title">识别失败</text>
      <text class="reason">{{ errorMessage }}</text>
    </view>

    <button class="action-button" bindtap="startRecognition">
      {{ isRecognizing ? '识别中' : '开始识别' }}
    </button>
  </view>
</page>

<style>
.page {
  width: 480px;
  min-height: 100%;
  box-sizing: border-box;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: #050505;
  color: #f5f7fa;
}

.header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.title {
  font-size: 22px;
  line-height: 28px;
  font-weight: 700;
  color: #f5f7fa;
}

.mode {
  padding: 3px 8px;
  border: 1px solid #2f6f3f;
  border-radius: 8px;
  color: #40ff5e;
  font-size: 12px;
  line-height: 16px;
}

.subtitle {
  color: #aeb6c2;
  font-size: 14px;
  line-height: 20px;
}

.camera-card {
  position: relative;
  width: 100%;
  height: 190px;
  border: 2px solid #2b2f36;
  border-radius: 12px;
  overflow: hidden;
  background: #000000;
  box-sizing: border-box;
}

.camera-preview {
  width: 100%;
  height: 100%;
}

.camera-overlay {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 10px;
  display: flex;
  justify-content: center;
}

.overlay-text {
  padding: 3px 8px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: #d7dde7;
  font-size: 12px;
  line-height: 16px;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-pill {
  min-width: 96px;
  padding: 4px 8px;
  box-sizing: border-box;
  border-radius: 8px;
  border: 1px solid #36404d;
  color: #40ff5e;
  font-size: 12px;
  line-height: 16px;
  text-align: center;
}

.status-text {
  flex: 1;
  color: #d7dde7;
  font-size: 14px;
  line-height: 20px;
}

.result-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 2px solid #2b2f36;
  background: #111418;
}

.result-card.success {
  border-color: #40ff5e;
}

.result-card.maybe {
  border-color: #d8b64c;
}

.result-card.warning {
  border-color: #ff9b50;
}

.result-card.retry {
  border-color: #d95d5d;
}

.result-title {
  color: #f5f7fa;
  font-size: 20px;
  line-height: 26px;
  font-weight: 700;
}

.confidence {
  color: #40ff5e;
  font-size: 14px;
  line-height: 20px;
}

.reason {
  color: #aeb6c2;
  font-size: 14px;
  line-height: 20px;
}

.action-button {
  width: 100%;
  height: 42px;
  box-sizing: border-box;
  border: 2px solid #40ff5e;
  border-radius: 12px;
  color: #40ff5e;
  background: transparent;
  font-size: 16px;
  line-height: 38px;
  text-align: center;
}
</style>
