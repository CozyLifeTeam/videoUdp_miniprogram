
import { formatTime } from "../../../../utils/util";
import { media } from "../../../../packages/Control"
import { TOAST_NETWORKBAD } from "../../../../constants/config";
import { decryptResponse } from "../../../../utils/decrypt";

const app = getApp();
Page({
    data: {
        // 是否是视频通话
        isVideo: true,
        // 通话持续时间
        callDuration: "00 : 00 : 00",
        // 是否开启麦克风
        isOpenMicro: true,
        // 是否开启扬声器
        isOpenLoudSpeaker: true,
        // 视频流图片
        imageSrc: '',
        // 协议请求头
        HEADER_SENDMESSAGE: {},
        // 当前网络是否差
        isNetworkBad: false,
    },
    // 控制通话持续时间的定时器
    durationTimer: 0,

    onLoad(options) {
        const { isVideo } = options;
        const HEADER_SENDMESSAGE = {
            version: 1,
            token: app.globalData.czUserInfo.token,
            session_id: wx.getStorageSync("session_id"),
            session_status: 1,
        }
        this.setData({
            isVideo: isVideo == 'true' ? true : false,
            HEADER_SENDMESSAGE
        })
        this.startVideoCall();
        this.startTiming();
        wx.showLoading({
            title: '加载中...'
        })
    },
    // 开始倒计时
    startTiming() {
        const startTime = Date.now();
        this.durationTimer = setInterval(() => {
            this.setData({
                callDuration: formatTime(startTime)
            })
        }, 1000)
    },

    // 开始视频通话
    startVideoCall() {
        this.startVideoChannel();
        this.startAudioChannel();
    },

    // 开启视频流通道
    startVideoChannel() {
        const { HEADER_SENDMESSAGE } = this.data
        media.subscribeVideo(HEADER_SENDMESSAGE);

        let pre = Date.now();
        media.onMessageUDPVideo(res => {
            let now = Date.now();
            if (now - pre >= TOAST_NETWORKBAD) {
                this.networkBad();
            }
            pre = now;
            this.setData({
                imageSrc: `data:image/png;base64,${res}`
            })
            wx.hideLoading();
        })
    },

    // 开启音频流通道
    startAudioChannel() {
        const { HEADER_SENDMESSAGE } = this.data;
        media.subscribeAudio(HEADER_SENDMESSAGE);
    },

    // 断开连接
    closeCall() {
        wx.showLoading({
            title: "正在关闭..."
        })
        setTimeout(() => {
            const { HEADER_SENDMESSAGE } = this.data;
            const { device_id, device_key } = app.globalData.openDeviceInfo;
            media.closeMediaConnection(HEADER_SENDMESSAGE, device_id, device_key);
            wx.hideLoading();
            const stackPages = getCurrentPages();
            const lastPage = stackPages[stackPages.length - 2]
            if (lastPage.route == "subPac/bell/pages/index/index") {
                wx.navigateBack({
                    delta: 1
                })
                return
            }
            wx.navigateBack({
                delta: 2
            })
        }, 200);
    },

    // 监听语音/视频切换事件
    onChangeSwitch() {
        const { isVideo } = this.data;
        this.setData({ isVideo: !isVideo })
    },

    // 监听麦克风开启/关闭事件
    onChangeMicro() {
        const { isOpenMicro, HEADER_SENDMESSAGE } = this.data;
        if (!isOpenMicro == true) {
            media.microState(true, HEADER_SENDMESSAGE);
        }
        if (!isOpenMicro == false) {
            media.microState(false, HEADER_SENDMESSAGE);
        }
        this.setData({ isOpenMicro: !isOpenMicro })
    },

    // 监听扬声器开启/关闭事件
    onChangeLoudSpeaker() {
        const { isOpenLoudSpeaker } = this.data;
        if (!isOpenLoudSpeaker == true) {
            media.speakerState(true)
        }
        if (!isOpenLoudSpeaker == false) {
            media.speakerState(false)
        }
        this.setData({ isOpenLoudSpeaker: !isOpenLoudSpeaker })
    },

    /**
     * 网络差的情况
     */
    networkBad() {
        this.setData({
            isNetworkBad: true
        })
        setTimeout(() => {
            this.setData({
                isNetworkBad: false
            })
        }, 1500);
        wx.showToast({
            title: "网络不佳",
            icon: "none",
            duration: 1500
        })
    },
    TCPcallback(data, cmd) {
        const {
            device_close_reason,
        } = decryptResponse(data);

        // 超时关闭
        if (device_close_reason == 2) {
            wx.showModal({
                title: '提示',
                content: '连接超时，请重试',
                showCancel: false
            }).then(() => {
                wx.reLaunch({
                    url: "subPac/bell/pages/index/index"
                })
            })
        }
    },
    onUnload() {
        const { HEADER_SENDMESSAGE } = this.data;
        const { device_id, device_key } = app.globalData.openDeviceInfo;

        media.closeMediaConnection(HEADER_SENDMESSAGE, device_id, device_key)
    }
})
