import { request } from "../../../../packages/Request"
import { ADDRESS_GET_LOGS, PAGE_COUNT } from "../../constants/config"
import { ADDRESS_NOWENV } from "../../../../constants/server"

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
        logs: {},
        logsIndex: undefined,
        loadAll: false,
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad() {
        this.setLogsIndex();
        this.judgeRequestMethod()
    },
    onMessageTap({ detail: { start_timestamp, end_timestamp } }) {
        this.setLogsIndex(start_timestamp)
        this.judgeRequestMethod();
    },
    setLogsIndex(timestamp?) {
        const { time: { year, month, date } } = this.data;
        const start_timestamp = timestamp || getUnixTime(`${year}-${month}-${date} 00:00:00`)
        const logsIndex = new Date(start_timestamp * 1000).getDate();
        this.setData({
            logsIndex
        })
    },
    judgeRequestMethod() {
        let { logsIndex, logs, time: { year, month, date } } = this.data;
        let start_timestamp;
        let end_timestamp;

        if (logsIndex > date) {
            month -= 1;
        }

        start_timestamp = getUnixTime(`${year}-${month}-${logsIndex} 00:00:00`);
        end_timestamp = getUnixTime(`${year}-${month}-${logsIndex} 23:59:59`);

        if (
            logs[logsIndex] == undefined ||
            logs[logsIndex]?.length == 0
        ) {
            this.requestLogs({
                start_timestamp, end_timestamp, page: 1, logsIndex
            })
        }
        else {
            const page = (logs[logsIndex].length / 10) + 1;

            if(page % 1 != 0) return;

            this.requestLogs({
                start_timestamp, end_timestamp, page, logsIndex
            })
        }
    },
    requestLogs(param: requestLogsOption) {
        const { logs } = this.data;
        const setLoadAll = total => {
            if (total == 0 || total % 10 != 0) {
                this.setData({
                    loadAll: true
                })
            }
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
            console.log(res);
            
            setLoadAll(info.total);
            info.list.forEach(item => {
                item.timestamp = `${new Date(item.timestamp * 1000).getHours()}: ${new Date(item.timestamp * 1000).getMinutes()}`;
                item.state = decryptState(item.state);
            });
            if (logs[`${param.logsIndex}`] != undefined) {
                console.log("此时页面有数据");
                this.setData({
                    [`logs.${param.logsIndex}`]: logs[`${param.logsIndex}`].concat(info.list)
                })
            } else {
                console.log("此时页面无数据");
                this.setData({
                    [`logs.${param.logsIndex}`]: info.list
                })
            }
            wx.hideLoading();
        }).catch(err => {
            console.log(err);
        })
    },

    /**
     * 生命周期函数--监听页面显示
     */
    onShow() {

    },

    /**
     * 页面相关事件处理函数--监听用户下拉动作
     */
    onPullDownRefresh() {
        console.log("下拉刷新");
    },

    /**
     * 页面上拉触底事件的处理函数
     */
    onReachBottom() {
        this.judgeRequestMethod();
    },
})