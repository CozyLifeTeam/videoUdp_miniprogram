import { LAN_Media, media, init } from "../../../../packages/Control";
import { ADDRESS_BELLRING, PATH_BELLRING } from "../../../../constants/config";
import { ADDRESS_NOWENV } from "../../../../constants/server"
import { ADDRESS_GET_LOGS, PAGE_COUNT } from "../../constants/config"
import { request } from "../../../../packages/Request"
import WebSocket from "../../../../packages/WebSocket";
import { decryptResponse } from "../../../../utils/decrypt";
import { LAN_UDP } from "../../../../packages/Udp"
import { TCPSocket } from "../../../../packages/Tcp";

const fs = wx.getFileSystemManager();
const app = getApp();
function getUnixTime(dateStr) {
    var newstr = dateStr.replace(/-/g, '/');
    var date = new Date(newstr);
    var time_str = date.getTime().toString();
    return time_str.substr(0, 10);
};

Page({
    data: {
        time: {
            year: new Date().getFullYear(),
            month: new Date().getMonth() + 1,
            date: new Date().getDate()
        },
        // 记录列表
        content: [],
        // 门铃状态
        isBellOn: true,
        // 列表是否加载完成
        loadAll: false,
        power: {
            width: (100 * 0.85) + '%',
            bgColor: '#40ce29'
        },
        CustomBar: app.globalData.CustomBar,
    },
    requestLogs(param: requestLogsOption) {

        const setLoadAll = total => {
            if (total == 0) {
                this.setData({
                    loadAll: true
                })
            }
        }
        const formatTimestamp = timestamp => {
            const year = new Date(timestamp * 1000).getFullYear();
            const month = new Date(timestamp * 1000).getMonth() + 1;
            const date = new Date(timestamp * 1000).getDate();
            const hour = new Date(timestamp * 1000).getHours();
            const minute = new Date(timestamp * 1000).getMinutes();
            const formatNumber = n => {
                const s = n.toString()
                return s[1] ? s : '0' + s
            }
            return [year, month, date].map(formatNumber).join('-') + " " + [hour, minute].map(formatNumber).join(':')
        }
        const decryptState = state => {
            state = JSON.parse(state);
            state = state.data[107];
            if (state == 1) return "按下按键"
            if (state == 2) return "有人移动经过"
        }
        wx.showLoading({
            title: "请稍等..."
        })
        request({
            method: 'GET',
            url: `${ADDRESS_NOWENV}${ADDRESS_GET_LOGS}`,
            data: {
                token: app.globalData.czUserInfo.token,
                device_id: app.globalData.openDeviceInfo.device_id,
                page_count: PAGE_COUNT,
                ...param,
            }
        }).then(res => {
            const { ret, desc, info, } = res as any;
            setLoadAll(info.total);
            info.list.forEach(item => {
                item.timestamp = formatTimestamp(item.timestamp);
                item.state = decryptState(item.state);
            });
            this.setData({
                content: info.list
            })
            wx.hideLoading();
        }).catch(err => {
            console.log(err);
        })
    },
    async onLoad() {
        const { device_id, device_key } = app.globalData.openDeviceInfo;
        WebSocket.subcribe(device_id, device_key);
        const demo = await init(device_id);
        console.log(demo);
        
        return;
        const UDPSearchInterval = setInterval(() => {
            LAN_UDP.searchDevice();
        }, 200);

        LAN_UDP.onMessage((res) => {
            const { msg: { did, ip } } = res;
            if (device_id == did) {
                console.log(did, ip, true);
                // 内网直连
                LAN_Media.init(ip);
                clearInterval(UDPSearchInterval);
                TCPSocket.connect(ip, 5555).then(res => {
                    const msg = {
                        "attr": [110, 111, 112, 117],        //最多支持同时设置10个属性;
                        "data": {
                            "110": "1111",
                            "111": 1,
                            "112": 3,
                            "117": 1,
                        }
                    }
                    TCPSocket.write(3, msg)
                });
            }
        })
        this.downloadBellRing();
    },
    onShow() {
        const { year, month, date } = this.data.time;
        this.requestLogs({
            start_timestamp: getUnixTime(`${year}-${month}-${date} 00:00:00`),
            end_timestamp: getUnixTime(`${year}-${month}-${date} 23:59:59`),
            page: 1,
            logsIndex: 0
        })
    },
    TCPcallback(res) {
        const dpid = res.msg.data;
        const {
            device_request_call,
            electricity,
            session_id,
            device_answer,
            push_type
        } = decryptResponse(dpid);


        // 设备呼叫
        if (device_request_call == 1) {
            wx.setStorageSync("session_id", session_id)
            wx.navigateTo({
                url: "../callByDevice/callByDevice",
            })
        }
        // 查询电量
        else if (electricity) {
            this.setData({
                [`power.width`]: electricity / 10 * 0.85 + "%",
                [`power.bgColor`]: electricity / 10 > 30 ? '#40ce29' : '#ff2929'
            })
        }
        // 设备应答呼叫
        else if (device_answer == 1) {
            wx.setStorageSync("session_id", session_id);
            wx.navigateTo({
                url: "../call/call?isVideo=true",
            })
            wx.hideLoading();
        }
        // 设备拒绝应答呼叫
        else if (device_answer == 1) {
            wx.showModal({
                title: '提示',
                content: '设备拒绝呼叫，请重试',
                showCancel: false
            })
            wx.hideLoading();
        }
    },
    WSocketCallback(data, cmd) {
        const {
            device_request_call,
            electricity,
            session_id,
            device_answer,
            push_type
        } = decryptResponse(data);
        // console.log("%c接收到消息，" + decryptResponse(data), "color:red");

        // 内网通信的情况
        if (push_type == 1) return;
        // 设备呼叫
        if (device_request_call == 1) {
            wx.setStorageSync("session_id", session_id)
            wx.navigateTo({
                url: "../callByDevice/callByDevice",
            })
        }
        // 查询电量
        else if (electricity) {
            this.setData({
                [`power.width`]: electricity / 10 * 0.85 + "%",
                [`power.bgColor`]: electricity / 10 > 30 ? '#40ce29' : '#ff2929'
            })
        }
        // 设备应答呼叫
        else if (device_answer == 1) {
            wx.setStorageSync("session_id", session_id);
            wx.navigateTo({
                url: "../call/call?isVideo=true",
            })
            wx.hideLoading();
        }
        // 设备拒绝应答呼叫
        else if (device_answer == 1) {
            wx.showModal({
                title: '提示',
                content: '设备拒绝呼叫，请重试',
                showCancel: false
            })
            wx.hideLoading();
        }
    },
    callToDevice() {
        wx.showLoading({
            title: "加载中",
        });
        // 随机生成session_id
        const session_id = parseInt((Math.random() * 9000 + 1000) as unknown as string).toString();
        wx.setStorageSync("session_id", session_id);
        const { device_id, device_key } = app.globalData.openDeviceInfo;
        media.callToDevice(session_id, device_id, device_key);
    },

    downloadBellRing() {
        wx.showLoading({
            title: "请稍等..."
        })
        fs.getFileInfo({
            filePath: PATH_BELLRING,
            success: () => {
                wx.hideLoading()
            },
            fail: () => {
                wx.downloadFile({
                    url: ADDRESS_BELLRING,
                    success: res => {
                        wx.hideLoading();
                        fs.saveFileSync(res.tempFilePath, PATH_BELLRING);
                    }
                })
            }
        })
    },
})

