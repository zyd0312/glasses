<script type="application/json" def>
{
  "navigationBarTitleText": "手势识别"
}
</script>

<script setup>
import wx from 'wx';
import { recognizeStaticGesture } from '../../lib/vlm-recognizer.js';

function toPercent(value) {
  return `${Math.round(Number(value || 0) * 100)}%`;
}

function getResultTone(result) {
  if (!result || result.gestureId === 'UNKNOWN' || result.confidence < 0.5) {
    return 'retry';
  }

  if (result.confidence < 0.78) {
    return 'maybe';
  }

  return 'success';
}

function getResultTitle(result) {
  const tone = getResultTone(result);

  if (tone === 'retry') {
    return '无法确定';
  }

  if (tone === 'maybe') {
    return `可能是：${result.label}`;
  }

  return `最可能：${result.label}`;
}

export default {
  data: {
    status: 'READY',
    statusText: '将手势放入取景框，保持 1 秒后识别',
    resultTitle: '',
    resultReason: '',
    resultCandidates: [],
    confidenceText: '',
    resultTone: 'idle',
    errorMessage: '',
    isRecognizing: false,
    modeLabel: '参考库匹配',
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
      statusText: '正在采集当前手势',
      resultTitle: '',
      resultReason: '',
      resultCandidates: [],
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

      const photo = await this.cameraCtx.takePhoto({ quality: 'high' });

      this.setData({
        status: 'RECOGNIZING',
        statusText: '正在比对参考库手形',
      });

      const result = await recognizeStaticGesture(photo);
      const resultTone = getResultTone(result);

      this.setData({
        status: 'DONE',
        statusText: resultTone === 'retry' ? '未找到可靠匹配，请调整手势后重试' : '已完成手势匹配',
        resultTitle: getResultTitle(result),
        resultReason: result.reason || '',
        resultCandidates: result.candidateTexts || [],
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
};
</script>

<page>
  <view class="page">
    <view class="header">
      <view class="title-row">
        <text class="title">静态手势识别</text>
        <text class="mode">{{ modeLabel }}</text>
      </view>
      <text class="subtitle">对准手部，避免遮挡和强背光；当前支持参考库内的常用手势</text>
      <text class="support-text">支持：站、坐、和、内、椅子、床、元旦、紧张、家、人、数字、敬礼、爱、好</text>
    </view>

    <view class="camera-card">
      <camera class="camera-preview"></camera>
      <view class="camera-overlay">
        <text class="overlay-text">手部完整入镜，静止后按 Enter</text>
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
      <view class="candidate-list" ink:if="{{resultCandidates.length > 1}}">
        <text class="candidate" ink:for="{{resultCandidates}}">{{ item }}</text>
      </view>
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

.support-text {
  color: #7f8998;
  font-size: 12px;
  line-height: 18px;
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

.candidate-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
}

.candidate {
  color: #d7dde7;
  font-size: 13px;
  line-height: 18px;
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
