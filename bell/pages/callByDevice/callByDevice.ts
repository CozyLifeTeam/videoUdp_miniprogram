import { PATH_BELLRING } from "../../../../constants/config";
import { media } from "../../../../packages/Control"
import { InnerAudioContext } from "../../../../packages/InnerAudioContext";
import { request } from "../../../../packages/Request"
import { ADDRESS_NOWENV } from "../../../../constants/server"
import { decryptResponse } from "../../../../utils/decrypt";


const app = getApp();
Page({
    data: {
        imageSrc: '../../assets/images/callByDevice/video.png',
        CustomBar: app.globalData.CustomBar,
    },
    onLoad() {
        this.getImage();
        InnerAudioContext.src = PATH_BELLRING;
        InnerAudioContext.play();
    },
    getImage() {
        const { device_id } = app.globalData.openDeviceInfo;
        const { token } = app.globalData.czUserInfo;
        request({
            method: 'GET',
            url: ADDRESS_NOWENV + '/api/app/device/video/image_info',
            data: {
                token,
                device_id,
                session_id: wx.getStorageSync('session_id')
            }
        }).then(res => {
            if (res.ret == 1) {
                this.setData({
                    imageSrc: (res as unknown as any).info.image_path
                });
            }
            // 获取不到时
            else {
                setTimeout(() => {
                    this.getImage();
                }, 1000);
            }
        })
    },
    WSocketCallback(data, cmd) {
        const {
            device_request_call,
            electricity,
            device_request_call_reason,
            session_id,
            user_call,
            user_answer,
            call_type,
            user_close_reason,
            device_close_reason,
            video_resolution,
            video_fps,
            device_answer,
        } = decryptResponse(data);

        // 设备应答呼叫
        if (device_answer == 1) {
            wx.setStorageSync("session_id", session_id);
            wx.navigateTo({
                url: "../call/call?isVideo=true",
            })
            wx.hideLoading();
        }
        // 接听超时
        if (device_close_reason == 1) {
            wx.showModal({
                title: '提示',
                content: '接听超时，请重试',
                showCancel: false
            }).then(() => {
                const stackPages = getCurrentPages();
                if (stackPages[stackPages.length - 1].route == "subPac/bell/pages/callByDevice/callByDevice") {
                    wx.navigateBack();
                }
            })
        }
    },
    videoAnswer() {
        const session_id = wx.getStorageSync("session_id");
        const { device_id, device_key } = app.globalData.openDeviceInfo;
        InnerAudioContext.stop();

        media.videoAnswer(session_id, device_id, device_key);
        wx.navigateTo({
            url: "../call/call?isVideo=true"
        })
    },
    audioAnswer() {
        const session_id = wx.getStorageSync("session_id");
        const { device_id, device_key } = app.globalData.openDeviceInfo;
        InnerAudioContext.stop();

        media.audioAnswer(session_id, device_id, device_key);
        wx.navigateTo({
            url: `../call/call?isVideo=${false}`
        })
    },
    noAnswer() {
        const session_id = wx.getStorageSync("session_id");
        const { device_id, device_key } = app.globalData.openDeviceInfo;
        InnerAudioContext.stop();
        media.noAnswer(session_id, device_id, device_key);
        wx.showLoading({
            title: "请稍等..."
        })
        setTimeout(() => {
            wx.hideLoading()
            wx.navigateBack();
        }, 300)
    },
})